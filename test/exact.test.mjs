import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Journal} from '../src/journal.mjs';
import {buildAuthorization,exactHeader,decodePaymentReceipt,receiptHash,buyExact,receiptContainsUsdGTransfer} from '../src/payment.mjs';
import {USDG} from '../src/core.mjs';
const from='0x'+'a'.repeat(40),to='0x'+'b'.repeat(40),tx='0x'+'c'.repeat(64),sig='0x'+'d'.repeat(130);
const prepared={offer:{slug:'scout'},payment:{scheme:'exact',amount:10000n,payTo:to},url:'https://api.a2a.family/a/scout/v1/grade_launches?n=1'};
test('EIP3009 auth uses strict nonce amount and time window',()=>{
 const a=buildAuthorization(from,to,10000n,{now:1790000000,nonce:'0x'+'f'.repeat(64)});
 assert.deepEqual([a.validAfter,a.validBefore,a.value],['1789999995','1790000180','10000']);
 assert.throws(()=>buildAuthorization(from,to,0n),/positive/);
 assert.throws(()=>buildAuthorization(from,to,1n,{nonce:'bad'}),/nonce/);
});
test('exact header is signed authorization, not transaction hash',()=>{
 const a=buildAuthorization(from,to,10000n,{now:1790000000,nonce:'0x'+'e'.repeat(64)});
 const payload=JSON.parse(Buffer.from(exactHeader(sig,a),'base64').toString('utf8'));
 assert.equal(payload.scheme,'exact');assert.equal(payload.payload.authorization.value,'10000');
 assert.equal(payload.payload.signature,sig);assert.equal(payload.payload.txHash,undefined);
});
test('decoded settlement receipt requires genuine hash',()=>{
 const head=Buffer.from(JSON.stringify({tx})).toString('base64');
 assert.equal(receiptHash(decodePaymentReceipt(head)),tx);
 assert.equal(receiptHash({tx:'0x001'}),null);
});
test('receipt verifier requires matching USDG token, payer, payee and amount',async()=>{
 const {encodeEventTopics,encodeAbiParameters,parseAbi}=await import('viem');
 const abi=parseAbi(['event Transfer(address indexed from,address indexed to,uint256 value)']);
 const logs=[{address:USDG,topics:encodeEventTopics({abi,eventName:'Transfer',args:{from,to}}),data:encodeAbiParameters([{type:'uint256'}],[10000n])}];
 assert.equal(await receiptContainsUsdGTransfer(logs,{from,to,amount:10000n}),true);
 assert.equal(await receiptContainsUsdGTransfer([{...logs[0],address:'0x'+'1'.repeat(40)}],{from,to,amount:10000n}),false);
 assert.equal(await receiptContainsUsdGTransfer(logs,{from,to:'0x'+'c'.repeat(40),amount:10000n}),false);
 assert.equal(await receiptContainsUsdGTransfer(logs,{from,to,amount:20000n}),false);
});
test('gasless exact buyer signs once, checks chain, and records proof',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cw-exact-'));
 try{
  const journal=new Journal(join(dir,'j.json'));await journal.open();
  let signs=0,checks=0;
  const signer={address:from,balance:async()=>20000n,signPayment:async()=>{signs++;return sig},validateTx:async()=>{checks++;return{hash:tx,block:'42',explorer:'https://robinhoodchain.blockscout.com/tx/'+tx}}};
  const requester=async(url,{headers})=>{
   const x=JSON.parse(Buffer.from(headers['X-PAYMENT'],'base64'));
   assert.equal(x.scheme,'exact');
   return {status:200,headers:{get:()=>Buffer.from(JSON.stringify({tx})).toString('base64')},data:{top:'0x'+'1'.repeat(40)}};
  };
  const r=await buyExact(prepared,signer,journal,'real-simulated-id',{requester});
  assert.equal(signs,1);assert.equal(checks,1);assert.equal(r.transaction.hash,tx);
  assert.equal(journal.records[0].state,'complete');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('server failure after signature is fail-closed and cannot repeat',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cw-fail-'));
 try{
  const journal=new Journal(join(dir,'j.json'));await journal.open();let signs=0;
  const signer={address:from,balance:async()=>20000n,signPayment:async()=>{signs++;return sig}};
  await assert.rejects(buyExact(prepared,signer,journal,'some-id',{requester:async()=>{throw Error('timeout')}}),/DO NOT retry/);
  assert.equal(signs,1);assert.equal(journal.records[0].state,'UNKNOWN_SERVER_SETTLEMENT');
  await assert.rejects(buyExact(prepared,signer,journal,'some-id',{requester:async()=>{throw Error('should not reach')}}),/Duplicate attempt/);
  assert.equal(signs,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});

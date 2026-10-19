#!/usr/bin/env node
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {mkdir} from 'node:fs/promises';
import {preflight,requireEvm,candidateFrom,assess,atomicUsd,usdAtomic} from './core.mjs';
import {Journal} from './journal.mjs';
import {createExactSigner,buyExact,writeReport,checkPublicBalances,verifyExactCapability,verifyUsdGTransferReceipt} from './payment.mjs';
const args=process.argv.slice(2);
const command=args[0]||'help';
const arg=(key,def)=>{const i=args.indexOf(key);return i>=0?args[i+1]:def};
const target=arg('--token',null);
const cap=process.env.MAX_PER_CALL_USDG||'0.03';
const daily=process.env.MAX_PER_DAY_USDG||'0.10';
const scout={slug:'scout',skill:'grade_launches',params:{n:5}};
const sentinel={slug:'sentinel',skill:'scan_contract'};
async function inspect(){
 console.log('Inspecting Scout Agent Card and HTTP 402 quote. No wallet is used.');
 const s=await preflight(scout.slug,scout.skill,scout.params,{cap});
 console.log(JSON.stringify({agent:'Scout',advertisedUSD:atomicUsd(s.offer.price),quotedUSDG:atomicUsd(s.payment.amount),payTo:s.payment.payTo,resource:s.url,scheme:s.payment.scheme},null,2));
 if(target){requireEvm(target);const p=await preflight('sentinel','scan_contract',{token:target},{cap});console.log(JSON.stringify({agent:'Sentinel',advertisedUSD:atomicUsd(p.offer.price),quotedUSDG:atomicUsd(p.payment.amount),payTo:p.payment.payTo,resource:p.url,scheme:p.payment.scheme},null,2))}
 console.log('INSPECTION PASSED. NO PAYMENT SENT.');
}
async function inspectSentinel(){
 const token=requireEvm(arg('--token',null));
 console.log('Inspecting Sentinel Agent Card and HTTP 402 quote. No wallet is used.');
 const s=await preflight(sentinel.slug,sentinel.skill,{token},{cap:'0.02'});
 console.log(JSON.stringify({agent:'Sentinel',advertisedUSD:atomicUsd(s.offer.price),quotedUSDG:atomicUsd(s.payment.amount),payTo:s.payment.payTo,resource:s.url,scheme:s.payment.scheme},null,2));
 console.log('INSPECTION PASSED. NO PAYMENT SENT.');
}
async function demo(){
 const scoutPaid={agent:'Scout',response:{launches:[{token:'0x'+'1'.repeat(40),grade:'B'}]},transaction:null};
 const sentinelPaid={agent:'Sentinel',response:{warnings:['Owner privileges need review']},transaction:null};
 console.log('SIMULATION ONLY, no API calls and no paid transactions.');
 console.log('Illustrative report saved to',await writeReport({mode:'SIMULATED',token:'0x'+'1'.repeat(40),scout:scoutPaid,sentinel:sentinelPaid,assessment:assess(sentinelPaid.response,'0x6001')}));
}
async function walletCheck(){
 const address=requireEvm(arg('--address',null));
 const v=await checkPublicBalances(address);
 console.log('READ-ONLY WALLET CHECK (NO KEY USED, NO TRANSFER):');
 console.log(JSON.stringify(v,null,2));
 if(!v.gasAvailable)console.log('No ETH for gas yet. Do not send funds until the paid call is ready.');
}
async function verifyReceipt(){
 const hash=arg('--hash',null),from=requireEvm(arg('--from',null)),to=requireEvm(arg('--to',null));
 const amount=usdAtomic(arg('--amount-usdg',null));
 const proof=await verifyUsdGTransferReceipt(hash,{from,to,amount});
 console.log('READ-ONLY USDG RECEIPT VERIFIED:');
 console.log(JSON.stringify(proof,null,2));
}
async function oneScout(){
 if(!args.includes('--yes-pay-real-money'))throw Error('Specify --yes-pay-real-money to enable ONE exact/EIP-3009 authorization');
 const sp=await preflight('scout','grade_launches',{n:1},{cap:'0.011'});
 if(sp.payment.scheme!=='exact')throw Error('Live quote is not exact/EIP-3009. No authorization created.');
 if(sp.payment.amount>11000n)throw Error('Refuse amount above 0.011 USDG');
 console.log('ONE-CALL, EIP-3009 EXACT: Scout only, gas paid by server if compatible.');
 console.log(`Quote ${atomicUsd(sp.payment.amount)} USDG, recipient ${sp.payment.payTo}, chain 4663.`);
 console.log('NO ETH NEEDED from payer, but requires a funded separate USDG-only test wallet.');
 if(!process.stdin.isTTY)throw Error('Interactive terminal required');
 const input=createInterface({input:process.stdin,output:process.stdout});
 let answer;
 try{answer=await input.question(`To authorize exactly ONE USDG payment, type: PAY ${atomicUsd(sp.payment.amount)} USDG > `)}finally{input.close()}
 if(answer.trim()!==`PAY ${atomicUsd(sp.payment.amount)} USDG`)throw Error('Canceled before signing');
 const signer=await createExactSigner();
 const journal=new Journal('out/payment-journal.json');await journal.open();
 const id=randomUUID();
 console.log(`Signing wallet ${signer.address}. Your private key remains local.`);
 try{
  const paid=await buyExact(sp,signer,journal,id,{daily:'0.012'});
  console.log('REAL SETTLEMENT VERIFIED:',paid.transaction.explorer);
  console.log('Scout result:',JSON.stringify(paid.response,null,2));
  console.log('Saved:',await writeReport({mode:'LIVE',token:'DISCOVERY ONLY',scout:paid,assessment:{status:'REVIEW',reason:'One paid discovery call was verified. No independent token safety verdict.'}}));
 }catch(e){console.error('Payment proof or response failed. DO NOT repeat authorization; see out/payment-journal.json.');throw e}
}
async function oneSentinel(){
 if(!args.includes('--yes-pay-real-money'))throw Error('Specify --yes-pay-real-money to enable ONE exact/EIP-3009 Sentinel authorization');
 const token=requireEvm(arg('--token',null));
 const sp=await preflight(sentinel.slug,sentinel.skill,{token},{cap:'0.02'});
 if(sp.payment.scheme!=='exact')throw Error('Live Sentinel quote is not exact/EIP-3009. No authorization created.');
 if(sp.payment.amount!==sp.offer.price)throw Error('Sentinel quote differs from advertised price. No authorization created.');
 if(sp.payment.amount>20000n)throw Error('Refuse Sentinel amount above 0.020000 USDG');
 console.log('ONE-CALL, EIP-3009 EXACT: Sentinel scan_contract only.');
 console.log(`Token ${token}; quote ${atomicUsd(sp.payment.amount)} USDG, recipient ${sp.payment.payTo}, chain 4663.`);
 console.log('One exact approval is required. Sentinel settlement behavior is unverified until the chain receipt is confirmed.');
 if(!process.stdin.isTTY)throw Error('Interactive terminal required');
 const input=createInterface({input:process.stdin,output:process.stdout});
 let answer;
 try{answer=await input.question(`To authorize exactly ONE USDG payment, type: PAY ${atomicUsd(sp.payment.amount)} USDG > `)}finally{input.close()}
 if(answer.trim()!==`PAY ${atomicUsd(sp.payment.amount)} USDG`)throw Error('Canceled before signing');
 const signer=await createExactSigner();
 const journal=new Journal('out/payment-journal.json');await journal.open();
 const id=randomUUID();
 console.log(`Signing wallet ${signer.address}. Your private key remains local.`);
 try{
  const paid=await buyExact(sp,signer,journal,id,{daily:'0.02',maxAmount:20000n});
  console.log('REAL SETTLEMENT VERIFIED:',paid.transaction.explorer);
  console.log('Sentinel result:',JSON.stringify(paid.response,null,2));
  console.log('Saved:',await writeReport({mode:'LIVE_SENTINEL',token,sentinel:paid,assessment:{status:'UNASSESSED',reason:'Sentinel report is informational and is not an independent contract-safety verdict.'}}));
 }catch(e){console.error('Payment proof or response failed. DO NOT repeat authorization; see out/payment-journal.json.');throw e}
}
async function live(){throw Error('Two-payment mainnet command DISABLED until the one-call exact/EIP-3009 route is verified.');}
try{
 if(command==='inspect')await inspect();
 else if(command==='inspect-sentinel')await inspectSentinel();
 else if(command==='sentinel-once')await oneSentinel();
 else if(command==='demo')await demo();
 else if(command==='wallet')await walletCheck();
 else if(command==='exact-preflight'){console.log('VERIFYING EIP-3009 USDG SUPPORT, READ ONLY.');console.log(JSON.stringify(await verifyExactCapability(),null,2));}
 else if(command==='verify-receipt')await verifyReceipt();
 else if(command==='scout-once')await oneScout();
 else if(command==='live')await live();
 else console.log('ChainWitness\n npm run inspect -- --token 0x... (Scout, READ ONLY)\n npm run inspect-sentinel -- --token 0x... (Sentinel, READ ONLY)\n npm run wallet -- --address 0x... (READ ONLY)\n npm run exact-preflight (READ ONLY)\n npm run verify-receipt -- --hash 0x... --from 0x... --to 0x... --amount-usdg 0.01 (READ ONLY)\n npm run scout-once -- --yes-pay-real-money (ONE PAYMENT, capped at 0.011 USDG)\n npm run sentinel-once -- --token 0x... --yes-pay-real-money (ONE PAYMENT, capped at 0.020 USDG)\n npm run demo (SIMULATED)\n npm run live -- --token 0x... --yes-pay-real-money (DISABLED)\n npm test');
}catch(e){console.error('STOP:',e.message);process.exitCode=1}

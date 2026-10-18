import {randomBytes} from 'node:crypto';
import {CHAIN,USDG,RPC,EXPLORER,requireEvm,atomicUsd,requestJson} from './core.mjs';
import {Journal} from './journal.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const DOMAIN_NAME='Global Dollar', DOMAIN_VERSION='1';
const ERC20=[
  'function balanceOf(address account) view returns (uint256)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'event Transfer(address indexed from,address indexed to,uint256 value)'
];
const DOMAIN_FIELDS=[{type:'bytes32'},{type:'bytes32'},{type:'bytes32'},{type:'uint256'},{type:'address'}];
export const AUTH_TYPES={TransferWithAuthorization:[
  {name:'from',type:'address'}, {name:'to',type:'address'}, {name:'value',type:'uint256'},
  {name:'validAfter',type:'uint256'}, {name:'validBefore',type:'uint256'}, {name:'nonce',type:'bytes32'}
]};
const CHAIN_DEFINITION={id:CHAIN,name:'Robinhood Chain',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:{default:{http:[RPC]}}};
function rpcUrl(){return process.env.ROBINHOOD_RPC_URL||RPC;}
export function buildAuthorization(from,to,amount,{now=Math.floor(Date.now()/1000),nonce='0x'+randomBytes(32).toString('hex')}={}){
  requireEvm(from);requireEvm(to);
  if(typeof amount!=='bigint'||amount<=0n)throw Error('Authorization amount must be positive');
  if(!/^0x[0-9a-fA-F]{64}$/.test(nonce))throw Error('Invalid payment nonce');
  return {from,to,value:amount.toString(),validAfter:String(now-5),validBefore:String(now+180),nonce};
}
export function exactHeader(signature,auth){
 if(!/^0x[0-9a-fA-F]{130}$/.test(signature))throw Error('Invalid EIP-3009 signature');
 for(const x of ['from','to','nonce','value','validAfter','validBefore'])if(!auth?.[x])throw Error('Missing authorization field '+x);
 return Buffer.from(JSON.stringify({x402Version:1,scheme:'exact',network:'robinhood',payload:{signature,authorization:auth}})).toString('base64');
}
export function decodePaymentReceipt(header){
 if(!header)return null;
 try {return JSON.parse(Buffer.from(header,'base64').toString('utf8'));}catch{throw Error('Malformed X-PAYMENT-RESPONSE');}
}
export function receiptHash(receipt){
 const h=receipt?.tx||receipt?.transaction||receipt?.transactionHash||receipt?.txHash;
 return typeof h==='string'&&/^0x[0-9a-fA-F]{64}$/.test(h)?h:null;
}
export async function receiptContainsUsdGTransfer(logs,{from,to,amount}){
 requireEvm(from);requireEvm(to);
 const value=typeof amount==='bigint'?amount:BigInt(amount);
 if(value<=0n)throw Error('Expected USDG amount must be positive');
 const {parseAbi,parseEventLogs}=await import('viem');
 const parsed=parseEventLogs({abi:parseAbi(ERC20),logs,eventName:'Transfer',strict:false});
 return parsed.some(x=>x.address.toLowerCase()===USDG.toLowerCase() &&
   x.args.from?.toLowerCase()===from.toLowerCase() &&
   x.args.to?.toLowerCase()===to.toLowerCase() && x.args.value===value);
}
async function verifyUsdGTransferWithClient(publicClient,hash,{from,to,amount}){
 if(!/^0x[0-9a-fA-F]{64}$/.test(hash||''))throw Error('No valid transaction hash supplied');
 requireEvm(from);requireEvm(to);
 const value=typeof amount==='bigint'?amount:BigInt(amount);
 if(value<=0n)throw Error('Expected USDG amount must be positive');
 if(await publicClient.getChainId()!==CHAIN)throw Error('Expected Robinhood Chain 4663');
 const receipt=await publicClient.getTransactionReceipt({hash});
 if(receipt.status!=='success')throw Error('Payment settlement reverted on-chain');
 if(!await receiptContainsUsdGTransfer(receipt.logs,{from,to,amount:value}))
  throw Error('Transaction does not contain the expected USDG transfer');
 return {hash,block:String(receipt.blockNumber),explorer:EXPLORER+hash,network:CHAIN,transfer:{from,to,amountAtomic:String(value)}};
}
export async function verifyUsdGTransferReceipt(hash,{from,to,amount,rpc=rpcUrl()}={}){
 const {createPublicClient,http,defineChain}=await import('viem');
 const publicClient=createPublicClient({chain:defineChain({...CHAIN_DEFINITION,rpcUrls:{default:{http:[rpc]}}}),transport:http(rpc)});
 return verifyUsdGTransferWithClient(publicClient,hash,{from,to,amount});
}
export async function checkPublicBalances(address){
 requireEvm(address);
 const {createPublicClient,http,defineChain,parseAbi,formatEther}=await import('viem');
 const pub=createPublicClient({chain:defineChain({...CHAIN_DEFINITION,rpcUrls:{default:{http:[rpcUrl()]}}}),transport:http(rpcUrl())});
 if(await pub.getChainId()!==CHAIN)throw Error('Expected Robinhood Chain 4663 from RPC');
 const abi=parseAbi(ERC20);
 const [eth,usdg]=await Promise.all([pub.getBalance({address}),pub.readContract({address:USDG,abi,functionName:'balanceOf',args:[address]})]);
 return {address,network:CHAIN,eth:formatEther(eth),usdg:atomicUsd(usdg),gasAvailable:eth>0n,exactGaslessAvailable:'requires server settlement'};
}
export async function verifyExactCapability(){
 const {createPublicClient,http,defineChain,parseAbi,keccak256,toBytes,encodeAbiParameters}=await import('viem');
 const pub=createPublicClient({chain:defineChain({...CHAIN_DEFINITION,rpcUrls:{default:{http:[rpcUrl()]}}}),transport:http(rpcUrl())});
 if(await pub.getChainId()!==CHAIN)throw Error('Wrong network; expected Robinhood Chain 4663');
 const domainSeparator=await pub.readContract({address:USDG,abi:parseAbi(ERC20),functionName:'DOMAIN_SEPARATOR'});
 const typeHash=keccak256(toBytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'));
 const expectedDomain=keccak256(encodeAbiParameters(DOMAIN_FIELDS,[typeHash,keccak256(toBytes(DOMAIN_NAME)),keccak256(toBytes(DOMAIN_VERSION)),BigInt(CHAIN),USDG]));
 if(domainSeparator.toLowerCase()!==expectedDomain.toLowerCase())throw Error('USDG EIP712 domain mismatch, refuse to authorize');
 const signature='transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)';
 const selector=keccak256(toBytes(signature)).slice(0,10);
 const facet=await pub.readContract({address:USDG,abi:parseAbi(['function getFacet(bytes4 selector) view returns (address)']),functionName:'getFacet',args:[selector]});
 if(facet==='0x0000000000000000000000000000000000000000')throw Error('USDG does not expose EIP-3009 transferWithAuthorization');
 return {chainId:CHAIN,USDG,domainSeparator,expectedDomain,eip3009Selector:selector,implementationFacet:facet,tokenSupportsEip3009:true,facilitatorBehaviorVerified:false,noMoneySpent:true};
}
export async function createExactSigner(){
 const {createPublicClient,http,defineChain,parseAbi,keccak256,toBytes,encodeAbiParameters}=await import('viem');
 const {privateKeyToAccount}=await import('viem/accounts');
 const pk=process.env.ROBINHOOD_PRIVATE_KEY;
 if(!/^0x[0-9a-fA-F]{64}$/.test(pk||''))throw Error('Set ROBINHOOD_PRIVATE_KEY locally; never paste it in chat');
 const account=privateKeyToAccount(pk);
 const publicClient=createPublicClient({chain:defineChain({...CHAIN_DEFINITION,rpcUrls:{default:{http:[rpcUrl()]}}}),transport:http(rpcUrl())});
 if(await publicClient.getChainId()!==CHAIN)throw Error('Wrong RPC network');
 const abi=parseAbi(ERC20);
 // Critical: verify the live token uses the domain we will actually sign.
 await verifyExactCapability();
 return {
  address:account.address,
  async balance(){return publicClient.readContract({address:USDG,abi,functionName:'balanceOf',args:[account.address]});},
  async signPayment(auth){
    if(auth.from.toLowerCase()!==account.address.toLowerCase())throw Error('Payer mismatch');
    return account.signTypedData({domain:{name:DOMAIN_NAME,version:DOMAIN_VERSION,chainId:CHAIN,verifyingContract:USDG},types:AUTH_TYPES,primaryType:'TransferWithAuthorization',message:{...auth,value:BigInt(auth.value),validAfter:BigInt(auth.validAfter),validBefore:BigInt(auth.validBefore)}});
  },
  async validateTx(hash,auth){
    return verifyUsdGTransferWithClient(publicClient,hash,{from:auth.from,to:auth.to,amount:BigInt(auth.value)});
  }
 };
}
export async function buyExact(preflight,signer,journal,id,{daily='0.012',requester=requestJson}={}){
 if(preflight.payment.scheme!=='exact')throw Error('Expected exact/EIP-3009 payment quote; no funds authorized');
 const amt=preflight.payment.amount;
 if(amt>11000n)throw Error('One-call price cap exceeded');
 const balance=await signer.balance();
 if(balance<amt)throw Error('Insufficient USDG to authorize payment');
 const auth=buildAuthorization(signer.address,preflight.payment.payTo,amt);
 await journal.reserve(id,amt,daily);
 const signature=await signer.signPayment(auth);
 // Reserve without storing reusable authorization signatures or keys.
 await journal.update(id,{state:'authorization_signed',nonce:auth.nonce,recipient:auth.to,amount:auth.value,expires:auth.validBefore});
 let response;
 try {
   await journal.update(id,{state:'authorization_submitted_unconfirmed'});
   response=await requester(preflight.url,{headers:{'X-PAYMENT':exactHeader(signature,auth)}});
 }catch(e){await journal.update(id,{state:'UNKNOWN_SERVER_SETTLEMENT',error:String(e.message)});throw Error('Server request failed after signed payment. DO NOT retry or sign again without checking chain and journal. '+e.message);}
 const receipt=decodePaymentReceipt(response.headers.get('X-PAYMENT-RESPONSE'));
 const hash=receiptHash(receipt);
 if(response.status!==200){await journal.update(id,{state:'HTTP_ERROR_AFTER_SIGNATURE',httpStatus:response.status,hash});throw Error('Paid service returned HTTP '+response.status+'. Do not sign another payment; inspect journal and seller receipt.');}
 if(!hash){await journal.update(id,{state:'HTTP_200_WITHOUT_SETTLEMENT_HASH'});throw Error('Server returned 200 but no verifiable transaction hash. No bounty-success claim.');}
 let chainProof;
 try {chainProof=await signer.validateTx(hash,auth);}catch(e){await journal.update(id,{state:'RECEIPT_NOT_VERIFIED',hash,reason:e.message});throw Error('Server replied 200 but the USDG settlement was not verified on-chain: '+e.message);}
 await journal.update(id,{state:'complete',hash,block:chainProof.block});
 return {agent:preflight.offer.slug,amountAtomic:String(amt),transaction:chainProof,confirmation:receipt,response:response.data};
}
export async function writeReport({mode,token,scout=null,sentinel=null,assessment=null}){
 await mkdir('out',{recursive:true});
 const data={mode,generated:new Date().toISOString(),token,scout,sentinel,assessment,disclaimer:'A verified payment proves a USDG transfer, not that an agent research answer is accurate. Never treat this as token safety approval.'};
 const json=JSON.stringify(data,null,2);await writeFile(join('out',`report-${mode.toLowerCase()}.json`),json);
 const escaped=json.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 await writeFile(join('out',`report-${mode.toLowerCase()}.html`),`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChainWitness ${mode}</title><style>body{background:#f4f3e9;color:#182417;font:16px system-ui;margin:0}main{max-width:900px;margin:auto;padding:28px}h1{font-size:clamp(36px,6vw,72px);letter-spacing:-.05em}b{background:#b1ec80;padding:8px;border-radius:9px}pre{white-space:pre-wrap;word-break:break-word;border:1px solid #bbc7b4;background:white;padding:20px;border-radius:10px;font:13px ui-monospace,monospace}</style><main><p>CHAINWITNESS / ${mode}</p><h1>Paid agents. Checkable receipts.</h1><p><b>${mode==='SIMULATED'?'SIMULATED ONLY. NO REAL PAYMENTS.':'LIVE CALL. VERIFY HASHES.'}</b></p><pre>${escaped}</pre></main>`);
 return `out/report-${mode.toLowerCase()}.html`;
}

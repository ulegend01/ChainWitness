export const API='https://api.a2a.family';
export const CHAIN=4663;
export const USDG='0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
export const RPC='https://rpc.mainnet.chain.robinhood.com';
export const EXPLORER='https://robinhoodchain.blockscout.com/tx/';
const EVM=/^0x[a-fA-F0-9]{40}$/;
export function requireEvm(v){if(!EVM.test(v||''))throw Error('Expected a full 0x-prefixed 40-hex-character contract address');return v;}
export function usdAtomic(s){if(!/^(0|[1-9][0-9]*)(\.[0-9]{1,6})?$/.test(String(s)))throw Error('Invalid USDG decimal');const [a,b='']=String(s).split('.');return BigInt(a)*1000000n+BigInt((b+'000000').slice(0,6));}
export function atomicUsd(v){v=BigInt(v);return `${v/1000000n}.${String(v%1000000n).padStart(6,'0')}`;}
function eq(a,b){return typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();}
export async function requestJson(url,{headers={},fetcher=fetch}={}){
 const parsed=new URL(url);if(parsed.origin!==API||parsed.protocol!=='https:')throw Error('Untrusted resource URL');
 const r=await fetcher(url,{headers:{Accept:'application/json',...headers},redirect:'error',signal:AbortSignal.timeout(20000)});
 const body=await r.text();let data;try{data=JSON.parse(body)}catch{data={raw:body.slice(0,800)}}
 return {status:r.status,data,headers:r.headers};
}
export function parseOffer(card,slug,skill){
 if(card?.name?.toLowerCase()!==slug||card.url!==`${API}/a/${slug}/a2a`)throw Error('Unexpected or malicious agent card');
 if(!card.skills?.some(s=>s.id===skill))throw Error('Missing requested skill');
 const x=card.extensions?.find(e=>e.uri==='https://a2a.family/ext/x402')?.params;
 if(!x||!EVM.test(x.payTo)||!x.accepts?.includes('USDG'))throw Error('Agent Card missing USDG payment details');
 const d=x.skills?.[skill];if(!d||d.resource!==`${API}/a/${slug}/v1/${skill}`)throw Error('Unexpected skill resource');
 const price=usdAtomic(String(d.price));if(price<=0n)throw Error('Invalid advertised service price');
 return {slug,skill,url:d.resource,payTo:x.payTo,price};
}
export function validate402(response,offer,{cap='0.03',tolerance=200}={}){
 if(response.status!==402)throw Error(`Expected HTTP 402, got ${response.status}`);
 if(!Array.isArray(response.data?.accepts))throw Error('Malformed 402, no accepts array');
 const options=response.data.accepts.filter(o=>eq(o.asset,USDG)&&['robinhood','eip155:4663'].includes(o.network)&&['exact','a2a-tx'].includes(o.scheme));
 if(!options.length)throw Error('No Robinhood Chain USDG transfer payment offered');
 const opt=options.find(o=>eq(o.payTo,offer.payTo));if(!opt)throw Error('Pay-to address differs from Agent Card');
 if(opt.resource){const a=new URL(opt.resource),b=new URL(offer.url);if(a.origin!==b.origin||a.pathname!==b.pathname)throw Error('402 resource mismatch');}
 if(!/^[0-9]+$/.test(String(opt.maxAmountRequired)))throw Error('Malformed amount');
 const amount=BigInt(opt.maxAmountRequired);
 const ceiling=offer.price+(offer.price*BigInt(tolerance)+9999n)/10000n;
 if(amount<=0n||amount>ceiling)throw Error('Overpriced 402 quote');
 if(amount>usdAtomic(cap))throw Error('Per-call payment cap exceeded');
 return {amount,payTo:offer.payTo,asset:USDG,scheme:opt.scheme,quote:opt};
}
export async function preflight(slug,skill,params={},settings={}){
 const {fetcher=fetch,cap='0.03'}=settings;
 const cardResponse=await requestJson(`${API}/a/${slug}/.well-known/agent-card.json`,{fetcher});
 if(cardResponse.status!==200)throw Error('Agent Card unavailable');
 const offer=parseOffer(cardResponse.data,slug,skill);
 const url=new URL(offer.url);
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
 const response=await requestJson(url.toString(),{fetcher});
 const payment=validate402(response,offer,{cap});
 return {offer,url:url.toString(),payment,http402:response.data};
}
// Legacy tx-hash header intentionally not used for exact/EIP-3009 signing.
export function proofHeader(txHash,scheme='a2a-tx'){
 if(!/^0x[a-fA-F0-9]{64}$/.test(txHash))throw Error('Not a valid transaction hash');
 return Buffer.from(JSON.stringify({x402Version:1,scheme,network:'robinhood',payload:{txHash}})).toString('base64');
}
export function candidateFrom(payload){
 const arr=[];
 for(const field of ['launches','coins','tokens','results','items','data']){
  const list=payload?.[field];if(Array.isArray(list))for(const x of list)arr.push(x?.address,x?.token,x?.contract,x?.contractAddress,x?.ca);
 }
 arr.push(payload?.address,payload?.token);
 return arr.find(x=>EVM.test(x||''))??null;
}
export function assess(payload,code){
 if(!code||code==='0x')return{status:'BLOCK',reason:'Target contract has no deployed bytecode'};
 if(payload?.safe===false||payload?.honeypot===true)return{status:'BLOCK',reason:'Paid agent reported risks'};
 const flags=[payload?.risks,payload?.warnings,payload?.flags,payload?.findings].filter(Array.isArray).flat();
 if(flags.length)return{status:'REVIEW',reason:'Warnings reported, independent review required',flags};
 return{status:'REVIEW',reason:'Paid report and bytecode presence cannot prove contract safety'};
}

export type DailyCm={cents:number;period:string;generatedAt:number;resetsAt:number};
const DAY=86400000;
// Türkiye is UTC+3: the daily 01:00 boundary is 22:00 UTC the previous evening.
export function cmPeriod(time=Date.now()){
 const shifted=time+2*3600000;
 return {period:new Date(shifted).toISOString().slice(0,10),resetsAt:(Math.floor(shifted/DAY)+1)*DAY-2*3600000};
}
// Domain-separated keyed randomness keeps one member's roll stable across devices,
// page reloads and server restarts, without touching the financial database.
export async function dailyCm(memberId:string,secret:string,time=Date.now()):Promise<DailyCm>{
 if(!memberId||!secret)throw new Error('Daily CM requires a member and server secret.');
 const {period,resetsAt}=cmPeriod(time),encoder=new TextEncoder();
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const limit=Math.floor(2**32/10001)*10001;
 for(let counter=0;;counter++){
  const signature=await crypto.subtle.sign('HMAC',key,encoder.encode(JSON.stringify(['paragon-daily-cm-v1',memberId,period,counter])));
  const bytes=new DataView(signature);
  for(let offset=0;offset<bytes.byteLength;offset+=4){
   const value=bytes.getUint32(offset);
   if(value<limit)return {cents:value%10001,period,generatedAt:time,resetsAt};
  }
 }
}

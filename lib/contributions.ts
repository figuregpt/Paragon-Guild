import {env} from 'cloudflare:workers';
import {all,first,run,database} from './database';
import {hash,botMemberIdentity,upsertMember,HttpError} from './auth';
import {now,weekKey,type Member} from './domain';
import {parseContributionSheets,memberContributionKey} from './contribution-source.mjs';
import {claimHistoricalContribution} from './historical-contributions';
export const contributionsEnabled=()=>Boolean(env.GUILD_SHEET_ID||env.DEMO_SESSION);
const sourceKey='guild-contributions';
async function csv(sheet:string){
 if(!/^[A-Za-z0-9_-]{20,100}$/.test(env.GUILD_SHEET_ID||''))throw new Error('Invalid sheet configuration');
 const url=new URL('https://docs.google.com/spreadsheets/d/'+env.GUILD_SHEET_ID+'/export');url.searchParams.set('format','csv');url.searchParams.set('gid',sheet==='Deposit_Log'?'0':'690435313');
 const response=await fetch(url,{signal:AbortSignal.timeout(12000),cache:'no-store'});if(!response.ok||!response.headers.get('content-type')?.includes('text/csv'))throw new Error('Sheet could not be read');
 const reader=response.body?.getReader();if(!reader)throw new Error('Empty sheet response');let bytes=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1000000){await reader.cancel();throw new Error('Sheet response is too large');}chunks.push(value);}const result=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(result);
}
export async function syncContributions(){
 if(!env.GUILD_SHEET_ID||env.DEMO_SESSION)return;
 const time=now();await run('INSERT OR IGNORE INTO sheet_sync(key) VALUES(?)',sourceKey);
 const lease=await run('UPDATE sheet_sync SET attempted=?,lease=? WHERE key=? AND attempted<=? AND lease<?',time,time+60,sourceKey,time-300,time);if(!lease.meta.changes)return;
 try{
  const [deposits,totals]=await Promise.all([csv('Deposit_Log'),csv('Totals')]);const snapshot=parseContributionSheets(deposits,totals),batch=await hash(JSON.stringify(snapshot));const previous=await first<any>('SELECT batch FROM sheet_sync WHERE key=?',sourceKey);
  if(previous?.batch!==batch){const statements=[...snapshot.people.map(p=>database().prepare('INSERT OR IGNORE INTO sheet_people(batch,name_key,name,yang) VALUES(?,?,?,?)').bind(batch,p.name_key,p.name,p.yang)),...snapshot.deposits.map(d=>database().prepare('INSERT OR IGNORE INTO sheet_deposits(batch,row,name_key,name,date,yang,note) VALUES(?,?,?,?,?,?,?)').bind(batch,d.row,d.name_key,d.name,d.date,d.yang,d.note))];for(let i=0;i<statements.length;i+=40)await database().batch(statements.slice(i,i+40));}
  const activated=await run("UPDATE sheet_sync SET batch=?,checked=?,lease=0,error='' WHERE key=? AND lease=?",batch,now(),sourceKey,time+60);if(!activated.meta.changes)return;
  await rewardGuildContributions();
  // Old generations contain source data only; financial reward history is retained separately.
  await run('DELETE FROM sheet_people WHERE batch<>(SELECT batch FROM sheet_sync WHERE key=?)',sourceKey);await run('DELETE FROM sheet_deposits WHERE batch<>(SELECT batch FROM sheet_sync WHERE key=?)',sourceKey);
 }catch{await run("UPDATE sheet_sync SET lease=0,error='The guild spreadsheet could not be refreshed.' WHERE key=? AND lease=?",sourceKey,time+60);console.warn('Guild sheet refresh failed; retained the last valid snapshot.');}
}
async function rewardWeek(member:Member){
 await claimHistoricalContribution(member);
 const sync=await first<any>('SELECT batch,checked FROM sheet_sync WHERE key=?',sourceKey);if(!sync?.batch||sync.checked<now()-900)return;
 const key=await contributionKey(member,sync.batch);if(!key)return;
 const opening=await first<any>('SELECT b.name_key,c.member_id FROM contribution_baselines b LEFT JOIN contribution_baseline_claims c ON c.name_key=b.name_key WHERE b.name_key=?',key);
 if(opening&&opening.member_id!==member.id)return;
 const week=weekKey(),today=weekKeyDay();const paid=await first<any>('SELECT COALESCE(SUM(yang),0) total FROM sheet_deposits WHERE batch=? AND name_key=? AND date>=? AND date<=?',sync.batch,key,week,today);const settings=await all<any>("SELECT key,value FROM settings WHERE key IN ('weekly','rate')"),values=Object.fromEntries(settings.map(r=>[r.key,Number(r.value)])),required=values.weekly||500000,pp=values.rate??20;
 if(paid.total<required)return;
 if(env.DISCORD_BOT_TOKEN&&!env.DEMO_SESSION){try{await upsertMember(await botMemberIdentity(member.id,true));}catch(error){if(error instanceof HttpError&&error.status===403){await run('UPDATE members SET active=0 WHERE id=?',member.id);await run('DELETE FROM sessions WHERE member_id=?',member.id);}return;}}
 // The opening balance already includes this week's pre-reset payments. Credit only
 // the remaining quest PP if a partial contribution is completed after the reset.
 await run("INSERT OR IGNORE INTO weekly_rewards(member_id,week,pp,yang,batch,created) SELECT ?,?,CASE WHEN EXISTS(SELECT 1 FROM deposits WHERE member_id=? AND kind='weekly' AND week=? AND status='approved') THEN 0 ELSE MAX(0,?-COALESCE((SELECT b.weekly_pp FROM contribution_baseline_claims c JOIN contribution_baselines b ON b.name_key=c.name_key WHERE c.member_id=? AND b.week=?),0)) END,?,?,? WHERE EXISTS(SELECT 1 FROM members WHERE id=? AND active=1)",member.id,week,member.id,week,pp,member.id,week,paid.total,sync.batch,now(),member.id);
}
export async function rewardGuildContributions(){for(const member of await all<Member>('SELECT * FROM members WHERE active=1'))await rewardWeek(member);}
async function contributionKey(member:Member,batch:string){
 const claim=await first<{name_key:string}>('SELECT name_key FROM contribution_baseline_claims WHERE member_id=?',member.id);if(claim)return claim.name_key;
 const keys=(await all<{name_key:string}>('SELECT name_key FROM sheet_people WHERE batch=?',batch)).map(p=>p.name_key);return memberContributionKey(member,keys,env.DISCORD_CONTRIBUTION_NAMES);
}
export const weekKeyDay=(time=Date.now())=>new Date(time+3*3600000).toISOString().slice(0,10);
export async function readContribution(member:Member){
 if(!contributionsEnabled())return null;
 await rewardWeek(member);
 const sync=await first<any>('SELECT batch,checked,error FROM sheet_sync WHERE key=?',sourceKey),batch=sync?.batch||'',key=await contributionKey(member,batch)||'',today=weekKeyDay();
 const [total,weekly,entries]=await Promise.all([first<any>('SELECT COALESCE(SUM(yang),0) total FROM sheet_deposits WHERE batch=? AND name_key=? AND date<=?',batch,key,today),first<any>('SELECT COALESCE(SUM(yang),0) total FROM sheet_deposits WHERE batch=? AND name_key=? AND date>=? AND date<=?',batch,key,weekKey(),today),all('SELECT row,date,yang,note FROM sheet_deposits WHERE batch=? AND name_key=? AND date<=? ORDER BY yang DESC,date DESC,row DESC LIMIT 100',batch,key,today)]);
 return {total_yang:total.total,weekly_yang:weekly.total,checked:sync?.checked||0,stale:!sync?.checked||now()-sync.checked>900,error:Boolean(sync?.error),entries};
}

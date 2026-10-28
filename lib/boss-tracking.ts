import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {all,first,run} from './database';
import {HttpError} from './auth';
import {now,type Member} from './domain';
import {findGuideBoss} from './boss-guide';
import {BOSS_RESPAWN_SECONDS,BOSS_ADJUSTMENT_SECONDS,BOSS_MAX_DURATION_SECONDS,type BossTimer} from './boss-timers';
import {sendPush} from './web-push';

const json=(data:unknown)=>Response.json(data,{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const configured=()=>Boolean(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY&&env.VAPID_SUBJECT&&env.SCHEDULER_SECRET&&env.SCHEDULER_ENABLED==='true');
const columns='boss_id,game_channel,killed,respawns,revision';
export async function bossTrackingRoute(request:Request,path:string,member:Member):Promise<Response|null>{
 if(path!=='boss-timers')return null;
 if(request.method==='GET')return json({timers:await all<BossTimer>('SELECT '+columns+' FROM boss_timers WHERE member_id=?',member.id),serverTime:now(),pushReady:configured(),subscribed:Boolean(await first('SELECT 1 FROM subscriptions WHERE member_id=? LIMIT 1',member.id))});
 if(request.method!=='POST')return null;
 const text=await request.text();if(text.length>1500)throw new HttpError(413,'Request is too large.');
 let body:unknown;try{body=JSON.parse(text);}catch{throw new HttpError(400,'Check the form fields.');}
 const b=z.object({bossId:z.string().max(60),channel:z.number().int().min(1).max(6),action:z.enum(['kill','clear','subtract10','add10']),requestId:z.string().uuid(),expectedRevision:z.string().uuid().nullable()}).strict().parse(body);
 if(!findGuideBoss(b.bossId))throw new HttpError(400,'Choose a boss from the guide.');
 const current=await first<BossTimer>('SELECT '+columns+' FROM boss_timers WHERE member_id=? AND boss_id=? AND game_channel=?',member.id,b.bossId,b.channel);
 if(current?.revision===b.requestId)return json({timer:current,serverTime:now()});
 if((current?.revision??null)!==b.expectedRevision)throw new HttpError(409,'This timer changed on another device. Try again.');
 if(b.action==='clear'){
  if(current){const result=await run('DELETE FROM boss_timers WHERE member_id=? AND boss_id=? AND game_channel=? AND revision=?',member.id,b.bossId,b.channel,b.expectedRevision);if(!result.meta.changes)throw new HttpError(409,'This timer changed on another device. Try again.');}
  return json({timer:null,serverTime:now()});
 }
 const time=now();
 if(b.action==='subtract10'||b.action==='add10'){
  if(!current||current.respawns<=time)throw new HttpError(409,'This timer has ended. Mark a new kill to start again.');
  const respawns=b.action==='add10'?Math.min(current.respawns+BOSS_ADJUSTMENT_SECONDS,current.killed+BOSS_MAX_DURATION_SECONDS):Math.max(time,current.respawns-BOSS_ADJUSTMENT_SECONDS);
  if(respawns===current.respawns)throw new HttpError(400,'A boss timer cannot exceed 24 hours.');
  const changed=await run('UPDATE boss_timers SET respawns=?,revision=? WHERE member_id=? AND boss_id=? AND game_channel=? AND revision=?',respawns,b.requestId,member.id,b.bossId,b.channel,b.expectedRevision);
  if(!changed.meta.changes)throw new HttpError(409,'This timer changed on another device. Try again.');
  return json({timer:{...current,respawns,revision:b.requestId},serverTime:time});
 }
 const result=await run('INSERT INTO boss_timers(member_id,boss_id,game_channel,killed,respawns,revision) VALUES(?,?,?,?,?,?) ON CONFLICT(member_id,boss_id,game_channel) DO UPDATE SET killed=excluded.killed,respawns=excluded.respawns,revision=excluded.revision WHERE boss_timers.revision=?',member.id,b.bossId,b.channel,time,time+BOSS_RESPAWN_SECONDS,b.requestId,b.expectedRevision);
 if(!result.meta.changes)throw new HttpError(409,'This timer changed on another device. Try again.');
 return json({timer:{boss_id:b.bossId,game_channel:b.channel,killed:time,respawns:time+BOSS_RESPAWN_SECONDS,revision:b.requestId},serverTime:time});
}

/** Private, per-device delivery receipts prevent successful devices being retried with failed ones. */
export async function processBossTimers(time=now()){
 if(!configured())return;
 await run("UPDATE boss_timer_deliveries SET status=CASE WHEN attempts>=4 THEN 'failed' ELSE 'pending' END,lease_token=NULL WHERE status='sending' AND leased<?",time-300);
 await run('DELETE FROM boss_timer_deliveries WHERE created<?',time-2*86400);
 await run("INSERT OR IGNORE INTO boss_timer_deliveries(revision,endpoint,member_id,status,attempts,next_attempt,created) SELECT t.revision,s.endpoint,t.member_id,'pending',0,0,? FROM boss_timers t JOIN members m ON m.id=t.member_id AND m.active=1 JOIN subscriptions s ON s.member_id=t.member_id WHERE t.respawns<=? AND t.respawns>?",time,time,time-3600);
 const queue=await all<any>("SELECT d.* FROM boss_timer_deliveries d WHERE d.status='pending' AND d.attempts<4 AND d.next_attempt<=? ORDER BY d.created LIMIT 80",time);
 const deliver=async(delivery:any)=>{
  const token=crypto.randomUUID();
  const claimed=await run("UPDATE boss_timer_deliveries SET status='sending',attempts=attempts+1,leased=?,lease_token=? WHERE revision=? AND endpoint=? AND status='pending' AND next_attempt<=?",time,token,delivery.revision,delivery.endpoint,time);if(!claimed.meta.changes)return;
  const finish=(status:string)=>run('UPDATE boss_timer_deliveries SET status=?,lease_token=NULL,next_attempt=? WHERE revision=? AND endpoint=? AND lease_token=?',status,time+30*2**delivery.attempts,delivery.revision,delivery.endpoint,token);
  const timer=await first<any>('SELECT t.*,s.p256dh,s.auth FROM boss_timers t JOIN members m ON m.id=t.member_id AND m.active=1 JOIN subscriptions s ON s.member_id=t.member_id AND s.endpoint=? WHERE t.member_id=? AND t.revision=? AND t.respawns<=? AND t.respawns>?',delivery.endpoint,delivery.member_id,delivery.revision,time,time-3600);
  const boss=timer&&findGuideBoss(timer.boss_id);
  if(!timer||!boss){await finish('skipped');return;}
  try{
   const status=await sendPush({endpoint:delivery.endpoint,p256dh:timer.p256dh,auth:timer.auth},{title:'Paragon — Boss Respawn',body:boss.name+' is ready again.',bossName:boss.name,bossId:boss.id,bossRespawns:timer.respawns,gameChannel:timer.game_channel,url:'/?view=guide&boss='+boss.id,tag:'boss-respawn:'+timer.revision},{publicKey:env.VAPID_PUBLIC_KEY!,privateKey:env.VAPID_PRIVATE_KEY!,subject:env.VAPID_SUBJECT!});
   if(status===404||status===410){await run('DELETE FROM subscriptions WHERE endpoint=? AND member_id=?',delivery.endpoint,delivery.member_id);await finish('skipped');}
   else await finish(status>=200&&status<300?'sent':delivery.attempts+1>=4?'failed':'pending');
  }catch{await finish(delivery.attempts+1>=4?'failed':'pending');}
 };
 // Bound each scheduler request while allowing slow device providers to run independently.
 let cursor=0;const deadline=Date.now()+25000;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<queue.length&&Date.now()<deadline)await deliver(queue[cursor++]);}));
}

import {env} from 'cloudflare:workers';
import {all,run} from './database';
import {now} from './domain';
export async function announceEvents(){
 if(env.DEMO_SESSION||!env.DISCORD_EVENT_CHANNEL_ID||!env.DISCORD_BOT?.ready||!env.APP_ORIGIN?.startsWith('https://'))return;
 await run("UPDATE discord_announcements SET status=CASE WHEN attempts>=4 THEN 'failed' ELSE 'pending' END WHERE status='sending' AND leased<?",now()-90);
 const rows=await all<any>("SELECT d.*,e.title,e.kind,e.pp,e.starts,e.duration_minutes,e.location,e.game_channel,e.description,e.created_by,e.created event_created,e.phase,m.name creator_name FROM discord_announcements d JOIN events e ON e.id=d.event_id JOIN members m ON m.id=e.created_by WHERE d.status='pending' AND d.attempts<4 ORDER BY d.created LIMIT 20");
 for(const row of rows){
  if(row.channel_id!==env.DISCORD_EVENT_CHANNEL_ID||row.phase!=='open'){await run("UPDATE discord_announcements SET status='skipped' WHERE event_id=? AND status='pending'",row.event_id);continue;}
  const claimed=await run("UPDATE discord_announcements SET status='sending',attempts=attempts+1,leased=? WHERE event_id=? AND status='pending'",now(),row.event_id);if(!claimed.meta.changes)continue;
  try{const messageId=await env.DISCORD_BOT.sendEventCard({...row,id:row.event_id,created:row.event_created},row.channel_id,env.APP_ORIGIN);await run("UPDATE discord_announcements SET status='sent',message_id=? WHERE event_id=? AND status='sending'",messageId,row.event_id);}
  catch{await run("UPDATE discord_announcements SET status=? WHERE event_id=? AND status='sending'",row.attempts+1>=4?'failed':'pending',row.event_id);console.warn('Discord event card delivery failed. Check event channel permissions.');}
 }
}

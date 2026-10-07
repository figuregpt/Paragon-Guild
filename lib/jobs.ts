import {announceEvents} from './discord-announcements';
import {env} from 'cloudflare:workers';
import {all,run} from './database';
import {now} from './domain';
import {shouldDeliverNotification} from './notification-policy';
import {sendPush} from './web-push';
import {syncContributions} from './contributions';
export async function settleAuctions(){await run("UPDATE auctions SET status='closed' WHERE status='active' AND ends<=?",now());}
export async function processJobs(){
 await settleAuctions();await syncContributions();await announceEvents();
 await run("DELETE FROM sessions WHERE expires<?",now());await run('DELETE FROM oauth_states WHERE expires<?',now());
 await run("INSERT OR IGNORE INTO notifications(id,member_id,event_id,kind,created) SELECT 'reminder:'||e.id||':'||em.member_id,em.member_id,e.id,'reminder',? FROM event_members em JOIN events e ON e.id=em.event_id WHERE em.reminder IS NOT NULL AND e.status='upcoming' AND e.phase IN ('open','legacy') AND e.starts>? AND e.starts-em.reminder*60<=?",now(),now(),now());
 if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return;
 const queue=await all<any>("SELECT n.*,e.title,e.starts,e.status event_status,e.phase event_phase,e.kind event_kind,e.duration_minutes,e.game_channel,m.active,m.new_events FROM notifications n JOIN events e ON e.id=n.event_id JOIN members m ON m.id=n.member_id WHERE n.status='pending' AND n.attempts<4 ORDER BY n.created LIMIT 40");
 for(const n of queue){
  const claimed=await run("UPDATE notifications SET status='sending',attempts=attempts+1,leased=unixepoch() WHERE id=? AND status='pending'",n.id);if(!claimed.meta.changes)continue;
  if(!shouldDeliverNotification(n,now())){await run("UPDATE notifications SET status='skipped' WHERE id=?",n.id);continue;}
  const subs=await all<any>('SELECT endpoint,p256dh,auth FROM subscriptions WHERE member_id=?',n.member_id);let failed=false;
  for(const s of subs){try{const status=await sendPush(s,{title:n.kind==='reminder'?'Paragon — Event Reminder':'Paragon — New Event',body:n.title+' · '+new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(n.starts*1000))+' UTC',eventTitle:n.title,eventStarts:n.starts,gameChannel:n.game_channel,url:'/?view=events&event='+n.event_id,tag:n.id},{publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY,subject:env.VAPID_SUBJECT});if(status===410||status===404)await run('DELETE FROM subscriptions WHERE endpoint=?',s.endpoint);else if(status<200||status>=300)failed=true;}catch{failed=true;}}
  await run('UPDATE notifications SET status=? WHERE id=?',failed?(n.attempts+1>=4?'failed':'pending'):subs.length?'sent':'skipped',n.id);
 }
 await run("UPDATE notifications SET status='failed' WHERE status='sending' AND leased<? AND attempts>=4",now()-300);
 // Recover an interrupted worker after a five-minute lease.
 await run("UPDATE notifications SET status='pending' WHERE status='sending' AND leased<? AND attempts<4",now()-300);
}

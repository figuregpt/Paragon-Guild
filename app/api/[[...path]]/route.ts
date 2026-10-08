import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {HttpError,configReady,requireMember,sameOrigin,createSession,cookie,sessionCookieName,cookies,hash,localRequest} from '@/lib/auth';
import {all,first,run,database} from '@/lib/database';
import {id,now,weekKey,depositPoints} from '@/lib/domain';
import {processJobs,settleAuctions} from '@/lib/jobs';
import {adminPointsRoute} from '@/lib/admin-points';
import {memberEventRoute} from '@/lib/member-events';
import {createScreenshotAuction} from '@/lib/auction-create';
import {contributionsEnabled,readContribution} from '@/lib/contributions';
import {sendPush,validatePushSubscription} from '@/lib/web-push';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const pathOf=(r:Request)=>new URL(r.url).pathname.slice(5);
const num=(min=0,max=1000000)=>z.number().int().min(min).max(max);
const uuid=z.string().uuid();
async function body(r:Request){if(Number(r.headers.get('content-length')||0)>10000)throw new HttpError(413,'Request is too large.');return r.json();}
async function settings(){const rows=await all<any>('SELECT key,value FROM settings');const s=Object.fromEntries(rows.map(r=>[r.key,r.value]));return {weekly:Number(s.weekly||500000),rate:Number(s.rate||20),notice:s.notice||'Welcome to Paragon. Join guild events and earn Participation Points.'};}
async function audited(m:string,action:string,target:string){await run('INSERT INTO audit(id,member_id,action,target,created) VALUES(?,?,?,?,?)',id(),m,action,target,now());}
async function handle(request:Request){
 const path=pathOf(request),method=request.method;
 if(method==='GET'&&path==='health'){await first('SELECT 1');return json({ok:true,bot:env.DISCORD_BOT_TOKEN?(env.DISCORD_BOT?.ready?'connected':'connecting'):'not-configured'});}
 if(method==='GET'&&path==='status')return json({discordReady:configReady(),localPreview:localRequest(request),demoReady:Boolean(env.DEMO_RUNTIME?.enabled),pushReady:Boolean(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY&&env.VAPID_SUBJECT&&env.SCHEDULER_SECRET&&env.SCHEDULER_ENABLED==='true')});
 if(method==='POST'&&path!=='jobs/tick')sameOrigin(request);
 if(method==='POST'&&path==='demo-login'){
  const {role}=z.object({role:z.enum(['leader','member'])}).parse(await body(request));
  if(!env.DEMO_RUNTIME?.enabled)throw new HttpError(404,'Not found.');
  return env.DEMO_RUNTIME.login(request,role);
 }
 if(method==='POST'&&path==='preview-login'){
  if(!localRequest(request))throw new HttpError(404,'Not found.');
  const {role}=z.object({role:z.enum(['admin','member'])}).parse(await body(request));const m=await first<any>('SELECT id FROM members WHERE id=?',role==='admin'?'preview-admin':'preview-member');if(!m)throw new HttpError(503,'Local preview data is not installed.');
  return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':await createSession(m.id,request)}});
 }
 if(method==='POST'&&path==='jobs/tick'){
  const key=request.headers.get('authorization');if(!env.SCHEDULER_SECRET||key!==`Bearer ${env.SCHEDULER_SECRET}`)throw new HttpError(403,'Scheduler authorization is required.');await processJobs();return json({ok:true});
 }
 const admin=path.startsWith('admin/');const m=await requireMember(request,admin,method==='POST'||path.startsWith('event-evidence/'));
 const pointsResponse=await adminPointsRoute(request,path,m);if(pointsResponse)return pointsResponse;
 const eventResponse=await memberEventRoute(request,path,m);if(eventResponse)return eventResponse;
 if(method==='GET'&&path==='auction-bids'){const url=new URL(request.url);const auctionId=uuid.parse(url.searchParams.get('id'));const page=num(0,500).parse(Number(url.searchParams.get('page')||0));const auction=await first('SELECT id FROM auctions WHERE id=?',auctionId);if(!auction)throw new HttpError(404,'Auction was not found.');const [rows,total]=await Promise.all([all('SELECT b.id,b.amount,b.created,m.name FROM bids b JOIN members m ON m.id=b.member_id WHERE auction_id=? ORDER BY b.amount DESC,b.created DESC LIMIT 20 OFFSET ?',auctionId,page*20),first<any>('SELECT COUNT(*) total FROM bids WHERE auction_id=?',auctionId)]);return json({bids:rows,total:total?.total||0});}
 if(method==='GET'&&path==='state'){
  await settleAuctions();const contribution=await readContribution(m);const member=await first('SELECT id,name,class,avatar,admin,can_host,balance,reserved,new_events FROM members WHERE id=?',m.id);
  const [e,a,l,d,s,pending,participants]=await Promise.all([
   all("SELECT e.*,creator.name creator_name,CASE WHEN e.created_by=em.member_id THEN 0 ELSE COALESCE(em.joined,0) END joined,CASE WHEN e.created_by=em.member_id THEN 0 ELSE COALESCE(em.attended,0) END attended,em.reminder,(SELECT COUNT(*) FROM event_members WHERE event_id=e.id AND joined=1 AND member_id<>e.created_by) signups FROM events e JOIN members creator ON creator.id=e.created_by LEFT JOIN event_members em ON em.event_id=e.id AND em.member_id=? ORDER BY CASE WHEN e.status='upcoming' THEN 0 ELSE 1 END,e.starts LIMIT 300",m.id),
   all('SELECT a.*,i.name,i.icon,i.height,i.level,i.classes,w.name winner_name FROM auctions a JOIN items i ON i.id=a.item_id LEFT JOIN members w ON w.id=a.winner ORDER BY a.created DESC LIMIT 100'),
   all('SELECT * FROM ledger WHERE member_id=? ORDER BY created DESC,id DESC LIMIT 200',m.id),all('SELECT * FROM deposits WHERE member_id=? ORDER BY created DESC LIMIT 100',m.id),
   settings(),
   m.admin?all("SELECT d.*,m.name member_name FROM deposits d JOIN members m ON m.id=d.member_id WHERE d.status='pending' ORDER BY d.created"):[],
   m.admin?all("SELECT em.*,m.name FROM event_members em JOIN members m ON m.id=em.member_id JOIN events e ON e.id=em.event_id WHERE e.status='upcoming'"):[]
  ]);
  const myEvents=await all("SELECT e.*,creator.name creator_name,CASE WHEN e.created_by=em.member_id THEN 0 ELSE COALESCE(em.joined,0) END joined,CASE WHEN e.created_by=em.member_id THEN 0 ELSE COALESCE(em.attended,0) END attended,em.reminder,(SELECT COUNT(*) FROM event_members WHERE event_id=e.id AND joined=1 AND member_id<>e.created_by) signups FROM events e JOIN members creator ON creator.id=e.created_by LEFT JOIN event_members em ON em.event_id=e.id AND em.member_id=? WHERE e.created_by=? OR em.joined=1 OR em.attended=1 ORDER BY e.created DESC LIMIT 200",m.id,m.id);
  return json({member,contribution,events:e,my_events:myEvents,week:weekKey(),eventPolicy:{helpDailyLimit:2,dayZone:'Europe/Istanbul',organizerConfigured:Boolean(env.DISCORD_EVENT_CREATOR_ROLE_IDS)},auctions:a,ledger:l,deposits:d,settings:s,pending,participants,pushReady:Boolean(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY&&env.VAPID_SUBJECT&&env.SCHEDULER_SECRET&&env.SCHEDULER_ENABLED==='true'),vapidPublicKey:env.VAPID_PUBLIC_KEY||null,schedulerReady:env.SCHEDULER_ENABLED==='true',localPreview:localRequest(request),demo:Boolean(env.DEMO_SESSION)});
 }
 if(method==='POST'&&path==='logout'){await run('DELETE FROM sessions WHERE token=?',await hash(cookies(request)[sessionCookieName()]||''));const headers=new Headers({'Content-Type':'application/json','Cache-Control':'no-store'});headers.append('Set-Cookie',cookie(sessionCookieName(),'',0,request));if(env.DEMO_SESSION)headers.append('Set-Cookie',cookie('pg_demo','',0,request));return new Response(JSON.stringify({ok:true}),{headers});}
 if(method==='POST'&&path==='bid'){
  const b=z.object({id:uuid,auctionId:uuid,amount:num(1)}).parse(await body(request));
  const old=await first<any>('SELECT * FROM bids WHERE id=?',b.id);if(old){if(old.member_id!==m.id||old.auction_id!==b.auctionId||old.amount!==b.amount)throw new HttpError(409,'This request ID was already used.');return json({ok:true});}
  await run('INSERT INTO bids(id,auction_id,member_id,amount,created) VALUES(?,?,?,?,?)',b.id,b.auctionId,m.id,b.amount,now());return json({ok:true});
 }
 if(method==='POST'&&path==='event'){
  const b=z.object({eventId:uuid,joined:z.boolean().optional(),reminder:z.union([z.literal(15),z.literal(30),z.literal(60),z.null()]).optional()}).parse(await body(request));
  const e=await first<any>("SELECT starts,created_by,phase,kind FROM events WHERE id=? AND status='upcoming' AND (phase='open' OR (phase='legacy' AND starts>?))",b.eventId,now());if(!e)throw new HttpError(409,'This event is no longer open.');if(e.created_by===m.id&&b.joined!==undefined)throw new HttpError(400,'The event creator manages the event and cannot join as a participant.');
  await run('INSERT INTO event_members(event_id,member_id,joined,reminder,created) VALUES(?,?,?,?,?) ON CONFLICT(event_id,member_id) DO UPDATE SET joined=CASE WHEN ?=1 THEN excluded.joined ELSE event_members.joined END,reminder=CASE WHEN ?=1 THEN excluded.reminder ELSE event_members.reminder END',b.eventId,m.id,b.joined?1:0,b.reminder??null,now(),b.joined!==undefined?1:0,b.reminder!==undefined?1:0);
  if(b.joined!==undefined)await run('UPDATE event_members SET attended=0 WHERE event_id=? AND member_id=?',b.eventId,m.id);
  if(b.reminder!==undefined)await run("DELETE FROM notifications WHERE id=? AND status IN ('pending','skipped')",'reminder:'+b.eventId+':'+m.id);
  return json({ok:true});
 }
 if(method==='POST'&&path==='deposit'){
  const b=z.object({id:uuid,kind:z.enum(['weekly','donation']),yang:num(1,1000000000000),note:z.string().trim().max(100)}).parse(await body(request));const s=await settings();if(b.kind==='weekly'&&contributionsEnabled())throw new HttpError(409,'Weekly contributions are tracked automatically from the guild spreadsheet.');
  if(b.kind==='weekly'&&b.yang!==s.weekly)throw new HttpError(400,`The weekly deposit is ${s.weekly.toLocaleString('en-GB')} Yang.`);
  const old=await first<any>('SELECT * FROM deposits WHERE id=?',b.id);if(old){if(old.member_id!==m.id||old.yang!==b.yang||old.kind!==b.kind||old.note!==b.note)throw new HttpError(409,'This request ID was already used.');return json({ok:true});}
  const points=depositPoints(b.yang,s.weekly,s.rate);if(!Number.isSafeInteger(points)||points>1000000000)throw new HttpError(400,'This deposit exceeds the maximum PP reward. Contact an administrator.');
  await run('INSERT INTO deposits(id,member_id,yang,pp,kind,week,note,created) VALUES(?,?,?,?,?,?,?,?)',b.id,m.id,b.yang,points,b.kind,b.kind==='weekly'?weekKey():null,b.note,now());return json({ok:true});
 }
 if(method==='POST'&&path==='preferences'){const b=z.object({newEvents:z.boolean()}).parse(await body(request));await run('UPDATE members SET new_events=? WHERE id=?',b.newEvents?1:0,m.id);return json({ok:true});}
 if(method==='POST'&&path==='push/subscribe'){
  if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT||!env.SCHEDULER_SECRET||env.SCHEDULER_ENABLED!=='true')throw new HttpError(503,'Notifications are not configured yet.');
  const b=z.object({endpoint:z.string().max(2048),p256dh:z.string().max(100),auth:z.string().max(30)}).parse(await body(request));try{await validatePushSubscription(b);}catch{throw new HttpError(400,'This device subscription is invalid. Enable notifications again.');}
  await run('INSERT INTO subscriptions(endpoint,member_id,p256dh,auth,created) VALUES(?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET member_id=excluded.member_id,p256dh=excluded.p256dh,auth=excluded.auth',b.endpoint,m.id,b.p256dh,b.auth,now());return json({ok:true});
 }
 if(method==='POST'&&path==='push/test'){
  if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT||!env.SCHEDULER_SECRET||env.SCHEDULER_ENABLED!=='true')throw new HttpError(503,'Notifications are not configured yet.');
  const b=z.object({endpoint:z.string().max(2048)}).strict().parse(await body(request));const sub=await first<any>('SELECT endpoint,p256dh,auth FROM subscriptions WHERE endpoint=? AND member_id=?',b.endpoint,m.id);if(!sub)throw new HttpError(404,'Enable notifications on this device first.');
  const status=await sendPush(sub,{title:'Paragon — Test Notification',body:'Notifications are enabled on this device.',url:'/?view=profile',tag:'paragon-device-test'},{publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY,subject:env.VAPID_SUBJECT});
  if(status===404||status===410){await run('DELETE FROM subscriptions WHERE endpoint=? AND member_id=?',b.endpoint,m.id);throw new HttpError(409,'This device subscription expired. Disable and enable notifications again.');}
  if(status<200||status>=300)throw new HttpError(503,'The push service could not accept the test notification. Try again.');return json({ok:true});
 }
 if(method==='POST'&&path==='push/unsubscribe'){const b=z.object({endpoint:z.string().max(2048)}).parse(await body(request));await run('DELETE FROM subscriptions WHERE endpoint=? AND member_id=?',b.endpoint,m.id);return json({ok:true});}
 if(method==='GET'&&path.startsWith('images/')){const key=path.slice(7);if(!/^[a-zA-Z0-9-]+\.(png|jpg|webp|gif)$/.test(key))throw new HttpError(404,'Not found.');const o=await env.BUCKET?.get('icons/'+key);if(!o)throw new HttpError(404,'Image was not found.');return new Response(o.body,{headers:{'Content-Type':o.httpMetadata?.contentType||'image/png','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});}
 if(method==='POST'&&path==='admin/settings'){const b=z.object({weekly:num(1,1000000000000),rate:num(),notice:z.string().trim().max(500)}).parse(await body(request));await database().batch(Object.entries(b).map(([k,v])=>database().prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,String(v))));await audited(m.id,'settings','guild');return json({ok:true});}
 if(method==='POST'&&path==='admin/deposit'){
  const b=z.object({id:uuid,status:z.enum(['approved','rejected'])}).parse(await body(request));const deposit=await first<any>('SELECT kind FROM deposits WHERE id=?',b.id);if(deposit?.kind==='weekly'&&contributionsEnabled())throw new HttpError(409,'Weekly contributions are verified automatically from the guild spreadsheet.');const r=await run("UPDATE deposits SET status=?,reviewed_by=?,reviewed=? WHERE id=? AND status='pending'",b.status,m.id,now(),b.id);if(!r.meta.changes)throw new HttpError(409,'This deposit has already been reviewed.');await audited(m.id,'deposit-'+b.status,b.id);return json({ok:true});
 }
 if(method==='POST'&&path==='admin/event')throw new HttpError(410,'Create an event using its fixed reward type.');
 if(method==='POST'&&path==='admin/attendance'){
  const b=z.object({eventId:uuid,memberId:z.string().max(40),attended:z.boolean()}).parse(await body(request));const event=await first<any>('SELECT kind FROM events WHERE id=?',b.eventId);if(event?.kind!=='Legacy')throw new HttpError(409,'The creator must confirm attendance before review.');const r=await run('UPDATE event_members SET attended=? WHERE event_id=? AND member_id=?',b.attended?1:0,b.eventId,b.memberId);if(!r.meta.changes)throw new HttpError(404,'Participant was not found.');await audited(m.id,'attendance',b.eventId+':'+b.memberId);return json({ok:true});
 }
 if(method==='POST'&&path==='admin/finalize-event'){
  const b=z.object({id:uuid,status:z.enum(['completed','cancelled'])}).parse(await body(request));const event=await first<any>('SELECT kind FROM events WHERE id=?',b.id);if(event?.kind!=='Legacy')throw new HttpError(409,'Review the submitted evidence to finalize this event.');const r=await run("UPDATE events SET status=? WHERE id=? AND status='upcoming'",b.status,b.id);if(!r.meta.changes)throw new HttpError(409,'This event has already been finalized.');await audited(m.id,'event-'+b.status,b.id);return json({ok:true});
 }
 if(method==='POST'&&path==='admin/auction'){await createScreenshotAuction(request,m);return json({ok:true});}
 if(method==='POST'&&path==='admin/cancel-auction'){const b=z.object({id:uuid}).parse(await body(request));const r=await run("UPDATE auctions SET status='cancelled' WHERE id=? AND status='active'",b.id);if(!r.meta.changes)throw new HttpError(409,'This auction has already ended.');await audited(m.id,'auction-cancelled',b.id);return json({ok:true});}
 throw new HttpError(404,'Not found.');
}
async function respond(r:Request){try{return await (env.DEMO_RUNTIME?env.DEMO_RUNTIME.run(r,()=>handle(r)):handle(r));}catch(e){if(e instanceof HttpError)return json({error:e.message},e.status);if(e instanceof z.ZodError)return json({error:e.issues[0]?.message||'Check the form fields.'},400);const message=e instanceof Error?e.message:'';
 const known=['This auction has ended','Not enough available PP','Bid is below the minimum or uses an invalid increment','This event has not started','This event has already been finalized','Attendance for a finalized event cannot change','You can create 2 Help events per guild day','A screenshot is required before review','Upload a screenshot before ending this Help event','The creator is included automatically on approval','An event organizer Discord role is required','A guild administrator must review this event','Administrator approval is required before PP is awarded'];const match=known.find(v=>message.includes(v));if(match)return json({error:match},409);
 if(message.includes('one_weekly_deposit')||message.includes('deposits.member_id, deposits.week'))return json({error:'Your weekly deposit has already been submitted.'},409);
 console.error('Guild request failed',pathOf(r),message.replace(/token[^ ]*/gi,'[redacted]').slice(0,300));return json({error:'The request could not be completed. Please try again.'},500);
}}
export const GET=respond;export const POST=respond;

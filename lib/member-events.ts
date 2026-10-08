import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {HttpError} from './auth';
import {all,first,run,database} from './database';
import {id,now,type Member} from './domain';
import {EVENT_MAP_NAMES} from './event-locations';
import {EVENT_KINDS,EVENT_REWARDS,MAX_EVENT_PP} from './event-types';
export {EVENT_REWARDS} from './event-types';
export const guildDay=(seconds=now())=>new Date((seconds+3*3600)*1000).toISOString().slice(0,10);
const json=(value:unknown)=>Response.json(value,{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const uuid=z.string().uuid();
async function body(request:Request){if(Number(request.headers.get('content-length')||0)>10000)throw new HttpError(413,'Request is too large.');return request.json();}
async function evidenceForm(request:Request){
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Choose a screenshot.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8500000){await reader.cancel();throw new HttpError(413,'Choose a screenshot smaller than 8 MB.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();}catch{throw new HttpError(400,'Upload a screenshot using the file field.');}
}
async function eventFor(eventId:string){const e=await first<any>('SELECT * FROM events WHERE id=?',eventId);if(!e)throw new HttpError(404,'Event was not found.');return e;}
function owner(e:any,m:Member){if(e.created_by!==m.id)throw new HttpError(403,'Only the event creator can manage attendance and evidence.');}
async function audit(m:Member,action:string,eventId:string){await run('INSERT INTO audit(id,member_id,action,target,created) VALUES(?,?,?,?,?)',id(),m.id,action,eventId,now());}
export async function memberEventRoute(request:Request,path:string,m:Member):Promise<Response|null>{
 if(request.method==='POST'&&path==='events/create'){
  const b=z.object({id:uuid,title:z.string().trim().min(1).max(80),kind:z.enum(EVENT_KINDS),starts:z.number().int().min(1).max(4102444800).optional(),durationMinutes:z.number().int().min(1).max(1440).optional(),gameChannel:z.number().int().min(1).max(6).default(1),location:z.string().trim().min(1).max(80),pp:z.number().int().min(1).max(MAX_EVENT_PP).optional(),description:z.string().trim().max(500)}).strict().parse(await body(request));
  if(b.kind==='Custom'&&b.pp===undefined)throw new HttpError(400,'Choose the PP reward for this Custom event.');
  if(b.kind!=='Custom'&&b.pp!==undefined)throw new HttpError(400,'The reward for this event type is fixed.');
  if(b.kind!=='Custom'&&!EVENT_MAP_NAMES.includes(b.location))throw new HttpError(400,'Choose a map from the location list.');
  if(b.kind==='Demon Tower'&&b.location!=='Demon Tower')throw new HttpError(400,'Demon Tower events take place at Demon Tower.');
  if(b.kind==='Help'&&(!b.durationMinutes||b.starts!==undefined))throw new HttpError(400,'Help events start now. Choose a duration between 1 and 1,440 minutes.');
  if(b.kind!=='Help'&&(b.starts===undefined||b.durationMinutes!==undefined))throw new HttpError(400,'Choose a start time for this event.');
  if(b.kind!=='Help'&&!m.can_host)throw new HttpError(403,'The Experienced Discord role is required.');
  const old=await first<any>('SELECT * FROM events WHERE id=?',b.id);if(old){if(old.created_by!==m.id||old.title!==b.title||old.kind!==b.kind||old.location!==b.location||old.game_channel!==b.gameChannel||(b.kind==='Help'?old.duration_minutes!==b.durationMinutes:old.starts!==b.starts)||old.description!==b.description||(b.kind==='Custom'&&old.pp!==b.pp))throw new HttpError(409,'This request ID was already used.');return json({ok:true});}
  const starts=b.kind==='Help'?now():b.starts!;
  if(starts<now()-60)throw new HttpError(400,'Choose the current time or a future event time.');
  const type=b.kind==='PvP'||b.kind==='Guild War'?'PvP':'PvE';
  const pp=b.kind==='Custom'?b.pp!:EVENT_REWARDS[b.kind];
  await database().batch([
   database().prepare("INSERT INTO events(id,title,type,starts,pp,description,created_by,created,kind,phase,creation_day,duration_minutes,location,game_channel) VALUES(?,?,?,?,?,?,?,?,?,'open',?,?,?,?)").bind(b.id,b.title,type,starts,pp,b.description,m.id,now(),b.kind,guildDay(),b.durationMinutes??null,b.location,b.gameChannel),
   database().prepare("INSERT INTO notifications(id,member_id,event_id,kind,created) SELECT 'new:'||?||':'||id,id,?,'new',? FROM members WHERE active=1 AND new_events=1").bind(b.id,b.id,now()),
   ...(!env.DEMO_SESSION&&env.DISCORD_EVENT_CHANNEL_ID?[database().prepare("INSERT INTO discord_announcements(event_id,channel_id,created) VALUES(?,?,?)").bind(b.id,env.DISCORD_EVENT_CHANNEL_ID,now())]:[])
  ]);await audit(m,'event-created',b.id);return json({ok:true});
 }
 if(request.method==='GET'&&path==='events/detail'){
  const e=await eventFor(uuid.parse(new URL(request.url).searchParams.get('id')));
  const people=await all('SELECT em.member_id,m.name,m.class,em.joined,em.attended FROM event_members em JOIN members m ON m.id=em.member_id WHERE em.event_id=? AND em.joined=1 AND em.member_id<>? ORDER BY m.name',e.id,e.created_by);
  const evidence=e.created_by===m.id||m.admin?await all('SELECT id,created FROM event_evidence WHERE event_id=? ORDER BY created',e.id):[];
  const self=await first<any>('SELECT joined,attended,reminder FROM event_members WHERE event_id=? AND member_id=?',e.id,m.id);const creator=await first<any>('SELECT name FROM members WHERE id=?',e.created_by);return json({event:{...e,joined:e.created_by===m.id?0:self?.joined||0,attended:e.created_by===m.id?0:self?.attended||0,reminder:self?.reminder??null,creator_name:creator?.name||'Guild Member'},participants:people,reward_reviews:await all('SELECT member_id,decision FROM event_reward_reviews WHERE event_id=?',e.id),evidence});
 }
 if(request.method==='GET'&&path.startsWith('event-evidence/')){
  const key=uuid.parse(path.slice(15)),proof=await first<any>('SELECT p.*,e.created_by FROM event_evidence p JOIN events e ON e.id=p.event_id WHERE p.id=?',key);
  if(!proof)throw new HttpError(404,'Screenshot was not found.');if(!m.admin&&proof.created_by!==m.id)throw new HttpError(403,'Only the event creator and administrators can view evidence.');
  const file=await env.BUCKET?.get('evidence/'+proof.filename);if(!file)throw new HttpError(404,'Screenshot was not found.');
  return new Response(file.body,{headers:{'Content-Type':proof.content_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
 }
 if(request.method==='POST'&&['events/end','events/attendance','events/submit','events/cancel'].includes(path)){
  const b=z.object({eventId:uuid,memberId:z.string().max(40).optional(),attended:z.boolean().optional(),attendedMemberIds:z.array(z.string().min(1).max(40)).max(200).optional()}).strict().parse(await body(request));const e=await eventFor(b.eventId);owner(e,m);
  if(b.attendedMemberIds!==undefined&&path!=='events/submit')throw new HttpError(400,'Submit attendance with the event for approval.');
  if(e.kind==='Legacy')throw new HttpError(409,'Legacy events are managed by an administrator.');
  if(path==='events/end'){
   if(e.phase!=='open')throw new HttpError(409,'This event is no longer ongoing.');if(e.starts>now())throw new HttpError(409,'This event has not started');
   if(e.kind==='Help'&&!await first('SELECT id FROM event_evidence WHERE event_id=?',e.id))throw new HttpError(400,'Upload a screenshot before ending this Help event.');
   await run("UPDATE events SET phase='confirming',ended=? WHERE id=? AND phase='open'",now(),e.id);
  }else if(path==='events/attendance'){
   if(e.phase!=='confirming')throw new HttpError(409,'Attendance can only be confirmed after the event ends and before submission.');
   if(!b.memberId||b.attended===undefined)throw new HttpError(400,'Choose a participant to confirm.');if(b.memberId===m.id)throw new HttpError(400,'The creator is included automatically on approval.');
   const result=await run('UPDATE event_members SET attended=? WHERE event_id=? AND member_id=? AND joined=1',b.attended?1:0,e.id,b.memberId);if(!result.meta.changes)throw new HttpError(404,'Participant was not found.');
  }else if(path==='events/submit'){
   if(e.phase!=='confirming')throw new HttpError(409,'This event is not ready for submission.');
   const proof=await first('SELECT id FROM event_evidence WHERE event_id=?',e.id);if(!proof)throw new HttpError(400,'Upload a screenshot before submitting for administrator approval.');
   if(b.attendedMemberIds!==undefined){
    const ids=[...new Set(b.attendedMemberIds)];
    const participants=await all<{member_id:string}>('SELECT member_id FROM event_members WHERE event_id=? AND joined=1 AND member_id<>?',e.id,e.created_by);
    const allowed=new Set(participants.map(p=>p.member_id));if(ids.some(id=>!allowed.has(id)))throw new HttpError(400,'Choose only participants who joined this event.');
    await database().batch([
     database().prepare('UPDATE event_members SET attended=0 WHERE event_id=? AND joined=1 AND member_id<>?').bind(e.id,e.created_by),
     ...ids.map(id=>database().prepare('UPDATE event_members SET attended=1 WHERE event_id=? AND member_id=? AND joined=1').bind(e.id,id)),
     database().prepare("UPDATE events SET phase='pending',submitted=? WHERE id=? AND phase='confirming'").bind(now(),e.id)
    ]);
   }else await run("UPDATE events SET phase='pending',submitted=? WHERE id=? AND phase='confirming'",now(),e.id);
  }else{
   if(!['open','confirming'].includes(e.phase))throw new HttpError(409,'This event cannot be cancelled.');
   await run("UPDATE events SET phase='cancelled',status='cancelled' WHERE id=? AND phase IN ('open','confirming')",e.id);
  }
  await audit(m,path,e.id);return json({ok:true});
 }
 if(request.method==='POST'&&path==='events/evidence'){
  if(Number(request.headers.get('content-length')||0)>8500000)throw new HttpError(413,'Choose a screenshot smaller than 8 MB.');
  const form=await evidenceForm(request),eventId=uuid.parse(form.get('eventId')),e=await eventFor(eventId);owner(e,m);if(!['open','confirming'].includes(e.phase)||e.kind==='Legacy')throw new HttpError(409,'Upload evidence while the event is ongoing or confirming attendance.');if(e.starts>now())throw new HttpError(409,'This event has not started');
  const count=await first<any>('SELECT COUNT(*) total FROM event_evidence WHERE event_id=?',e.id);if(count.total>=3)throw new HttpError(400,'A maximum of 3 screenshots can be uploaded per event.');
  const file=form.get('screenshot');if(!(file instanceof File)||!file.size||file.size>8000000)throw new HttpError(400,'Choose a screenshot smaller than 8 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer());let type='',ext='';
  if(bytes.length>32&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)){type='image/png';ext='png';}
  else if(bytes.length>32&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255){type='image/jpeg';ext='jpg';}
  else if(bytes.length>32&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'){type='image/webp';ext='webp';}
  if(!type||file.type!==type)throw new HttpError(400,'Upload a PNG, JPEG or WebP screenshot.');if(!env.BUCKET)throw new HttpError(503,'Evidence storage is unavailable.');
  const key=id(),filename=key+'.'+ext;await env.BUCKET.put('evidence/'+filename,bytes,{httpMetadata:{contentType:type}});
  try{await run('INSERT INTO event_evidence(id,event_id,uploaded_by,filename,content_type,created) VALUES(?,?,?,?,?,?)',key,e.id,m.id,filename,type,now());}catch(error){await env.BUCKET.delete('evidence/'+filename);throw error;}
  await audit(m,'event-evidence',e.id);return json({ok:true});
 }
 if(request.method==='POST'&&path==='admin/event-review'){
  const b=z.object({eventId:uuid,decision:z.enum(['approved','rejected']),note:z.string().trim().max(500),approvedMemberIds:z.array(z.string().min(1).max(40)).max(201).optional()}).strict().parse(await body(request));const e=await eventFor(b.eventId);
  if(!m.admin)throw new HttpError(403,'Administrator access is required.');if(e.phase!=='pending')throw new HttpError(409,'This event has already been reviewed or has not been submitted.');if(b.decision==='rejected'&&!b.note)throw new HttpError(400,'Give a reason for rejecting this event.');
  const people=await all<{member_id:string}>('SELECT member_id FROM event_members WHERE event_id=? AND member_id<>? AND joined=1 AND attended=1',e.id,e.created_by);
  const eligible=[e.created_by,...people.map(p=>p.member_id)],allowed=new Set(eligible);
  const approved=new Set(b.decision==='approved'?(b.approvedMemberIds??eligible):[]);
  if(b.approvedMemberIds?.some(id=>!allowed.has(id)))throw new HttpError(400,'Choose only the creator and confirmed participants.');
  if(b.decision==='rejected'&&b.approvedMemberIds?.length)throw new HttpError(400,'Rejected events cannot award PP.');
  if(b.decision==='approved'&&!approved.size)throw new HttpError(400,'Select at least one member to award PP.');
  const reviewed=now();try{await database().batch([
   ...eligible.map(memberId=>database().prepare('INSERT INTO event_reward_reviews(event_id,member_id,decision,reviewed_by,reviewed) VALUES(?,?,?,?,?)').bind(e.id,memberId,approved.has(memberId)?'approved':'rejected',m.id,reviewed)),
   database().prepare("UPDATE events SET phase=?,status=?,reviewed_by=?,reviewed=?,review_note=? WHERE id=? AND phase='pending'").bind(b.decision,b.decision==='approved'?'completed':'cancelled',m.id,reviewed,b.note,e.id),
   database().prepare('INSERT INTO audit(id,member_id,action,target,created) VALUES(?,?,?,?,?)').bind(id(),m.id,'event-'+b.decision,e.id,reviewed)
  ]);}catch(error){if((await eventFor(e.id)).phase!=='pending')throw new HttpError(409,'This event has already been reviewed.');throw error;}return json({ok:true});
 }
 return null;
}

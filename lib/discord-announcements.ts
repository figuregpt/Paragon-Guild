import {env} from 'cloudflare:workers';
import {all,first,run} from './database';
import {now} from './domain';
import {notificationChannel,notificationChannels,notificationRole} from './railway/discord-routing.mjs';
import {RESULT_PAGE_SIZE} from './railway/event-card.mjs';
async function entityFor(row:any){
 if(row.entity_type==='auction'){
  const entity=await first<any>('SELECT a.*,i.name item_name,i.icon,m.name winner_name FROM auctions a JOIN items i ON i.id=a.item_id LEFT JOIN members m ON m.id=a.winner WHERE a.id=?',row.entity_id);
  return entity?{...entity,entity_type:'auction',people:entity.winner?[{member_id:entity.winner,name:entity.winner_name}]:[]}:null;
 }
 const entity=await first<any>('SELECT e.*,m.name creator_name FROM events e JOIN members m ON m.id=e.created_by WHERE e.id=?',row.entity_id);
 if(!entity)return null;
 const people=await all<any>(`SELECT m.id member_id,m.name,r.decision,COALESCE(l.amount,0) awarded FROM members m LEFT JOIN event_reward_reviews r ON r.member_id=m.id AND r.event_id=? LEFT JOIN ledger l ON l.id='event:'||?||':'||m.id WHERE m.id=? OR EXISTS(SELECT 1 FROM event_members em WHERE em.event_id=? AND em.member_id=m.id AND em.joined=1) ORDER BY CASE WHEN m.id=? THEN 0 ELSE 1 END,m.name`,entity.id,entity.id,entity.created_by,entity.id,entity.created_by);
 return {...entity,entity_type:'event',people,participant_count:people.length-1};
}
export async function announceEvents(){
 if(env.DEMO_SESSION||!env.DISCORD_BOT?.ready||!env.APP_ORIGIN?.startsWith('https://'))return;
 try{if(!Object.keys(notificationChannels(env)).length)return;notificationRole(env);}catch{console.warn('Discord notification routing is invalid.');return;}
 const time=now();
 // A new start/expected-end status needs a refresh even without a user write.
 await run("UPDATE discord_cards SET revision=revision+1,status='pending',attempts=0,next_attempt=0,next_refresh=NULL WHERE status='sent' AND next_refresh<=?",time);
 await run("UPDATE discord_cards SET status=CASE WHEN attempts>=4 THEN 'failed' ELSE 'pending' END,lease_token=NULL WHERE status='sending' AND leased<?",time-120);
 const rows=await all<any>("SELECT * FROM discord_cards WHERE status='pending' AND next_attempt<=? ORDER BY created,purpose,part LIMIT 16",time);
 for(const row of rows){
  const entity=await entityFor(row),channelId=row.channel_id||notificationChannel(env,entity||row);
  if(!entity||!channelId||entity.kind==='Legacy'){
   // An absent route is recoverable after configuration, without dropping the announcement.
   if(entity&&!channelId){await run('UPDATE discord_cards SET next_attempt=? WHERE id=? AND status=\'pending\'',time+300,row.id);continue;}
   await run("UPDATE discord_cards SET status='skipped' WHERE id=? AND status='pending'",row.id);continue;
  }
  if(row.purpose==='result'&&row.part===0){
   for(let part=1;part<Math.ceil(entity.people.length/RESULT_PAGE_SIZE);part++)await run("INSERT OR IGNORE INTO discord_cards(id,entity_type,entity_id,purpose,part,created) VALUES(?,?,?,'result',?,?)",row.id+':'+part,row.entity_type,row.entity_id,part,time);
  }
  const token=crypto.randomUUID();
  const claim=await run("UPDATE discord_cards SET status='sending',attempts=attempts+1,leased=?,lease_token=?,channel_id=? WHERE id=? AND status='pending' AND revision=?",now(),token,channelId,row.id,row.revision);
  if(!claim.meta.changes)continue;
  try{
   let image: {bytes:Uint8Array;extension:string}|undefined;
   const evidence: {name:string;bytes:Uint8Array}[]=[];
   if(entity.entity_type==='event'&&['approved','rejected'].includes(entity.phase)){
    const proofs=await all<{filename:string}>('SELECT filename FROM event_evidence WHERE event_id=? ORDER BY created,id LIMIT 3',entity.id);
    for(const proof of proofs){
     if(!/^[a-zA-Z0-9-]+\.(png|jpg|webp)$/.test(proof.filename))throw new Error('Invalid evidence filename.');
     const file=await env.BUCKET?.get('evidence/'+proof.filename);
     if(!file)throw new Error('Screenshot evidence is unavailable.');
     const bytes=new Uint8Array(await new Response(file.body).arrayBuffer());
     if(!bytes.length||bytes.length>8000000)throw new Error('Invalid evidence size.');
     evidence.push({name:'evidence-'+proof.filename,bytes});
    }
   }
   if(entity.entity_type==='auction'&&!row.message_id&&row.purpose==='card'&&/^\/api\/images\/[a-zA-Z0-9-]+\.(png|jpg|webp)$/.test(entity.icon)){
    const filename=entity.icon.slice('/api/images/'.length),file=await env.BUCKET?.get('icons/'+filename);
    if(file){const bytes=new Uint8Array(await new Response(file.body).arrayBuffer());if(bytes.length<=8000000)image={bytes,extension:filename.split('.').at(-1)!};}
   }
   const messageId=await env.DISCORD_BOT.deliverCard(entity,channelId,env.APP_ORIGIN,{messageId:row.message_id||undefined,purpose:row.purpose,part:row.part,image,evidence});
   let refresh:null|number=null;
   if(row.purpose==='card'&&entity.entity_type==='event'&&entity.phase==='open'){
    if(entity.starts>time)refresh=entity.starts;
    else if(entity.duration_minutes&&entity.starts+entity.duration_minutes*60>time)refresh=entity.starts+entity.duration_minutes*60;
   }
   await run("UPDATE discord_cards SET message_id=?,sent_revision=?,status=CASE WHEN revision=? THEN 'sent' ELSE 'pending' END,attempts=0,lease_token=NULL,next_attempt=0,next_refresh=? WHERE id=? AND lease_token=?",messageId,row.revision,row.revision,refresh,row.id,token);
  }catch(error:any){
   const terminal=[10008,10003,50001,50013].includes(Number(error?.code));
   await run("UPDATE discord_cards SET status=CASE WHEN revision<>? THEN 'pending' WHEN ?=1 OR attempts>=4 THEN 'failed' ELSE 'pending' END,attempts=CASE WHEN revision<>? THEN 0 ELSE attempts END,lease_token=NULL,next_attempt=? WHERE id=? AND lease_token=?",row.revision,terminal?1:0,row.revision,time+Math.min(300,30*2**row.attempts),row.id,token);
   console.warn('Discord card delivery delayed:',row.entity_type,row.purpose,Number(error?.code)||'connection');
  }
 }
}

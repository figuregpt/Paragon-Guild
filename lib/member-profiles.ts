import {z} from 'zod';
import {env} from 'cloudflare:workers';
import {syncGuildMembers} from './guild-roster';
import {all,first,database} from './database';
import {HttpError} from './auth';
import {id,now,type Member} from './domain';
import {BONUS_IDS,MEMBER_BONUSES,type BonusTotals,type PublicMember,type PvpGroup} from './member-bonuses';
const json=(data:unknown)=>Response.json(data,{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const memberId=z.string().min(1).max(40),uuid=z.string().uuid();
async function body(request:Request){
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Check the form fields.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000){await reader.cancel();throw new HttpError(413,'Request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'Check the form fields.');}
}
const publicSelect=`SELECT m.id,m.name,m.class,m.avatar,m.class_roles,gm.group_id,g.name group_name,p.updated FROM members m LEFT JOIN member_profiles p ON p.member_id=m.id LEFT JOIN pvp_group_members gm ON gm.member_id=m.id LEFT JOIN pvp_groups g ON g.id=gm.group_id`;
type ProfileRow=Omit<PublicMember,'class_roles'>&{class_roles:string};
const publicMember=(row:ProfileRow):PublicMember=>({...row,class_roles:JSON.parse(row.class_roles)});
async function groupList():Promise<PvpGroup[]>{
 const groups=await all<{id:string;name:string;description:string;revision:number}>('SELECT id,name,description,revision FROM pvp_groups ORDER BY name COLLATE NOCASE');
 const memberships=await all<{group_id:string;member_id:string}>('SELECT gm.group_id,gm.member_id FROM pvp_group_members gm JOIN members m ON m.id=gm.member_id WHERE m.active=1 ORDER BY m.name COLLATE NOCASE');
 return groups.map(g=>({...g,member_ids:memberships.filter(m=>m.group_id===g.id).map(m=>m.member_id)}));
}
export async function memberProfileRoute(request:Request,path:string,m:Member):Promise<Response|null>{
 if(request.method==='GET'&&['members','members/profile'].includes(path)&&env.DISCORD_BOT?.ready)await syncGuildMembers();
 if(request.method==='GET'&&path==='members')return json({members:(await all<ProfileRow>(publicSelect+' WHERE m.active=1 ORDER BY m.name COLLATE NOCASE')).map(publicMember),groups:await groupList()});
 if(request.method==='GET'&&path==='members/profile'){
  const requested=memberId.parse(new URL(request.url).searchParams.get('id')),member=await first<ProfileRow>(publicSelect+' WHERE m.id=? AND m.active=1',requested);
  if(!member)throw new HttpError(404,'Member was not found.');
  const profile=await first<{bonuses:string;revision:number;updated:number}>('SELECT bonuses,revision,updated FROM member_profiles WHERE member_id=?',requested);
  return json({member:publicMember(member),bonuses:profile?JSON.parse(profile.bonuses):{},revision:profile?.revision||0,updated:profile?.updated??null,editable:requested===m.id});
 }
 if(request.method==='POST'&&path==='members/bonuses'){
  const b=z.object({revision:z.number().int().min(0),bonuses:z.record(z.number().finite().min(0).max(1000000))}).strict().parse(await body(request));
  const totals:BonusTotals={};
  for(const [key,value]of Object.entries(b.bonuses)){
   if(!BONUS_IDS.has(key))throw new HttpError(400,'Choose bonuses from the bonus list.');
   const definition=MEMBER_BONUSES.find(d=>d.id===key)!;
   if(definition.unit==='boolean'&&value!==0&&value!==1)throw new HttpError(400,'Immunity must be yes or no.');
   if(Math.abs(value*100-Math.round(value*100))>0.0000001)throw new HttpError(400,'Use at most 2 decimal places for bonus totals.');
   if(value>0)totals[key]=value;
  }
  const db=database();try{
   await db.batch([
    db.prepare('INSERT INTO member_profiles(member_id,bonuses,revision,updated) VALUES(?,?,1,?) ON CONFLICT(member_id) DO UPDATE SET bonuses=excluded.bonuses,revision=member_profiles.revision+1,updated=excluded.updated WHERE member_profiles.revision=?').bind(m.id,JSON.stringify(totals),now(),b.revision),
    db.prepare('INSERT INTO profile_write_guards(expected,actual) VALUES(1,changes())'),
    db.prepare('DELETE FROM profile_write_guards'),
    db.prepare('INSERT INTO audit(id,member_id,action,target,created) VALUES(?,?,?,?,?)').bind(id(),m.id,'profile-bonuses-updated',m.id,now())
   ]);
  }catch(error){if(String(error).includes('profile_write_guards'))throw new HttpError(409,'Your bonuses changed in another tab. Reload before saving.');throw error;}
  return json({ok:true});
 }
 if(request.method==='POST'&&['admin/groups/save','admin/groups/delete'].includes(path)){
  if(!m.admin)throw new HttpError(403,'Administrator access is required.');
  const db=database();
  if(path==='admin/groups/delete'){
   const b=z.object({id:uuid,revision:z.number().int().min(1)}).strict().parse(await body(request));
   const group=await first<{revision:number}>('SELECT revision FROM pvp_groups WHERE id=?',b.id);if(!group)throw new HttpError(404,'Group was not found.');if(group.revision!==b.revision)throw new HttpError(409,'This group changed. Reload before saving.');
   try{await db.batch([
    db.prepare('INSERT INTO profile_write_guards(expected,actual) VALUES(1,CASE WHEN EXISTS(SELECT 1 FROM pvp_groups WHERE id=? AND revision=?) THEN 1 ELSE 0 END)').bind(b.id,b.revision),
    db.prepare('DELETE FROM profile_write_guards'),
    db.prepare('DELETE FROM pvp_groups WHERE id=?').bind(b.id),
    db.prepare('INSERT INTO audit(id,member_id,action,target,created) VALUES(?,?,?,?,?)').bind(id(),m.id,'pvp-group-deleted',b.id,now())
   ]);}catch(error){if(String(error).includes('profile_write_guards'))throw new HttpError(409,'This group changed. Reload before saving.');throw error;}
   return json({ok:true});
  }
  const b=z.object({id:uuid,revision:z.number().int().min(0),name:z.string().trim().min(1).max(60),description:z.string().trim().max(200),memberIds:z.array(memberId).max(200)}).strict().parse(await body(request));
  if(new Set(b.memberIds).size!==b.memberIds.length)throw new HttpError(400,'Choose each member once.');
  const existing=await first<{revision:number}>('SELECT revision FROM pvp_groups WHERE id=?',b.id);if((existing?.revision||0)!==b.revision)throw new HttpError(409,'This group changed. Reload before saving.');
  if(!existing&&(await first<{n:number}>('SELECT COUNT(*) n FROM pvp_groups'))!.n>=30)throw new HttpError(400,'A maximum of 30 groups can be created.');
  if(await first('SELECT id FROM pvp_groups WHERE name=? COLLATE NOCASE AND id<>?',b.name,b.id))throw new HttpError(409,'A group with this name already exists.');
  const active=new Set((await all<{id:string}>('SELECT id FROM members WHERE active=1')).map(p=>p.id));if(b.memberIds.some(id=>!active.has(id)))throw new HttpError(400,'Choose only active guild members.');
  try{await db.batch([
   db.prepare('INSERT INTO pvp_groups(id,name,description,revision,updated,updated_by) VALUES(?,?,?,1,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,revision=pvp_groups.revision+1,updated=excluded.updated,updated_by=excluded.updated_by WHERE pvp_groups.revision=?').bind(b.id,b.name,b.description,now(),m.id,b.revision),
   db.prepare('INSERT INTO profile_write_guards(expected,actual) VALUES(1,changes())'),
   db.prepare('DELETE FROM profile_write_guards'),
   ...(b.memberIds.length?[db.prepare('UPDATE pvp_groups SET revision=revision+1,updated=?,updated_by=? WHERE id IN (SELECT group_id FROM pvp_group_members WHERE member_id IN ('+b.memberIds.map(()=>'?').join(',')+') AND group_id<>?)').bind(now(),m.id,...b.memberIds,b.id)]:[]),
   db.prepare('DELETE FROM pvp_group_members WHERE group_id=?').bind(b.id),
   ...b.memberIds.map(member=>db.prepare('INSERT INTO pvp_group_members(member_id,group_id) VALUES(?,?) ON CONFLICT(member_id) DO UPDATE SET group_id=excluded.group_id').bind(member,b.id)),
   db.prepare('INSERT INTO audit(id,member_id,action,target,created) VALUES(?,?,?,?,?)').bind(id(),m.id,'pvp-group-saved',b.id,now())
  ]);}catch(error){if(String(error).includes('profile_write_guards'))throw new HttpError(409,'This group changed. Reload before saving.');if(String(error).includes('pvp_groups.name'))throw new HttpError(409,'A group with this name already exists.');throw error;}
  return json({ok:true});
 }
 return null;
}

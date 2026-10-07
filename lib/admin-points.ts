import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {HttpError,botMemberIdentity,upsertMember,localRequest} from './auth';
import {all,first,database} from './database';
import {now,type Member} from './domain';
const json=(value:unknown)=>Response.json(value,{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function adminPointsRoute(request:Request,path:string,m:Member):Promise<Response|null>{
 if(!['admin/players','admin/points'].includes(path))return null;
 if(!m.admin)throw new HttpError(403,'Administrator access is required.');
 if(request.method==='GET'&&path==='admin/players'){
  const [players,awards]=await Promise.all([
   all('SELECT id,name,class,balance,reserved FROM members WHERE active=1 ORDER BY name COLLATE NOCASE LIMIT 500'),
   all("SELECT l.id,l.member_id,l.amount,l.label,l.created,m.name,m.class,a.name awarded_by FROM ledger l JOIN members m ON m.id=l.member_id JOIN audit au ON au.target=l.id AND au.action='manual-pp' JOIN members a ON a.id=au.member_id WHERE l.category='Manual' ORDER BY l.created DESC,l.rowid DESC LIMIT 20")
  ]);return json({players,awards});
 }
 if(request.method==='POST'&&path==='admin/points'){
  if(Number(request.headers.get('content-length')||0)>10000)throw new HttpError(413,'Request is too large.');
  const b=z.object({id:z.string().uuid(),memberId:z.string().min(1).max(40),operation:z.enum(['add','remove']).default('add'),amount:z.number().int().min(1).max(1000000),note:z.string().trim().min(1).max(300)}).strict().parse(await request.json());
  const key='manual:'+b.id,amount=b.operation==='remove'?-b.amount:b.amount;
  async function existing(){const old=await first<any>("SELECT l.*,a.member_id awarded_by FROM ledger l JOIN audit a ON a.target=l.id AND a.action='manual-pp' WHERE l.id=?",key);if(!old)return false;if(old.member_id!==b.memberId||old.amount!==amount||old.label!==b.note||old.awarded_by!==m.id)throw new HttpError(409,'This request ID was already used.');return true;}
  if(await existing())return json({ok:true});
  const recipient=await first<any>('SELECT id,active FROM members WHERE id=?',b.memberId);if(!recipient||!recipient.active)throw new HttpError(400,'Choose an active guild player.');
  // Guild membership can change between sign-ins; verify it before adjusting PP.
  if(!env.DEMO_SESSION&&!localRequest(request))await upsertMember(await botMemberIdentity(b.memberId));
  try{await database().batch([
   // The condition and ledger balance trigger execute in the same transaction as
   // bidding, so a deduction cannot consume PP reserved by a concurrent bid.
   database().prepare("INSERT INTO ledger(id,member_id,amount,category,label,created) SELECT ?,id,?,'Manual',?,? FROM members WHERE id=? AND active=1 AND balance+?>=reserved").bind(key,amount,b.note,now(),b.memberId,amount),
   database().prepare("INSERT INTO audit(id,member_id,action,target,created) SELECT ?,?,'manual-pp',?,? WHERE EXISTS(SELECT 1 FROM ledger WHERE id=?)").bind(key,m.id,key,now(),key)
  ]);}catch(error){if(!await existing())throw error;}
  if(!await existing())throw new HttpError(409,'Not enough available PP. Points reserved for auctions cannot be removed.');
  return json({ok:true});
 }
 return null;
}

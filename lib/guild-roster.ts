import {env} from 'cloudflare:workers';
import {all,database} from './database';
import {HttpError,identityPermissions} from './auth';
import {parseRoleList} from './discord-roles';
import {now} from './domain';
let pending:Promise<void>|undefined,checked=0,version=-1;
export async function syncGuildMembers(){
 if(env.DEMO_SESSION||!env.DISCORD_BOT_TOKEN)return;
 const bot=env.DISCORD_BOT;if(!bot?.ready)throw new HttpError(503,'Discord is temporarily unavailable. Please try again shortly.');
 if(checked>now()-300&&version===bot.version)return;
 if(pending)return pending;
 const operation=(async()=>{
  const required=parseRoleList(env.DISCORD_MEMBER_ROLE_IDS);if(!required.length)throw new HttpError(503,'The guild member role must be configured.');
  const roster=await bot.getMembers();
  const identities=roster.members.filter(m=>!m.bot&&required.some(role=>m.roles.includes(role))).map(m=>identityPermissions(m,true));
  if(identities.some(m=>!/^\d{17,20}$/.test(m.id))||new Set(identities.map(m=>m.id)).size!==identities.length)throw new HttpError(503,'Discord member data could not be verified.');
  const ids=new Set(identities.map(m=>m.id)),old=await all<{id:string}>('SELECT id FROM members WHERE active=1'),db=database();
  const statements=identities.map(m=>db.prepare('INSERT INTO members(id,name,class,avatar,admin,can_host,created) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,class=excluded.class,avatar=excluded.avatar,admin=excluded.admin,can_host=excluded.can_host,active=1').bind(m.id,m.name,m.class,m.avatar,m.admin,m.can_host,now()));
  for(const m of old)if(/^\d{17,20}$/.test(m.id)&&!ids.has(m.id)){statements.push(db.prepare('UPDATE members SET active=0,admin=0,can_host=0 WHERE id=?').bind(m.id),db.prepare('DELETE FROM sessions WHERE member_id=?').bind(m.id));}
  if(statements.length)await db.batch(statements);
  checked=now();version=roster.version;
 })();pending=operation;try{await operation;}finally{if(pending===operation)pending=undefined;}
}

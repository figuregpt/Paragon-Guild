import {mkdirSync,writeFileSync,existsSync,renameSync,rmSync,statSync} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {NodeDatabase,dataDirectory,migrate} from './storage.mjs';
import {nameKey,memberContributionKey} from '../contribution-source.mjs';

// Operator-only utility: no HTTP route invokes this. The launcher must be in
// maintenance mode so no application or scheduler holds the live database open.
export function resetGuildDatabase(input,root=dataDirectory(),migrations=path.resolve('drizzle')){
 if(process.env.PARAGON_MAINTENANCE!=='true')throw new Error('Maintenance mode is required before resetting guild data.');
 const time=Math.floor(Date.now()/1000),day=new Date(input.created*1000+3*3600000),today=day.toISOString().slice(0,10);day.setUTCDate(day.getUTCDate()-(day.getUTCDay()||7)+1);const week=day.toISOString().slice(0,10);
 const {snapshot,baselines,batch}=input;
 if(!Number.isSafeInteger(input.created)||input.created>time||time-input.created>900||input.unit!==500000||input.rate!==20)throw new Error('A fresh, verified contribution snapshot is required.');
 if(!Array.isArray(snapshot?.people)||!snapshot.people.length||snapshot.people.length>500||!Array.isArray(snapshot.deposits)||snapshot.deposits.length>5000||baselines?.length!==snapshot.people.length)throw new Error('Invalid contribution snapshot.');
 if(createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')!==batch)throw new Error('Contribution snapshot checksum failed.');
 const keys=new Set(),rows=new Set();
 for(const d of snapshot.deposits){if(!Number.isSafeInteger(d.row)||d.row<1||rows.has(d.row)||d.name_key!==nameKey(d.name)||!Number.isSafeInteger(d.yang)||d.yang<=0||d.yang>1e12||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||new Date(d.date+'T00:00:00Z').toISOString().slice(0,10)!==d.date||d.date>today)throw new Error('Invalid deposit record.');rows.add(d.row);}
 for(const p of snapshot.people){
  const b=baselines.find(b=>b.name_key===p.name_key),deposits=snapshot.deposits.filter(d=>d.name_key===p.name_key),total=deposits.reduce((s,d)=>s+d.yang,0),weekly=deposits.filter(d=>d.date>=week).reduce((s,d)=>s+d.yang,0);
  if(keys.has(p.name_key)||p.name_key!==nameKey(p.name)||!Number.isSafeInteger(p.yang)||p.yang!==total||!b||b.name!==p.name||b.yang!==total||b.pp!==Math.floor(total/500000*20)||b.pp>1e9||b.week!==week||b.weekly_pp!==Math.floor(Math.min(weekly,500000)/500000*20))throw new Error('Opening PP totals do not reconcile.');keys.add(p.name_key);
 }
 if(snapshot.deposits.some(d=>!keys.has(d.name_key)))throw new Error('A depositor has no opening balance.');
 const required=(process.env.DISCORD_MEMBER_ROLE_IDS||'').split(',').filter(Boolean),roster=input.roster?.members;
 if(!required.length||!Array.isArray(roster)||roster.length>5000||input.roster.checked>time||time-input.roster.checked>300||roster.some(m=>!/^\d{17,20}$/.test(m.id)||!Array.isArray(m.roles)||!m.roles.every(r=>/^\d{17,20}$/.test(r))||!required.some(r=>m.roles.includes(r)))||new Set(roster.map(m=>m.id)).size!==roster.length)throw new Error('A fresh, verified member-role roster is required.');
 const classMap=JSON.parse(process.env.DISCORD_CLASS_ROLES||'{}'),adminIds=(process.env.DISCORD_ADMIN_USER_IDS||'').split(','),adminRoles=(process.env.DISCORD_ADMIN_ROLE_IDS||'').split(','),hostRoles=(process.env.DISCORD_EVENT_CREATOR_ROLE_IDS||'').split(','),hostIds=(process.env.DISCORD_EVENT_CREATOR_USER_IDS||'').split(',');
 if(!Object.keys(classMap).length)throw new Error('Discord class roles must be configured.');
 const verified=roster.map(m=>{const classes=Object.entries(classMap).filter(([,r])=>(Array.isArray(r)?r:[r]).some(r=>m.roles.includes(r)));return {id:m.id,name:m.name,class:classes.length===1?classes[0][0]:'Unassigned',avatar:m.avatar,admin:adminIds.includes(m.id)||adminRoles.some(r=>m.roles.includes(r))?1:0,can_host:hostIds.includes(m.id)||hostRoles.some(r=>m.roles.includes(r))?1:0,active:1,new_events:1,created:time};});
 const backup=path.join(root,'backups','reset-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID()),live=path.join(root,'guild.sqlite'),staged=path.join(root,'guild-reset-'+randomUUID()+'.sqlite');
 mkdirSync(backup,{recursive:true,mode:0o700});
 const old=new NodeDatabase(live),fresh=new NodeDatabase(staged);
 let replaced=false;
 try{
  const oldCounts=Object.fromEntries(['members','events','auctions','bids','ledger','deposits'].map(t=>[t,old.connection.prepare('SELECT COUNT(*) n FROM '+t).get().n]));
  const previous=old.connection.prepare('SELECT id,name,class,avatar,admin,can_host,active,new_events,created FROM members').all().filter(m=>/^\d{17,20}$/.test(m.id)),rosterIds=new Set(verified.map(m=>m.id));
  const members=[...verified.map(m=>{const prior=previous.find(p=>p.id===m.id);return {...m,new_events:prior?.new_events??1,created:prior?.created??time};}),...previous.filter(m=>!rosterIds.has(m.id)).map(m=>({...m,active:0,admin:0,can_host:0}))],ids=rosterIds;
  const sessions=old.connection.prepare('SELECT * FROM sessions WHERE expires>? AND oauth IS NOT NULL').all(time).filter(s=>ids.has(s.member_id));
  const subscriptions=old.connection.prepare('SELECT * FROM subscriptions').all().filter(s=>ids.has(s.member_id));
  const settings=old.connection.prepare('SELECT * FROM settings').all();
  old.connection.prepare('VACUUM INTO ?').run(path.join(backup,'guild.sqlite'));
  writeFileSync(path.join(backup,'opening-contributions.json'),JSON.stringify(input),{mode:0o600});
  migrate(fresh,migrations);
  const db=fresh.connection;db.exec('BEGIN IMMEDIATE');
  try{
   for(const m of members)db.prepare('INSERT INTO members(id,name,class,avatar,admin,can_host,active,new_events,created) VALUES(?,?,?,?,?,?,?,?,?)').run(m.id,m.name,m.class,m.avatar,m.admin,m.can_host,m.active,m.new_events,m.created);
   for(const s of sessions)db.prepare('INSERT INTO sessions(token,member_id,expires,verified,oauth) VALUES(?,?,?,?,?)').run(s.token,s.member_id,s.expires,s.verified,s.oauth);
   for(const s of subscriptions)db.prepare('INSERT INTO subscriptions(endpoint,member_id,p256dh,auth,created) VALUES(?,?,?,?,?)').run(s.endpoint,s.member_id,s.p256dh,s.auth,s.created);
   for(const s of settings)db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run(s.key,s.value);
   for(const [key,value] of [['weekly','500000'],['rate','20']])db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,value);
   for(const b of baselines)db.prepare('INSERT INTO contribution_baselines(name_key,name,yang,pp,week,weekly_pp,unit,rate,source_batch,created) VALUES(?,?,?,?,?,?,?,?,?,?)').run(b.name_key,b.name,b.yang,b.pp,b.week,b.weekly_pp,500000,20,batch,input.created);
   for(const p of snapshot.people)db.prepare('INSERT INTO sheet_people(batch,name_key,name,yang) VALUES(?,?,?,?)').run(batch,p.name_key,p.name,p.yang);
   for(const d of snapshot.deposits)db.prepare('INSERT INTO sheet_deposits(batch,row,name_key,name,date,yang,note) VALUES(?,?,?,?,?,?,?)').run(batch,d.row,d.name_key,d.name,d.date,d.yang,d.note);
   db.prepare('INSERT INTO sheet_sync(key,batch,checked,attempted) VALUES(?,?,?,?)').run('guild-contributions',batch,time,time);
   const sourceKeys=baselines.map(b=>b.name_key),mapped=verified.map(m=>({...m,key:memberContributionKey(m,sourceKeys,process.env.DISCORD_CONTRIBUTION_NAMES)}));
   for(const m of mapped){
    if(!m.key||mapped.filter(p=>p.key===m.key).length!==1)continue;
    db.prepare('INSERT INTO contribution_baseline_claims(name_key,member_id,created) VALUES(?,?,?)').run(m.key,m.id,time);
    const paid=snapshot.deposits.filter(d=>d.name_key===m.key&&d.date>=week).reduce((s,d)=>s+d.yang,0);
    if(paid>=500000)db.prepare('INSERT INTO weekly_rewards(member_id,week,pp,yang,batch,created) VALUES(?,?,0,?,?,?)').run(m.id,week,paid,batch,time);
   }
   if(db.prepare('PRAGMA foreign_key_check').all().length||db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Fresh database integrity check failed.');
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  const totals=db.prepare('SELECT COUNT(*) people,SUM(yang) yang,SUM(pp) pp FROM contribution_baselines').get();
  const credited=db.prepare('SELECT COUNT(*) players,COALESCE(SUM(balance),0) pp FROM members WHERE balance>0').get(),pending=db.prepare('SELECT COUNT(*) people,COALESCE(SUM(pp),0) pp FROM contribution_baselines WHERE name_key NOT IN (SELECT name_key FROM contribution_baseline_claims)').get();
  if(db.prepare('SELECT COUNT(*) n FROM members m WHERE reserved<>0 OR balance<>COALESCE((SELECT SUM(amount) FROM ledger WHERE member_id=m.id),0)').get().n||db.prepare("SELECT COUNT(*) n FROM ledger WHERE id NOT LIKE 'baseline:%'").get().n)throw new Error('Fresh opening balances do not reconcile.');
  fresh.close();old.close();
  // With the application stopped, closing the last connection checkpoints WAL.
  if(existsSync(live+'-wal')&&statSync(live+'-wal').size)throw new Error('Another database connection is still active; reset was not applied.');
  for(const suffix of ['-wal','-shm'])rmSync(live+suffix,{force:true});
  renameSync(staged,live);replaced=true;
  if(existsSync(path.join(root,'uploads')))renameSync(path.join(root,'uploads'),path.join(backup,'uploads'));
  const result={backup,oldCounts,guildMembers:verified.length,retainedSessions:sessions.length,retainedDeviceSubscriptions:subscriptions.length,opening:totals,credited,pending,sourceDeposits:snapshot.deposits.length};
  writeFileSync(path.join(backup,'reset-result.json'),JSON.stringify(result),{mode:0o600});return result;
 }finally{
  try{fresh.close();}catch{}try{old.close();}catch{}
  if(!replaced)for(const suffix of ['','-wal','-shm'])rmSync(staged+suffix,{force:true});
 }
}

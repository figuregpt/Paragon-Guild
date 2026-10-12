// Local, fictional review environment. Never connects to the production guild or Discord.
import {randomBytes,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {mkdirSync} from 'node:fs';
import {NodeDatabase,migrate} from '../lib/railway/storage.mjs';
const testing=process.argv.includes('--test'),port=testing?3193:3192;
const directory=path.join(tmpdir(),testing?'paragon-member-tests':'paragon-private-preview'),origin='http://127.0.0.1:'+port;
mkdirSync(directory,{recursive:true,mode:0o700});
const db=new NodeDatabase(directory+'/guild.sqlite');migrate(db);
if(!db.connection.prepare('SELECT COUNT(*) n FROM members').get().n){
 const sql=(s,...a)=>db.connection.prepare(s).run(...a),time=Math.floor(Date.now()/1000);
 db.connection.exec('BEGIN IMMEDIATE');try{
 const names=['YIGO','Aether','Nyx','Ragnar','Kael','Selene','Atlas','Iris','Kora','Dorian','Leto','Ares','Neri','Orion','Thalia','Mira','Eren','Soren'],classes=['Shaman','Sura','Ninja','Warrior'];
 for(let i=0;i<80;i++){
  const member=i===0?'preview-admin':i===1?'preview-member':'preview-'+i;
  sql('INSERT INTO members(id,name,class,admin,can_host,created) VALUES(?,?,?,?,?,?)',member,names[i]||'Demo '+String(i+1).padStart(2,'0'),classes[i%4],i===0?1:0,i<2?1:0,time);
  sql('INSERT INTO ledger VALUES(?,?,?,?,?,?)','fixture:'+member,member,i===0?500:120+i*10,'Manual','Local fictional preview',time);
  const bonuses=i===0?{half_humans:48,sword_defense:45,magic_resistance:30,max_hp:8000,casting_speed:60,critical_chance:32,stun_immunity:1}:i===1?{half_humans:40,attack_value:120,max_hp:6000,devils:80,critical_chance:25}:i===2?{half_humans:36,piercing_chance:25,dagger_defense:45,max_hp:5000}:{};
  if(Object.keys(bonuses).length)sql('INSERT INTO member_profiles VALUES(?,?,1,?)',member,JSON.stringify(bonuses),time);
 }
 for(const [name,note,ids]of [['Frontline','First engage and hold the opponents.',['preview-3','preview-7','preview-member']],['Support','Keep the frontline buffed and healed.',['preview-admin','preview-4','preview-8']]]){
  const group=randomUUID();sql('INSERT INTO pvp_groups VALUES(?,?,?,1,?,?)',group,name,note,time,'preview-admin');for(const member of ids)sql('INSERT INTO pvp_group_members VALUES(?,?)',member,group);
 }
 for(const [title,kind,pp,start]of [['SD2 Help','Help',10,time-600],['Demon Tower Run','Demon Tower',10,time+3600],['Open PvP Practice','PvP',100,time+7200]]){
  const event=randomUUID();sql("INSERT INTO events(id,title,type,starts,pp,description,created_by,created,kind,phase,creation_day,location,game_channel,duration_minutes) VALUES(?,?,?,?,?,?,?, ?,?,'open',?,?,3,?)",event,title,kind==='PvP'?'PvP':'PvE',start,pp,'Fictional event for your private review.','preview-member',time,kind,new Date((time+10800)*1000).toISOString().slice(0,10),kind==='Help'?'Spider Dungeon 2':kind==='PvP'?'Guild War Area':'Demon Tower',kind==='Help'?60:null);
 }
 db.connection.exec('COMMIT');
 }catch(e){db.connection.exec('ROLLBACK');throw e;}
}
// Fictional preview identities carry representative Discord class roles, not editable class fields.
const fixtureRoles={Warrior:[['1480604321627373619','Warrior - Mental'],['1480604146569842750','Warrior - Aura (Body)']],Ninja:[['1480605021983997983','Ninja - Dagger'],['1480604825891766292','Ninja - Archer']],Sura:[['1480604554541269002','Sura - Weapon'],['1480604668651634873','Sura - BM']],Shaman:[['1480603704099864769','Shaman - Healer'],['1480603972715942141','Shaman - Dragon']]};
for(const member of db.connection.prepare('SELECT id,class FROM members').all()){
 const index=member.id==='preview-admin'?0:member.id==='preview-member'?1:Number(member.id.slice(8));
 const role=fixtureRoles[member.class]?.[Math.floor(index/4)%2];
 if(role)db.connection.prepare('UPDATE members SET class_roles=? WHERE id=?').run(JSON.stringify([{id:role[0],family:member.class,name:role[1]}]),member.id);
}
db.close();
const childEnv={...process.env};
for(const key of Object.keys(childEnv))if(/^(DISCORD_|GUILD_|VAPID_|SCHEDULER_|RAILWAY_)/.test(key))childEnv[key]='';
if(testing)childEnv.VINEXT_NO_DEV_LOCK='1';
Object.assign(childEnv,{PARAGON_RUNTIME:'railway',PARAGON_DATA_DIR:directory,APP_ORIGIN:origin,SESSION_SECRET:randomBytes(32).toString('hex'),MEMBERS_ONLY:'false',DEMO_ENABLED:'false',SCHEDULER_ENABLED:'false',DISCORD_BOT_TOKEN:'',DISCORD_CLIENT_ID:'',DISCORD_CLIENT_SECRET:'',DISCORD_GUILD_ID:'',GUILD_SHEET_ID:'',GUILD_BANK_SNAPSHOT:'',VAPID_PRIVATE_KEY:'',VAPID_PUBLIC_KEY:'',SCHEDULER_SECRET:''});
const server=spawn(process.execPath,['node_modules/vinext/dist/cli.js','dev','--hostname','127.0.0.1','--port',String(port)],{env:childEnv,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.kill(signal));
server.on('exit',code=>process.exit(code??1));

import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {NodeDatabase,migrate} from '../lib/railway/storage.mjs';
const oldDir=mkdtempSync(path.join(tmpdir(),'paragon-old-policy-')),db=new NodeDatabase(':memory:'),t=Math.floor(Date.now()/1000);
try{
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')&&f<'0014'))cpSync(path.join('drizzle',file),path.join(oldDir,file));
 migrate(db,oldDir);const sql=(q,...a)=>db.connection.prepare(q).run(...a),one=(q,...a)=>db.connection.prepare(q).get(...a);
 for(const [id,admin,host] of [['host',1,1],['reviewer',1,0],['member',0,0]])sql("INSERT INTO members(id,name,class,admin,can_host,created) VALUES(?,?,'Warrior',?,?,?)",id,id,admin,host,t);
 sql("INSERT INTO events(id,title,type,starts,pp,description,created_by,created,kind,phase,creation_day,duration_minutes,location) VALUES('old-help','Old Help','PvE',?,25,'','host',?,'Help','open','2026-10-08',30,'Demon Tower')",t,t);
 sql("INSERT INTO event_members(event_id,member_id,joined,attended,created) VALUES('old-help','member',1,1,?)",t);
 sql("INSERT INTO event_evidence VALUES('proof','old-help','host','proof.png','image/png',?)",t);
 sql("UPDATE events SET phase='confirming',ended=? WHERE id='old-help'",t);sql("UPDATE events SET phase='pending',submitted=? WHERE id='old-help'",t);
 migrate(db);migrate(db);assert.equal(one('SELECT COUNT(*) n FROM railway_migrations').n,15);assert.equal(one("SELECT pp FROM events WHERE id='old-help'").pp,25);
 for(const id of ['host','member'])sql("INSERT INTO event_reward_reviews VALUES('old-help',?,'approved','reviewer',?)",id,t);
 sql("UPDATE events SET phase='approved',status='completed',reviewed_by='reviewer',reviewed=? WHERE id='old-help'",t);
 for(const id of ['host','member'])assert.equal(one('SELECT balance FROM members WHERE id=?',id).balance,25);
 assert.throws(()=>sql("UPDATE events SET pp=10 WHERE id='old-help'"),/cannot change/);
 const create=(id,kind,pp,owner='host',location='Demon Tower',type='PvE',duration=null)=>sql("INSERT INTO events(id,title,type,starts,pp,description,created_by,created,kind,phase,creation_day,duration_minutes,location) VALUES(?,?,?, ?,?,'',?, ?,?,'open','2026-10-09',?,?)",id,id,type,t,pp,owner,t,kind,duration,location);
 create('new-help','Help',10,'member','Demon Tower','PvE',30);assert.throws(()=>create('bad-help','Help',25,'member','Demon Tower','PvE',30),/reward/);
 create('tower','Demon Tower',10);assert.throws(()=>create('wrong-map','Demon Tower',10,'host','Arena'),/reward/);assert.throws(()=>create('duration','Demon Tower',10,'host','Demon Tower','PvE',30),/manually/);
 assert.throws(()=>create('admin-only','Demon Tower',10,'reviewer'),/Experienced/);assert.throws(()=>create('member-only','Custom',41,'member'),/Experienced/);
 create('custom','Custom',41,'host','Guild courtyard');for(const pp of [0,-1,1.5,1000001])assert.throws(()=>create('bad-custom-'+pp,'Custom',pp),/reward/);
 assert.throws(()=>sql("UPDATE events SET pp=42 WHERE id='custom'"),/cannot change/);
 assert.deepEqual(db.connection.prepare('PRAGMA foreign_key_check').all(),[]);
 console.log('PASS: migration preserves and settles existing 25 PP Help, new fixed rewards and Custom bounds enforced in SQLite, Experienced required even for admins, Demon Tower map/manual end protected, reward history immutable, migration retry safe.');
}finally{db.close();rmSync(oldDir,{recursive:true,force:true});}

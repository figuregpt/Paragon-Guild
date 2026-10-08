import {NodeDatabase,NodeBucket,migrate} from '../lib/railway/storage.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const directory=mkdtempSync(path.join(tmpdir(),'paragon-storage-')),db=new NodeDatabase(path.join(directory,'guild.sqlite'));
try{
 migrate(db);migrate(db);assert.equal((await db.prepare('SELECT COUNT(*) n FROM railway_migrations').first()).n,15);
 for(const id of ['a','b'])await db.prepare("INSERT INTO members(id,name,class,created) VALUES(?,?,'Warrior',unixepoch())").bind(id,id).run();
 const channelEvent=(id,channel)=>db.prepare("INSERT INTO events(id,title,type,starts,pp,description,created_by,created,game_channel) VALUES(?,'Channel Test','PvE',unixepoch()+3600,0,'','a',unixepoch(),?)").bind(id,channel);
 await channelEvent('channel-good',6).run();await channelEvent('channel-unknown',null).run();await assert.rejects(channelEvent('channel-invalid',7).run());await assert.rejects(channelEvent('channel-fraction',1.5).run());await assert.rejects(db.prepare("UPDATE events SET game_channel=5 WHERE id='channel-good'").run());assert.equal((await db.prepare("SELECT game_channel FROM events WHERE id='channel-unknown'").first()).game_channel,null);
 for(const id of ['a','b'])await db.prepare("INSERT INTO ledger VALUES(?,?,1000,'PvE','Fixture',unixepoch())").bind('seed:'+id,id).run();
 await db.prepare("INSERT INTO items(id,name,icon,height,classes,created) VALUES('item','Dragon God Armour','/metin2/armour.png',2,'Warrior',unixepoch())").run();
 await db.prepare("INSERT INTO auctions(id,item_id,upgrade,source,bonuses,minimum,increment,starts,ends,created_by,created) VALUES('auction','item',0,'Demon Tower','',100,10,unixepoch(),unixepoch()+3600,'a',unixepoch())").run();
 const bid=(id,member,amount)=>db.prepare('INSERT INTO bids VALUES(?,?,?,?,unixepoch())').bind(id,'auction',member,amount);
 const attempts=await Promise.allSettled([db.batch([bid('first','a',100)]),db.batch([bid('second','b',100)])]);assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);assert.equal((await db.prepare("SELECT reserved FROM members WHERE id='a'").first()).reserved,100);
 await db.batch([bid('higher','b',200)]);assert.equal((await db.prepare("SELECT reserved FROM members WHERE id='a'").first()).reserved,0);assert.equal((await db.prepare("SELECT reserved FROM members WHERE id='b'").first()).reserved,200);
 await assert.rejects(db.batch([db.prepare("INSERT INTO audit VALUES('rollback','a','test','test',unixepoch())"),bid('bad','a',1500)]));assert.equal(await db.prepare("SELECT * FROM audit WHERE id='rollback'").first(),null);assert.equal((await db.prepare("SELECT current FROM auctions WHERE id='auction'").first()).current,200);
 const bucket=new NodeBucket(path.join(directory,'uploads')),bytes=Uint8Array.from([1,2,3]);await bucket.put('icons/test.png',bytes,{httpMetadata:{contentType:'image/png'}});assert.deepEqual((await bucket.get('icons/test.png')).body,bytes);assert.equal((await bucket.get('icons/test.png')).httpMetadata.contentType,'image/png');await assert.rejects(bucket.get('../guild.sqlite'));await bucket.delete('icons/test.png');assert.equal(await bucket.get('icons/test.png'),null);
 db.close();const reopened=new NodeDatabase(path.join(directory,'guild.sqlite'));assert.equal((await reopened.prepare("SELECT current FROM auctions WHERE id='auction'").first()).current,200);reopened.close();console.log('PASS complete trigger migrations, migration retry, competing bids, PP reservations, batch rollback, safe image storage and persistence after restart.');
}finally{try{db.close();}catch{}rmSync(directory,{recursive:true,force:true});}

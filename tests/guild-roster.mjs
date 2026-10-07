import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import {NodeDatabase,migrate} from '../lib/railway/storage.mjs';
const db=new NodeDatabase(':memory:');migrate(db);
const memberRole='100000000000000001',classRole='100000000000000002',leader='100000000000000003',player='100000000000000004',unassigned='100000000000000005';
let calls=0,version=1;
let members=[{id:leader,name:'Leader',roles:[memberRole,classRole],avatar:null,bot:false},{id:player,name:'New Player',roles:[memberRole,classRole],avatar:null,bot:false},{id:unassigned,name:'No Class Yet',roles:[memberRole],avatar:null,bot:false},{id:'100000000000000006',name:'Outsider',roles:[classRole],avatar:null,bot:false}];
const bot={ready:true,get version(){return version;},getMembers:async()=>{calls++;return {members,version,checked:Date.now()};}};
const env={DB:db,DISCORD_BOT:bot,DISCORD_BOT_TOKEN:'test-only',DISCORD_CLASS_ROLES:JSON.stringify({Warrior:[classRole]}),DISCORD_MEMBER_ROLE_IDS:memberRole,DISCORD_ADMIN_USER_IDS:leader};
const context=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,Date,URL,URLSearchParams,Request,Response,AbortSignal,console});
const worker=new vm.SyntheticModule(['env'],function(){this.setExport('env',env);},{context}),modules=new Map();
function load(filename){if(modules.has(filename))return modules.get(filename);const raw=readFileSync(filename,'utf8'),source=filename.endsWith('.ts')?ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText:raw;const module=new vm.SourceTextModule(source,{context,identifier:filename,initializeImportMeta(meta){meta.env={DEV:false};}});modules.set(filename,module);return module;}
const mod=load(path.resolve('lib/guild-roster.ts'));await mod.link((spec,ref)=>spec==='cloudflare:workers'?worker:load(path.resolve(path.dirname(ref.identifier),spec+(path.extname(spec)?'':'.ts'))));await mod.evaluate();const {syncGuildMembers}=mod.namespace;
try{
 await Promise.all(Array.from({length:10},()=>syncGuildMembers()));assert.equal(calls,1);assert.equal(db.connection.prepare('SELECT COUNT(*) n FROM members WHERE active=1').get().n,3);assert.equal(db.connection.prepare('SELECT class FROM members WHERE id=?').get(unassigned).class,'Unassigned');assert.equal(db.connection.prepare('SELECT admin FROM members WHERE id=?').get(leader).admin,1);assert.equal(db.connection.prepare('SELECT COUNT(*) n FROM sessions').get().n,0);
 db.connection.prepare('INSERT INTO ledger VALUES(?,?,25,?,?,unixepoch())').run('points',player,'Manual','Fixture');db.connection.prepare('INSERT INTO sessions(token,member_id,expires,verified,oauth) VALUES(?,?,unixepoch()+3600,unixepoch(),?)').run('token',player,'fixture');
 members=members.filter(m=>m.id!==player);version++;await syncGuildMembers();assert.equal(db.connection.prepare('SELECT active,balance FROM members WHERE id=?').get(player).active,0);assert.equal(db.connection.prepare('SELECT balance FROM members WHERE id=?').get(player).balance,25);assert.equal(db.connection.prepare('SELECT COUNT(*) n FROM sessions').get().n,0);
 members.push({id:player,name:'Returned Player',roles:[memberRole,classRole],avatar:null,bot:false});version++;await syncGuildMembers();assert.equal(db.connection.prepare('SELECT active FROM members WHERE id=?').get(player).active,1);assert.equal(db.connection.prepare('SELECT balance FROM members WHERE id=?').get(player).balance,25);
 bot.ready=false;await assert.rejects(syncGuildMembers(),e=>e.status===503);assert.equal(db.connection.prepare('SELECT active FROM members WHERE id=?').get(player).active,1);env.DEMO_SESSION=true;await syncGuildMembers();delete env.DEMO_SESSION;
 console.log('PASS: complete member-role roster without sign-in, missing class visible, explicit admin gate, concurrent refresh deduplication, role removal/session revocation, rejoin without balance loss and outage/demo protection.');
}finally{db.close();}

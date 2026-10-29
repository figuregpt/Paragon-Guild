import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');for(const file of readdirSync(new URL('../drizzle',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
let time=1800000000;const sql=(s,...args)=>db.prepare(s).run(...args),one=(s,...args)=>db.prepare(s).get(...args),calls=[],failures=new Map();
for(const id of ['alice','bob','inactive'])sql("INSERT INTO members(id,name,class,created,active) VALUES(?,?,'Warrior',?,?)",id,id,time,id==='inactive'?0:1);
for(const [endpoint,member]of [['a1','alice'],['a2','alice'],['b1','bob'],['old','alice']])sql('INSERT INTO subscriptions VALUES(?,?,?,?,?)',endpoint,member,'key','auth',time);
globalThis.__bossTest={env:{SCHEDULER_ENABLED:'true',SCHEDULER_SECRET:'test-only',VAPID_PUBLIC_KEY:'key',VAPID_PRIVATE_KEY:'key',VAPID_SUBJECT:'mailto:test@example.com'},all:async(s,...a)=>db.prepare(s).all(...a),first:async(s,...a)=>one(s,...a),run:async(s,...a)=>({meta:{changes:sql(s,...a).changes}}),now:()=>time,push:async(sub,payload)=>{calls.push({endpoint:sub.endpoint,payload});return failures.get(sub.endpoint)??201;}};
let source=readFileSync(new URL('../lib/boss-tracking.ts',import.meta.url),'utf8');
source=source.replace("import {env} from 'cloudflare:workers';","const {env}=globalThis.__bossTest;").replace("import {z} from 'zod';",`import {z} from ${JSON.stringify(import.meta.resolve('zod'))};`).replace("import {all,first,run} from './database';","const {all,first,run}=globalThis.__bossTest;").replace("import {HttpError} from './auth';","class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}").replace("import {now,type Member} from './domain';","const {now}=globalThis.__bossTest;").replace("import {findGuideBoss} from './boss-guide';","const findGuideBoss=id=>['flame-king','thornspike-stump'].includes(id)?{id,name:id}:undefined;").replace("import {BOSS_RESPAWN_SECONDS,BOSS_ADJUSTMENT_SECONDS,BOSS_MAX_DURATION_SECONDS,type BossTimer} from './boss-timers';","const BOSS_RESPAWN_SECONDS=2400,BOSS_ADJUSTMENT_SECONDS=600,BOSS_MAX_DURATION_SECONDS=86400;").replace("import {sendPush} from './web-push';","const {push:sendPush}=globalThis.__bossTest;");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {bossTrackingRoute:route,processBossTimers:tick}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const get=async(member='alice')=>(await route(new Request('https://test.example/api/boss-timers'),'boss-timers',{id:member})).json();
const post=async(member,data)=>(await route(new Request('https://test.example/api/boss-timers',{method:'POST',body:JSON.stringify(data)}),'boss-timers',{id:member})).json();
const kill=(bossId,channel,expectedRevision=null)=>({bossId,channel,expectedRevision,requestId:crypto.randomUUID(),action:'kill'});
try{
 const original=kill('flame-king',3);let a=await post('alice',original);assert.equal(a.timer.respawns-a.timer.killed,2400);assert.equal((await get('bob')).timers.length,0);
 time+=20;assert.deepEqual((await post('alice',original)).timer,a.timer,'A network replay must not restart the clock');
 const b=await post('bob',kill('flame-king',3));assert.notEqual(a.timer.revision,b.timer.revision);assert.equal((await get('alice')).timers[0].killed,1800000000);
 await post('alice',kill('flame-king',5));await post('alice',kill('thornspike-stump',3));assert.equal((await get('alice')).timers.length,3);
 for(const payload of [{...kill('flame-king',0)},kill('unknown',3),{...kill('flame-king',2),memberId:'bob'}])await assert.rejects(()=>post('alice',payload));
 await assert.rejects(()=>post('alice',kill('flame-king',3)),e=>e.status===409);
 // Personal +/-10 changes preserve kill time, cancel stale generations and are replay-safe.
 const adjustBase=await post('alice',kill('flame-king',4));
 const plusBody={...kill('flame-king',4,adjustBase.timer.revision),action:'add10'};
 const plus=await post('alice',plusBody);assert.equal(plus.timer.respawns,adjustBase.timer.respawns+600);assert.equal(plus.timer.killed,adjustBase.timer.killed);assert.notEqual(plus.timer.revision,adjustBase.timer.revision);assert.deepEqual((await post('alice',plusBody)).timer,plus.timer);
 const minus=await post('alice',{...kill('flame-king',4,plus.timer.revision),action:'subtract10'});assert.equal(minus.timer.respawns,adjustBase.timer.respawns);assert.equal(minus.timer.killed,adjustBase.timer.killed);
 const oneRequest={...kill('flame-king',4,minus.timer.revision),action:'add1'};
 const onePlus=await post('alice',oneRequest);assert.equal(onePlus.timer.respawns,minus.timer.respawns+60);assert.equal(onePlus.timer.killed,minus.timer.killed);assert.deepEqual((await post('alice',oneRequest)).timer,onePlus.timer);
 const oneMinus=await post('alice',{...kill('flame-king',4,onePlus.timer.revision),action:'subtract1'});assert.equal(oneMinus.timer.respawns,minus.timer.respawns);assert.equal(oneMinus.timer.killed,minus.timer.killed);
 minus.timer=oneMinus.timer;
 await assert.rejects(()=>post('alice',{...kill('flame-king',4,plus.timer.revision),action:'add10'}),e=>e.status===409);
 await assert.rejects(()=>post('bob',{...kill('flame-king',4,minus.timer.revision),action:'subtract10'}),e=>e.status===409);
 sql("UPDATE boss_timers SET respawns=killed+86400 WHERE member_id='alice' AND game_channel=4");await assert.rejects(()=>post('alice',{...kill('flame-king',4,minus.timer.revision),action:'add10'}),e=>e.status===400);
 sql("UPDATE boss_timers SET respawns=? WHERE member_id='alice' AND game_channel=4",time+300);
 const zero=await post('alice',{...kill('flame-king',4,minus.timer.revision),action:'subtract10'});assert.equal(zero.timer.respawns,time);assert.equal(zero.timer.killed,adjustBase.timer.killed);
 await assert.rejects(()=>post('alice',{...kill('flame-king',4,zero.timer.revision),action:'add10'}),e=>e.status===409);
 await post('alice',{...kill('flame-king',4,zero.timer.revision),action:'clear'});

 const cleared=await post('alice',{...kill('flame-king',5,(await get()).timers.find(t=>t.game_channel===5).revision),action:'clear'});assert.equal(cleared.timer,null);assert.equal((await get('bob')).timers.length,1);
 await tick();assert.equal(calls.length,0,'Never notify early');
 failures.set('a2',503);time=1800002400;await Promise.all([tick(),tick()]);assert.equal(calls.filter(c=>c.endpoint==='a1').length,1);assert.equal(calls.filter(c=>c.endpoint==='b1').length,0);assert.equal(one("SELECT status FROM boss_timer_deliveries WHERE endpoint='a2'").status,'pending');
 const delivered=calls.find(c=>c.endpoint==='a1').payload;assert.equal(delivered.url,'/?view=guide&boss=flame-king');assert.equal(delivered.gameChannel,3);assert.equal(delivered.bossRespawns,1800002400);
 // Retrying one failed endpoint must not notify successful endpoints again.
 failures.delete('a2');time+=30;await tick();assert.equal(calls.filter(c=>c.endpoint==='a1'&&c.payload.bossId==='flame-king').length,1);assert.equal(one("SELECT status FROM boss_timer_deliveries WHERE revision=? AND endpoint='a2'",a.timer.revision).status,'sent');
 // Clear, restart, revoked memberships and device-account switches invalidate pending deliveries.
 const current=(await get()).timers.find(t=>t.boss_id==='flame-king');const fresh=await post('alice',kill('flame-king',3,current.revision));assert.equal(fresh.timer.killed,time);assert.equal(fresh.timer.respawns,time+2400);
 const oldCount=calls.length;await tick();assert.equal(calls.length,oldCount);
 sql("UPDATE members SET active=0 WHERE id='bob'");time=fresh.timer.respawns;sql("UPDATE subscriptions SET member_id='bob' WHERE endpoint='old'");await tick();assert.equal(calls.filter(c=>c.endpoint==='old'&&c.payload.tag==='boss-respawn:'+fresh.timer.revision).length,0);assert.equal(calls.filter(c=>c.endpoint==='b1').length,1,'Only the earlier active Bob timer was delivered');
 assert.equal((await get('alice')).timers.some(t=>t.revision===b.timer.revision),false);
 // Stale pending attempts are skipped after deletion rather than delivered.
 const stale=kill('flame-king',1);const s=await post('alice',stale);sql("INSERT INTO boss_timer_deliveries(revision,endpoint,member_id,created) VALUES(?,'a1','alice',?)",s.timer.revision,time);await post('alice',{...kill('flame-king',1,s.timer.revision),action:'clear'});await tick();assert.equal(one("SELECT status FROM boss_timer_deliveries WHERE revision=?",s.timer.revision).status,'skipped');
 // Moving a deadline skips its old queued generation and sends once at the new deadline.
 const beforeMove=await post('alice',kill('flame-king',6));
 sql("INSERT INTO boss_timer_deliveries(revision,endpoint,member_id,created) VALUES(?,'a1','alice',?)",beforeMove.timer.revision,time);
 const moved=await post('alice',{...kill('flame-king',6,beforeMove.timer.revision),action:'add1'});
 time=beforeMove.timer.respawns;await tick();
 assert.equal(one('SELECT status FROM boss_timer_deliveries WHERE revision=?',beforeMove.timer.revision).status,'skipped');
 assert.equal(calls.filter(c=>c.payload.tag==='boss-respawn:'+moved.timer.revision).length,0);
 time=moved.timer.respawns;await tick();await tick();
 assert.equal(calls.filter(c=>c.endpoint==='a1'&&c.payload.tag==='boss-respawn:'+moved.timer.revision).length,1);
 console.log('PASS: private account/boss/channel keys, initial 40 minutes, private +/-1 and +/-10 adjustments, rescheduled push, independent CHs, replay safety, conflict protection, validation, clear/restart, no early push, concurrent claims, per-device retries, membership/device ownership and stale-delivery suppression. Push transport stubbed.');
}finally{db.close();delete globalThis.__bossTest;}

for(const language of ['en','tr','el']){
 const handlers={},shown=[],navigated=[];let waiting;
 const scope={URL,Intl,Date,Number,console,caches:{open:async()=>({match:async()=>({text:async()=>language})})},self:{location:{origin:'https://test.example'},addEventListener:(k,v)=>handlers[k]=v,registration:{showNotification:async(title,options)=>shown.push({title,...options})},clients:{matchAll:async()=>[{url:'https://test.example/',navigate:async url=>navigated.push(url),focus:async()=>{}}]}}};
 vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),scope);
 handlers.push({data:{json:()=>({title:'Paragon — Boss Respawn',bossName:'Thornspike Stump',gameChannel:3,url:'/?view=guide&boss=thornspike-stump',tag:'boss-test'})},waitUntil:p=>waiting=p});await waiting;assert.ok(shown[0].body.includes('CH-3'));assert.equal(shown[0].data.url,'/?view=guide&boss=thornspike-stump');
 handlers.notificationclick({notification:{close(){},data:shown[0].data},waitUntil:p=>waiting=p});await waiting;assert.equal(navigated[0],'/?view=guide&boss=thornspike-stump');
}
console.log('PASS: real service worker localizes boss pushes in three languages and opens the correct boss. No external notifications sent.');

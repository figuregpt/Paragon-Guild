import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import ts from 'typescript';
import {shouldDeliverNotification} from '../lib/notification-policy.ts';
const time=Math.floor(Date.now()/1000),db=new DatabaseSync(':memory:');for(const f of readdirSync(new URL('../drizzle',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));db.exec('PRAGMA foreign_keys=ON');
const sql=(s,...a)=>db.prepare(s).run(...a),query=(s,...a)=>db.prepare(s).get(...a);
for(const id of ['admin','member','disabled','inactive','expired','retry','crashed'])sql("INSERT INTO members(id,name,class,admin,can_host,active,new_events,created) VALUES(?,?,'Warrior',?,?,?, ?,?)",id,id,id==='admin'?1:0,id==='admin'?1:0,id==='inactive'?0:1,id==='disabled'?0:1,time);
const key=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),jwk=await crypto.subtle.exportKey('jwk',key.privateKey),pub=await crypto.subtle.exportKey('raw',key.publicKey),receiver=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
const env={VAPID_PUBLIC_KEY:Buffer.from(pub).toString('base64url'),VAPID_PRIVATE_KEY:jwk.d,VAPID_SUBJECT:'mailto:test@example.com'};
for(const id of ['member','disabled','inactive','expired','retry','crashed'])sql('INSERT INTO subscriptions VALUES(?,?,?,?,?)','https://web.push.apple.com/'+id,id,Buffer.from(await crypto.subtle.exportKey('raw',receiver.publicKey)).toString('base64url'),Buffer.alloc(16,2).toString('base64url'),time);
function event(id,kind,starts){sql("INSERT INTO events(id,title,type,starts,pp,description,created_by,created,kind,phase,creation_day,duration_minutes,location) VALUES(?,?,'PvE',?,?,'','admin',?,?,'open','2026-10-07',?,'Demon Tower')",id,id,starts,kind==='Help'?25:35,time,kind,kind==='Help'?60:null);}
event('help','Help',time-5);event('upcoming','PvE',time+14*60);event('ended-help','Help',time-4000);
for(const id of ['member','disabled','inactive','expired','retry'])sql("INSERT INTO notifications(id,member_id,event_id,kind,created) VALUES(?,?,'help','new',?)",'new-help:'+id,id,time-5);
sql("INSERT INTO notifications(id,member_id,event_id,kind,created) VALUES('expired-help','member','ended-help','new',?)",time-4000);
sql("INSERT INTO event_members(event_id,member_id,reminder,created) VALUES('upcoming','member',15,?)",time);
sql("INSERT INTO notifications(id,member_id,event_id,kind,status,attempts,leased,created) VALUES('crashed','crashed','upcoming','new','sending',4,?,?)",time-400,time);
globalThis.__notificationEnv=env;
globalThis.__notificationDatabase={all:async(s,...a)=>db.prepare(s).all(...a),run:async(s,...a)=>({meta:{changes:db.prepare(s).run(...a).changes}})};
let source=readFileSync(new URL('../lib/jobs.ts',import.meta.url),'utf8').replace("import {announceEvents} from './discord-announcements';","const announceEvents=async()=>{};").replace("import {env} from 'cloudflare:workers';","const env=globalThis.__notificationEnv;").replace("import {all,run} from './database';","const {all,run}=globalThis.__notificationDatabase;").replace("import {now} from './domain';",`const now=()=>${time};`).replace("import {syncContributions,rewardGuildContributions} from './contributions';","const syncContributions=async()=>{},rewardGuildContributions=async()=>{};").replace("import {syncGuildMembers} from './guild-roster';","const syncGuildMembers=async()=>{};");
for(const name of ['web-push','notification-policy'])source=source.replace("'./"+name+"'",JSON.stringify(new URL('../lib/'+name+'.ts',import.meta.url).href));
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const jobs=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const savedFetch=globalThis.fetch,requests=[];globalThis.fetch=async(url,options)=>{requests.push(url);assert.equal(options.method,'POST');assert.ok(options.headers.Authorization.startsWith('vapid '));assert.equal(options.headers['Content-Encoding'],'aes128gcm');assert.ok(options.body.length>86);return new Response(null,{status:url.endsWith('/expired')?410:url.endsWith('/retry')?503:201});};
try{
 await jobs.processJobs();assert.equal(query("SELECT status FROM notifications WHERE id='new-help:member'").status,'sent');assert.equal(query("SELECT status FROM notifications WHERE id='reminder:upcoming:member'").status,'sent');assert.equal(query("SELECT status FROM notifications WHERE id='new-help:disabled'").status,'skipped');assert.equal(query("SELECT status FROM notifications WHERE id='new-help:inactive'").status,'skipped');assert.equal(query("SELECT status FROM notifications WHERE id='expired-help'").status,'skipped');assert.equal(query("SELECT status FROM notifications WHERE id='crashed'").status,'failed');assert.equal(query("SELECT COUNT(*) n FROM subscriptions WHERE member_id='expired'").n,0);
 const sent=requests.filter(s=>s.endsWith('/member')).length;assert.equal(sent,2);await jobs.processJobs();await jobs.processJobs();await jobs.processJobs();assert.equal(requests.filter(s=>s.endsWith('/member')).length,sent);assert.equal(query("SELECT status,attempts FROM notifications WHERE id='new-help:retry'").status,'failed');assert.equal(query("SELECT status,attempts FROM notifications WHERE id='new-help:retry'").attempts,4);
 const n={kind:'reminder',created:time,starts:time+1,event_status:'upcoming',event_phase:'open',event_kind:'PvE',duration_minutes:null,active:1,new_events:0};assert.equal(shouldDeliverNotification(n,time),true);assert.equal(shouldDeliverNotification({...n,starts:time},time),false);assert.equal(shouldDeliverNotification({...n,event_phase:'pending'},time),false);
 console.log('PASS scheduler: instant Help push, due 15-minute reminder, active-member and notification preference gates, ended Help suppression, 410 cleanup, exactly-once successes, bounded 503 retries and interrupted final-attempt recovery. Provider fetches were stubbed.');
}finally{globalThis.fetch=savedFetch;delete globalThis.__notificationEnv;delete globalThis.__notificationDatabase;db.close();}
// Execute the real service worker in a controlled harness, including device-local time formatting.
const handlers={},shown=[],opened=[],navigated=[];
const client={url:'https://paragon.example/?view=home',navigate:async u=>navigated.push(u),focus:async()=>true};
const context={URL,Intl,Date,Number,console,self:{location:{origin:'https://paragon.example'},addEventListener:(type,fn)=>handlers[type]=fn,registration:{showNotification:async(title,options)=>shown.push({title,...options})},clients:{matchAll:async()=>[client],openWindow:async url=>opened.push(url)}}};
vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),context);let waiting;
handlers.push({data:{json:()=>({title:'New Help',eventTitle:'Demon Tower',eventStarts:time,gameChannel:6,url:'/?view=events&event=123',tag:'help'})},waitUntil:p=>waiting=p});await waiting;assert.equal(shown[0].data.url,'/?view=events&event=123');assert.ok(shown[0].body.includes('Demon Tower'));assert.ok(shown[0].body.includes('CH-6'));
let closed=false;handlers.notificationclick({notification:{close:()=>closed=true,data:shown[0].data},waitUntil:p=>waiting=p});await waiting;assert.ok(closed);assert.equal(navigated[0],'/?view=events&event=123');
context.self.clients.matchAll=async()=>[];handlers.notificationclick({notification:{close:()=>{},data:{url:'/?view=profile'}},waitUntil:p=>waiting=p});await waiting;assert.equal(opened[0],'/?view=profile');
handlers.push({data:{json:()=>({title:'Unsafe',url:'https://external.example'})},waitUntil:p=>waiting=p});await waiting;assert.equal(shown[1].data.url,'/?view=events');handlers.push({data:{json:()=>{throw new Error('bad')}} ,waitUntil:p=>waiting=p});await waiting;assert.equal(shown[2].title,'Paragon');
console.log('PASS real service-worker code: local-time event body, event deep link, focus/navigate existing app, open installed app, test-profile link, external URL rejection and malformed payload fallback.');

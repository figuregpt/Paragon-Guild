import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3192';assert.equal(new URL(base).hostname,'127.0.0.1','Local fixtures only');
const sessions={};
async function call(member,path,body,status=200,origin=base){const response=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(member?{Cookie:sessions[member]}:{}),...(body?{Origin:origin,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const text=await response.text();let value;try{value=JSON.parse(text);}catch{value={error:text};}assert.equal(response.status,status,path+': '+JSON.stringify(value));return value;}
for(const [name,role]of [['alice','member'],['bob','admin']]){const r=await fetch(base+'/api/preview-login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({role})});assert.equal(r.status,200);sessions[name]=r.headers.get('set-cookie').split(';')[0];}
await call(null,'boss-timers',null,401);await call(null,'boss-timers',{bossId:'flame-king'},401);await call(null,'jobs/boss-timers',{},403);
const existingA=await call('alice','boss-timers'),existingB=await call('bob','boss-timers'),bossId='yellow-tiger',channel=2;
const prior=value=>value.timers.find(timer=>timer.boss_id===bossId&&timer.game_channel===channel)?.revision??null;
const request={bossId,channel,action:'kill',requestId:crypto.randomUUID(),expectedRevision:prior(existingA)};
const a=await call('alice','boss-timers',request);assert.equal(a.timer.respawns-a.timer.killed,2400);assert.equal((await call('bob','boss-timers')).timers.some(timer=>timer.revision===a.timer.revision),false);
assert.deepEqual((await call('alice','boss-timers',request)).timer,a.timer);
const b=await call('bob','boss-timers',{...request,requestId:crypto.randomUUID(),expectedRevision:prior(existingB)});assert.notEqual(a.timer.revision,b.timer.revision);
const ours=await call('alice','boss-timers?memberId=preview-admin');assert.equal(ours.timers.some(timer=>timer.revision===b.timer.revision),false);
await call('alice','boss-timers',{...request,memberId:'preview-admin'},400);await call('alice','boss-timers',{...request,channel:7},400);await call('alice','boss-timers',{...request,requestId:crypto.randomUUID(),expectedRevision:null},409);await call('alice','boss-timers',request,403,'https://unrelated.example');
for(const [who,timer]of [['alice',a.timer],['bob',b.timer]])await call(who,'boss-timers',{bossId,channel,action:'clear',requestId:crypto.randomUUID(),expectedRevision:timer.revision});
console.log('PASS actual local API: member authentication, scheduler authorization, CSRF, private reads and writes, no member-ID spoofing, channel validation, exact server timer, replay idempotency, stale write rejection, independent accounts and cleanup. No production writes.');

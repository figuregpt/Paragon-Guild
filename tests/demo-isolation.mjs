import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {demoRuntime,env,migrate,getDatabase} from '../lib/railway/storage.mjs';
const root=mkdtempSync(path.join(tmpdir(),'paragon-demo-test-'));process.env.PARAGON_DATA_DIR=root;process.env.DEMO_ENABLED='true';process.env.GUILD_BANK_SNAPSHOT='PRIVATE';process.env.GUILD_SHEET_ID='PRIVATE';process.env.DISCORD_BOT_TOKEN='PRIVATE';process.env.VAPID_PRIVATE_KEY='PRIVATE';process.env.SCHEDULER_SECRET='PRIVATE';
const request=(route,cookie='')=>new Request('http://localhost/api/'+route,{headers:{cookie}});
const credentials=response=>response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
try{
 migrate(getDatabase());
 const first=credentials(await demoRuntime.login(request('demo-login'),'member')),second=credentials(await demoRuntime.login(request('demo-login'),'leader'));
 assert.notEqual(first,second);
 const read=cookie=>demoRuntime.run(request('state',cookie),async()=>({count:await env.DB.prepare('SELECT COUNT(*) n FROM members').first(),notice:await env.DB.prepare("SELECT value FROM settings WHERE key='notice'").first(),leader:await env.DB.prepare('SELECT m.admin FROM sessions s JOIN members m ON m.id=s.member_id').first(),botToken:env.DISCORD_BOT_TOKEN,bot:env.DISCORD_BOT,sheet:env.GUILD_SHEET_ID,snapshot:env.GUILD_BANK_SNAPSHOT,push:env.VAPID_PRIVATE_KEY,scheduler:env.SCHEDULER_SECRET}));
 const member=await read(first),leader=await read(second);assert.equal(member.count.n,4);assert.equal(member.leader.admin,0);assert.equal(leader.leader.admin,1);assert.equal(member.bot,undefined);assert.equal(member.botToken,undefined);assert.equal(member.sheet,undefined);assert.equal(member.snapshot,undefined);assert.equal(member.push,undefined);assert.equal(member.scheduler,undefined);
 await demoRuntime.run(request('state',first),async()=>env.DB.prepare("UPDATE settings SET value='Member sandbox only' WHERE key='notice'").run());
 assert.notEqual((await read(second)).notice.value,'Member sandbox only');
 const switched=credentials(await demoRuntime.login(request('demo-login',first),'leader'));assert.equal((await read(switched)).notice.value,'Member sandbox only');assert.equal((await read(switched)).leader.admin,1);
 const checks=await Promise.all([demoRuntime.run(request('state',first),async()=>{await new Promise(r=>setTimeout(r,10));return (await env.DB.prepare("SELECT value FROM settings WHERE key='notice'").first()).value;}),demoRuntime.run(request('state',second),async()=>{await new Promise(r=>setTimeout(r,1));return (await env.DB.prepare("SELECT value FROM settings WHERE key='notice'").first()).value;})]);assert.notEqual(checks[0],checks[1]);
 let called=false;const invalid=await demoRuntime.run(request('state','pg_demo=invalid'),async()=>{called=true;});assert.equal(invalid.status,401);assert.equal(called,false);
 await demoRuntime.run(request('jobs/tick',first),async()=>{assert.equal(env.DEMO_SESSION,false);assert.equal(env.SCHEDULER_SECRET,'PRIVATE');});
 assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM members').first()).n,0);assert.equal(await env.DB.prepare('SELECT * FROM bank_source').first(),null);
 process.env.DEMO_ENABLED='false';assert.equal((await demoRuntime.run(request('state',first),async()=>{})).status,401);assert.equal((await demoRuntime.login(request('demo-login'),'leader')).status,404);
 console.log('PASS member/leader fixtures, isolated databases, concurrent request contexts, role switching, invalid credentials fail closed, private snapshot/push isolation, production database unchanged and demo disable.');
}finally{getDatabase().close();rmSync(root,{recursive:true,force:true});}

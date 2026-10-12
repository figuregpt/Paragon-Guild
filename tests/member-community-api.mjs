import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3193';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
const member=await browser.newContext(),admin=await browser.newContext(),outsider=await browser.newContext();
const post=async(ctx,path,data,status=200)=>{const r=await ctx.request.post(base+'/api/'+path,{headers:{Origin:base},data}),text=await r.text();assert.equal(r.status(),status,path+': '+text);return JSON.parse(text);};
const get=async(ctx,path,status=200)=>{const r=await ctx.request.get(base+'/api/'+path),text=await r.text();assert.equal(r.status(),status,path+': '+text);return JSON.parse(text);};
const noPP=value=>{for(const [key,item]of Object.entries(value||{})){assert.ok(!['balance','reserved','ledger','dailyCm','contribution','deposits','total_yang'].includes(key),'Private field leaked: '+key);if(item&&typeof item==='object')noPP(item);}};
const profile=()=>get(member,'members/profile?id=preview-member');
const time=()=>Math.floor(Date.now()/1000),create=async title=>{const event=crypto.randomUUID();await post(member,'events/create',{id:event,kind:'PvE',title,starts:time(),location:'Demon Tower',description:'Isolated test fixture'});return event;};
const upload=async event=>{const r=await member.request.post(base+'/api/events/evidence',{headers:{Origin:base},multipart:{eventId:event,screenshot:{name:'proof.png',mimeType:'image/png',buffer:readFileSync(new URL('../public/branding/paragon-emblem.png',import.meta.url))}}});assert.equal(r.status(),200,await r.text());};
try{
 await get(outsider,'members',401);await get(outsider,'members/profile?id=preview-admin',401);
 await post(member,'preview-login',{role:'member'});await post(admin,'preview-login',{role:'admin'});
 const initial=(await get(member,'state')).member.balance,initialAdmin=(await get(admin,'state')).member.balance;
 const listing=await get(member,'members');assert.equal(listing.members.length,80);noPP(listing);const other=await get(member,'members/profile?id=preview-admin');noPP(other);assert.equal(other.editable,false);assert.equal(other.member.name,'YIGO');
 const own=await profile();assert.equal(own.editable,true);
 await post(member,'members/bonuses',{revision:own.revision,bonuses:{half_humans:57.25,max_hp:12000,poison_resistance:32,stun_immunity:1}});let updated=await profile();assert.equal(updated.bonuses.half_humans,57.25);assert.equal(updated.bonuses.max_hp,12000);assert.equal(updated.revision,own.revision+1);
 await post(member,'members/bonuses',{revision:own.revision,bonuses:{half_humans:99}},409);assert.equal((await profile()).bonuses.half_humans,57.25);
 await post(member,'members/bonuses',{revision:updated.revision,memberId:'preview-admin',bonuses:{}},400);assert.deepEqual((await get(member,'members/profile?id=preview-admin')).bonuses,other.bonuses);
 await post(member,'members/bonuses',{revision:updated.revision,bonuses:{made_up:42}},400);await post(member,'members/bonuses',{revision:updated.revision,bonuses:{stun_immunity:3}},400);await post(member,'members/bonuses',{revision:updated.revision,bonuses:{critical_chance:-3}},400);await post(member,'members/bonuses',{revision:updated.revision,bonuses:{half_humans:0.123}},400);
 await post(member,'members/bonuses',{revision:updated.revision,bonuses:{half_humans:0.29,slow_immunity:0}});updated=await profile();assert.equal(updated.bonuses.half_humans,0.29);assert.equal(updated.bonuses.slow_immunity,undefined);
 const group=crypto.randomUUID();const groupBody={id:group,revision:0,name:'Test Strike Team',description:'API test only',memberIds:['preview-member','preview-2']};await post(member,'admin/groups/save',groupBody,403);await post(admin,'admin/groups/save',groupBody);
 let groups=(await get(member,'members')).groups;let saved=groups.find(g=>g.id===group);assert.deepEqual(new Set(saved.member_ids),new Set(groupBody.memberIds));assert.equal((await profile()).member.group_id,group);
 await post(admin,'admin/groups/save',{...groupBody,revision:0,memberIds:[]},409);await post(admin,'admin/groups/save',{...groupBody,revision:saved.revision,memberIds:['missing']},400);await post(admin,'admin/groups/save',{...groupBody,revision:saved.revision,memberIds:['preview-2','preview-2']},400);
 const second=crypto.randomUUID();await post(admin,'admin/groups/save',{id:second,revision:0,name:'Test Support Team',description:'',memberIds:['preview-2']});groups=(await get(member,'members')).groups;assert.equal(groups.find(g=>g.id===group).member_ids.includes('preview-2'),false);assert.equal(groups.find(g=>g.id===group).revision,saved.revision+1);
 await post(admin,'admin/groups/save',{...groupBody,revision:saved.revision},409);
 saved=groups.find(g=>g.id===group);await post(member,'admin/groups/delete',{id:group,revision:saved.revision},403);await post(admin,'admin/groups/delete',{id:group,revision:saved.revision});assert.equal((await profile()).member.group_id,null);assert.equal((await profile()).bonuses.half_humans,0.29);
 for(const phase of ['open','confirming','pending']){
  const event=await create('Cancellation '+phase);
  if(phase!=='open'){await post(member,'events/end',{eventId:event});if(phase==='pending'){await upload(event);await post(member,'events/submit',{eventId:event,attendedMemberIds:[]});}}
  await post(member,'admin/cancel-event',{eventId:event,note:'Denied'},403);
  await post(admin,'admin/cancel-event',{eventId:event,note:'Admin cancelled for test'});
  const detail=await get(member,'events/detail?id='+event);assert.equal(detail.event.phase,'cancelled');assert.equal(detail.event.cancelled_by,'preview-admin');assert.equal(detail.event.cancel_note,'Admin cancelled for test');
  await post(admin,'admin/cancel-event',{eventId:event,note:''},409);await post(admin,'admin/event-review',{eventId:event,decision:'approved',note:''},409);await post(member,'event',{eventId:event,joined:true},409);
 }
 const approved=await create('Already awarded');await post(member,'events/end',{eventId:approved});await upload(approved);await post(member,'events/submit',{eventId:approved,attendedMemberIds:[]});await post(admin,'admin/event-review',{eventId:approved,decision:'approved',note:'Proof matches'});const finalBalance=(await get(member,'state')).member.balance;assert.equal(finalBalance,initial+35);await post(admin,'admin/cancel-event',{eventId:approved,note:''},409);assert.equal((await get(member,'state')).member.balance,finalBalance);assert.equal((await get(admin,'state')).member.balance,initialAdmin);
 await post(admin,'admin/groups/delete',{id:second,revision:1});
 assert.equal((await get(member,'members/profile?id=preview-admin')).bonuses.half_humans,other.bonuses.half_humans);
 console.log('PASS: members-only profiles, exact safe projections without PP, own-only edits, 2-decimal totals above individual item max, boolean immunity, stale-write rollback, admin-only groups, atomic moves/revisions/delete, cancellation in 3 phases with no PP, repeated/finalized cancellation rejection. Isolated local fixtures; no production/Discord writes.');
}finally{await browser.close();}

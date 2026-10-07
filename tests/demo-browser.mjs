import {tmpdir as testTmpdir} from 'node:os';
const testOutputDir=testTmpdir();
import {chromium,request} from 'playwright';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3090';
const a=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}}),b=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,headless:true});
async function post(client,path,data){const response=await client.post('/api/'+path,{data});assert.equal(response.status(),200,path+': '+await response.text());}
const state=async client=>(await client.get('/api/state')).json();
try{
 assert.equal((await a.get('/api/state')).status(),401);assert.equal((await (await a.get('/api/status')).json()).demoReady,true);
 assert.equal((await a.post('/api/demo-login',{data:{role:'leader'},headers:{Origin:'https://example.com'}})).status(),403);
 await post(a,'demo-login',{role:'member'});await post(b,'demo-login',{role:'leader'});
 let member=await state(a),leader=await state(b);assert.equal(member.demo,true);assert.equal(member.member.admin,0);assert.equal(leader.member.admin,1);assert.equal('members' in member,false);assert.equal('bank' in member,false);assert.equal(member.pushReady,false);assert.equal(member.vapidPublicKey,null);
 assert.equal((await a.post('/api/admin/settings',{data:{weekly:500000,rate:20,notice:'Forbidden'}})).status(),403);
 const auction=member.auctions.find(a=>a.current>0);await post(a,'bid',{id:randomUUID(),auctionId:auction.id,amount:auction.current+auction.increment});
 assert.equal((await state(a)).auctions.find(a=>a.id===auction.id).winner,'demo-member');assert.equal((await state(b)).auctions.some(a=>a.id===auction.id),false);
 const event=member.events.find(e=>e.starts>Date.now()/1000);await post(a,'event',{eventId:event.id,joined:true,reminder:30});assert.equal((await state(a)).events.find(e=>e.id===event.id).reminder,30);
 await post(a,'deposit',{id:randomUUID(),kind:'donation',yang:2000000,note:'Demo donation'});await post(a,'demo-login',{role:'leader'});leader=await state(a);assert.equal(leader.member.admin,1);
 const pending=leader.pending.find(d=>d.note==='Demo donation');await post(a,'admin/deposit',{id:pending.id,status:'approved'});
 const past=leader.events.find(e=>e.status==='upcoming'&&e.starts<Date.now()/1000);await post(a,'admin/finalize-event',{id:past.id,status:'completed'});
 await post(a,'admin/auction',{id:randomUUID(),itemId:'moon',upgrade:9,quantity:1,source:'Demon Tower',bonuses:'',minimum:100,increment:10,hours:2});
 await post(a,'admin/event',{id:randomUUID(),title:'Demo raid',type:'PvE',starts:Math.floor(Date.now()/1000)+3600,pp:80,description:'Practice raid'});
 for(const path of ['bank','admin/loan','admin/repayment','admin/paid-expense','admin/bank-import'])assert.equal((await (path==='bank'?a.get('/api/'+path):a.post('/api/'+path,{data:{}}))).status(),404,path);
 assert.equal((await a.post('/api/push/subscribe',{data:{}})).status(),503);
 await post(a,'admin/settings',{weekly:500000,rate:20,notice:'This browser only'});assert.notEqual((await state(b)).settings.notice,'This browser only');
 await post(a,'demo-login',{role:'member'});member=await state(a);assert.ok(member.deposits.some(d=>d.id===pending.id&&d.status==='approved'));assert.ok(member.ledger.some(l=>l.id==='event:'+past.id+':demo-member'));
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  const memberButton=page.getByRole('button',{name:'Try as Guild Member',exact:true}),leaderButton=page.getByRole('button',{name:'Try as Guild Leader',exact:true});await memberButton.waitFor();assert.equal(await page.getByRole('button',{name:'Retry',exact:true}).count(),0);assert.ok(await leaderButton.isVisible());
  const rect=await memberButton.boundingBox();assert.ok(rect.height>=42);await memberButton.hover();const hover=await memberButton.boundingBox();assert.equal(rect.width,hover.width);assert.equal(rect.height,hover.height);
  await memberButton.click();await page.getByRole('navigation',{name:'Guild navigation'}).waitFor();await page.getByText('Member Demo',{exact:true}).waitFor({state:'attached'});assert.equal(await page.getByRole('button',{name:'Administration',exact:true}).count(),0);
  for(const view of ['profile','auctions','events','hall','treasury','admin']){await page.goto(base+'/?view='+view);await page.getByRole('navigation',{name:'Guild navigation'}).waitFor();assert.equal(await page.getByRole('navigation').getByRole('button').count(),3);assert.equal(await page.getByText('Guild Members',{exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:/Manage (Auctions|PP|Events)/}).count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,width+' '+view+' overflow');}
  await page.getByRole('button',{name:'Kael',exact:true}).click();await page.getByRole('button',{name:'Switch to Guild Leader',exact:true}).click();await page.getByText('Leader Demo',{exact:true}).waitFor({state:'attached'});await page.goto(base+'/?view=events');await page.getByRole('button',{name:'Manage Events',exact:true}).click();await page.getByRole('button',{name:'Create Event',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,width+' admin overflow');
  if(width===390)await page.screenshot({path:(testOutputDir+"/paragon-demo-mobile.png"),fullPage:true});
  await page.getByRole('button',{name:'Aether',exact:true}).click();await page.getByRole('button',{name:'Exit Demo',exact:true}).click();await memberButton.waitFor();assert.deepEqual(errors,[]);await context.close();console.log('PASS '+width+'px login buttons, stable hover, member screens, leader switch/admin, demo logout and no overflow/runtime errors.');
 }
 const old=await a.storageState();await post(a,'logout',{});assert.equal((await a.get('/api/state')).status(),401);const replay=await request.newContext({baseURL:base,storageState:old});assert.equal((await replay.get('/api/state')).status(),401);await replay.dispose();console.log('PASS production demo APIs: roles, CSRF, isolated visitors, bids, reminders, deposit approvals, event PP, auction/event creation, removed treasury APIs, no production push/import access and revoked sessions.');
}finally{await browser.close();await a.dispose();await b.dispose();}

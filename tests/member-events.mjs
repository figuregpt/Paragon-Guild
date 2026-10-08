import {tmpdir as testTmpdir} from 'node:os';
const testOutputDir=testTmpdir();
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3095';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
const uuid=()=>crypto.randomUUID(),time=()=>Math.floor(Date.now()/1000);
const context=await browser.newContext();
const call=async(path,body,expected=200)=>{const r=await context.request.post(base+'/api/'+path,{data:body,headers:{Origin:base}});const j=await r.json();assert.equal(r.status(),expected,path+': '+JSON.stringify(j));return j;};
const state=async()=>await (await context.request.get(base+'/api/state')).json();
const detail=async(id)=>await (await context.request.get(base+'/api/events/detail?id='+id)).json();
const role=async(role)=>call('demo-login',{role});
const create=async(kind,title='Test '+kind,starts=time()-10)=>{const id=uuid();await call('events/create',{id,kind,title,...(kind==='Help'?{durationMinutes:45}:{starts}),location:kind==='Demon Tower'?'Demon Tower':kind==='Custom'?'Guild courtyard':'Spider Dungeon 2',...(kind==='Custom'?{pp:41}:{}),description:'Test attendance workflow'});return id;};
const png=readFileSync(new URL('../public/branding/paragon-emblem.png',import.meta.url));
const upload=async(eventId,expected=200)=>{const r=await context.request.post(base+'/api/events/evidence',{headers:{Origin:base},multipart:{eventId,screenshot:{name:'attendance.png',mimeType:'image/png',buffer:png}}});assert.equal(r.status(),expected,await r.text());};
try{
 await role('member');const initial=await state();
 for(const kind of ['Demon Tower','PvE','PvP','Guild War','World Boss','Custom'])await call('events/create',{id:uuid(),kind,title:'Denied '+kind,starts:time(),location:'Demon Tower',...(kind==='Custom'?{pp:10}:{}),description:''},403);
 await call('events/create',{id:uuid(),kind:'Help',title:'Future Help',starts:time()+3600,durationMinutes:60,location:'Demon Tower',description:''},400);
 await call('events/create',{id:uuid(),kind:'Help',title:'Invalid duration',durationMinutes:0,location:'Demon Tower',description:''},400);
 await call('events/create',{id:uuid(),kind:'Help',title:'Invalid map',durationMinutes:30,location:'Not a Map',description:''},400);
 const help=await create('Help','Help for the guild'),second=await create('Help','Second daily Help');
 await call('events/create',{id:uuid(),kind:'Help',title:'Third daily Help',durationMinutes:60,location:'Demon Tower',description:''},409);
 assert.equal((await state()).member.balance,initial.member.balance);
 let created=(await detail(help)).event;assert.ok(Math.abs(created.starts-time())<5);assert.equal(created.duration_minutes,45);assert.equal(created.location,'Spider Dungeon 2');assert.equal((await detail(help)).participants.length,0);await call('event',{eventId:help,joined:true},400);
 await call('events/submit',{eventId:help},409);
 await call('admin/event-review',{eventId:help,decision:'approved',note:''},403);
 await role('leader');await call('events/end',{eventId:help},403);await call('event',{eventId:help,joined:true});
 await role('member');await call('events/end',{eventId:help},400);assert.equal((await detail(help)).event.phase,'open');await upload(help);await call('events/end',{eventId:help});
 await call('events/attendance',{eventId:help,memberId:'demo-member',attended:true},400);await call('events/attendance',{eventId:help,memberId:'demo-leader',attended:true});
 let d=await detail(help);assert.equal(d.evidence.length,1);const proof=d.evidence[0].id;
 await call('events/submit',{eventId:help,attendedMemberIds:['demo-leader','not-a-participant']},400);assert.equal((await detail(help)).event.phase,'confirming');assert.equal((await detail(help)).participants.find(p=>p.member_id==='demo-leader').attended,1);
 await call('events/submit',{eventId:help,attendedMemberIds:['demo-leader','demo-leader']});assert.equal((await state()).member.balance,initial.member.balance);
 await call('events/attendance',{eventId:help,memberId:'demo-leader',attended:false},409);
 await call('event',{eventId:help,joined:false},409);
 await role('leader');await call('admin/finalize-event',{id:help,status:'completed'},409);await call('admin/attendance',{eventId:help,memberId:'demo-leader',attended:true},409);
 assert.equal((await context.request.get(base+'/api/event-evidence/'+proof)).status(),200);
 const leaderInitial=(await state()).member.balance;
 await call('admin/event-review',{eventId:help,decision:'approved',note:'Attendance matches screenshot'});
 await call('admin/event-review',{eventId:help,decision:'approved',note:''},409);
 assert.equal((await state()).member.balance,leaderInitial+10);
 await role('member');const after=await state();assert.equal(after.member.balance,initial.member.balance+10);assert.equal(after.my_events.find(e=>e.id===help).phase,'approved');
 // Cancellation still counts toward the daily limit; no rewards for a rejected event.
 await upload(second);await call('events/end',{eventId:second});await call('events/submit',{eventId:second});
 await role('leader');await call('admin/event-review',{eventId:second,decision:'rejected',note:''},400);await call('admin/event-review',{eventId:second,decision:'rejected',note:'Participation could not be verified'});
 await role('member');assert.equal((await state()).member.balance,initial.member.balance+10);await call('events/create',{id:uuid(),kind:'Help',title:'After rejection',durationMinutes:60,location:'Demon Tower',description:''},409);
 // No daily limit for authorized organizers, fixed rewards cannot be supplied by the client.
 await role('leader');for(const [kind,pp] of [['Demon Tower',10],['PvE',35],['PvP',100],['Guild War',100],['World Boss',75],['Custom',41],['PvE',35]]){const id=await create(kind);assert.equal((await state()).events.find(e=>e.id===id).pp,pp);if(kind==='Custom'){const stored=(await detail(id)).event;await call('events/create',{id,kind,title:'Test Custom',starts:stored.starts,location:'Guild courtyard',description:'Test attendance workflow',pp:41});await call('events/create',{id,kind,title:'Test Custom',starts:stored.starts,location:'Guild courtyard',description:'Test attendance workflow',pp:42},409);}const beforeHost=(await state()).member.balance;await call('event',{eventId:id,joined:true},400);await role('member');const beforeParticipant=(await state()).member.balance;await call('event',{eventId:id,joined:true});await role('leader');await call('events/end',{eventId:id});await call('events/submit',{eventId:id},400);await upload(id);await call('events/attendance',{eventId:id,memberId:'demo-member',attended:true});await call('events/submit',{eventId:id});await call('admin/event-review',{eventId:id,decision:'approved',note:''});assert.equal((await state()).member.balance,beforeHost+pp);await role('member');assert.equal((await state()).member.balance,beforeParticipant+pp);await role('leader');}
 const custom={id:uuid(),kind:'Custom',title:'Custom validation',starts:time()+3600,location:'Guild courtyard',description:''};for(const pp of [undefined,0,-1,1.5,1000001,'41',null])await call('events/create',{...custom,pp},400);for(const location of [' ','x'.repeat(81)])await call('events/create',{...custom,pp:41,location},400);await call('events/create',{...custom,kind:'Demon Tower',location:'Demon Tower'},200);await call('events/end',{eventId:custom.id},409);await call('events/create',{...custom,id:uuid(),kind:'Demon Tower',location:'Arena'},400);await call('events/create',{...custom,id:uuid(),kind:'Demon Tower',location:'Demon Tower',durationMinutes:30},400);await call('events/create',{...custom,id:uuid(),pp:41,ends:time()+7200},400);assert.ok((await state()).ledger.some(l=>l.category==='Custom'&&l.amount===41));
 await call('events/create',{id:uuid(),kind:'Help',title:'Tampered reward',durationMinutes:60,location:'Demon Tower',description:'',pp:999},400);
 // Spreadsheet-backed weekly quest is read-only and credits once per week.
 await role('member');const contributionState=await state();assert.equal(contributionState.contribution.weekly_yang,500000);assert.equal(contributionState.contribution.total_yang,1500000);assert.equal(contributionState.ledger.filter(l=>l.id.startsWith('weekly:')).length,1);
 await call('deposit',{id:uuid(),kind:'weekly',yang:500000,note:'GuildBanker Ch-3'},409);
 assert.equal((await state()).member.balance,contributionState.member.balance);
 console.log('PASS API: daily Help quota, role gates, owner-only ending, screenshot requirement, locked attendance, creator and participant PP for seven types including Custom; custom PP validation and retry integrity; Demon Tower future-start/manual-end validation, instant Help start and duration, validated locations, rejection, fixed rewards and automatic weekly contributions.');
 for(const width of [320,390,1440]){const page=await context.newPage();await page.setViewportSize({width,height:900});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const view of ['home','auctions','profile','events']){await page.goto(base+'/?view='+view);await page.getByRole('navigation').waitFor();assert.equal(await page.getByRole('navigation').getByRole('button').count(),4);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,width+' '+view+' overflow');if(view==='home'){await page.getByText('Quest Completed',{exact:true}).waitFor();await page.screenshot({path:testOutputDir+'/paragon-home-'+width+'.png',fullPage:true});}}
 await page.goto(base+'/?view=events&event='+help);await page.getByRole('dialog').getByRole('heading',{name:'Help for the guild',exact:true}).waitFor();await page.getByRole('dialog').getByText('Approved',{exact:true}).waitFor();await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.deepEqual(errors,[]);await page.close();console.log('PASS '+width+'px: 4 destinations, completed weekly quest, personal history and accessible event details.');}
 // Another isolated demo cannot retrieve private evidence.
 const stranger=await browser.newContext();await stranger.request.post(base+'/api/demo-login',{data:{role:'member'},headers:{Origin:base}});assert.equal((await stranger.request.get(base+'/api/event-evidence/'+proof)).status(),404);await stranger.close();
}finally{await context.close();await browser.close();}

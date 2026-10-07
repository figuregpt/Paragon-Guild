import {tmpdir as testTmpdir} from 'node:os';
const testOutputDir=testTmpdir();
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3104';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 const post=async(path,data)=>{const r=await context.request.post(base+'/api/'+path,{headers:{Origin:base,Connection:'close'},data});assert.equal(r.status(),200,await r.text());};
 await post('demo-login',{role:'member'});const id=crypto.randomUUID();await post('events/create',{id,title:'Attendance Layout Test',kind:'Help',durationMinutes:60,location:'Demon Tower',description:''});
 const proof=await context.request.post(base+'/api/events/evidence',{headers:{Origin:base},multipart:{eventId:id,screenshot:{name:'proof.png',mimeType:'image/png',buffer:readFileSync(new URL('../public/branding/paragon-emblem.png',import.meta.url))}}});assert.equal(proof.status(),200);await post('events/end',{eventId:id});
 // Render a 15-person fixture against the real detail/evidence response. API persistence is tested separately.
 const participants=Array.from({length:15},(_,index)=>({member_id:'test-layout-'+index,name:'Test '+['Warrior','Ninja','Sura','Shaman'][index%4]+' '+(index+1),class:['Warrior','Ninja','Sura','Shaman'][index%4],joined:1,attended:0}));
 let phase='confirming',saveCount=0,lastBody,individualWrites=0;
 await page.route('**/api/events/detail?*',async route=>{const response=await route.fetch();const detail=await response.json();detail.participants=participants;detail.event.phase=phase;await route.fulfill({response,json:detail});});
 await page.route('**/api/events/attendance',async route=>{individualWrites++;await route.continue();});
 await page.route('**/api/events/submit',async route=>{saveCount++;lastBody=route.request().postDataJSON();await new Promise(resolve=>setTimeout(resolve,600));if(saveCount===1)await route.fulfill({status:503,json:{error:'Temporary test interruption. Try again.'}});else{phase='pending';await route.fulfill({status:200,json:{ok:true}});}});
 await page.goto(base+'/?view=events&event='+id);const dialog=page.getByRole('dialog'),all=dialog.getByRole('button',{name:'Select All',exact:true});await all.waitFor();
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:width<700?844:1000});await all.click();assert.equal(await dialog.getByRole('checkbox',{checked:true}).count(),15);assert.equal(await dialog.getByRole('checkbox').first().isEnabled(),true);
  await dialog.getByRole('button',{name:'Clear All',exact:true}).click();assert.equal(await dialog.getByRole('checkbox',{checked:true}).count(),0);
  await dialog.getByRole('checkbox').first().press('Space');assert.equal(await dialog.getByRole('checkbox',{checked:true}).count(),1);await all.click();await dialog.getByRole('checkbox').last().uncheck();assert.equal(await dialog.getByRole('checkbox',{checked:true}).count(),14);
  assert.equal(individualWrites,0);assert.equal(saveCount,0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const submit=dialog.getByRole('button',{name:'Submit for Approval',exact:true}),rect=await submit.boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=(width<700?844:1000));
  await dialog.locator('.pg-event-dialog-body').evaluate(element=>element.scrollTop=element.scrollHeight);const after=await submit.boundingBox();assert.deepEqual(after,rect);
  await page.screenshot({path:(testOutputDir+"/paragon-attendance-15-")+width+'.png',fullPage:true});
  await dialog.getByRole('checkbox').first().uncheck();
 }
 await dialog.getByRole('button',{name:'Submit for Approval',exact:true}).click();await dialog.getByText('Temporary test interruption. Try again.',{exact:true}).waitFor();assert.equal(await dialog.getByRole('checkbox',{checked:true}).count(),13);assert.equal(individualWrites,0);
 await dialog.getByRole('button',{name:'Submit for Approval',exact:true}).click();await dialog.getByText('Awaiting Approval',{exact:true}).waitFor();assert.equal(lastBody.eventId,id);assert.equal(lastBody.attendedMemberIds.length,13);assert.equal(saveCount,2);assert.deepEqual(errors,[]);
 console.log('PASS 15-person UI: immediate checkbox/keyboard and select-all/clear-all, no per-selection requests, fixed visible submit footer, 320/390/1440px layouts, preserved selection after failure and one batch on submit.');
}finally{await context.close();await browser.close();}

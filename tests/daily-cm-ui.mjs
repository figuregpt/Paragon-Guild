import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3190';assert.equal(new URL(base).hostname,'127.0.0.1');
const dictionary=JSON.parse(readFileSync('lib/translations.json','utf8'));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
try{
 const anonymous=await browser.newContext();assert.equal((await anonymous.request.get(base+'/api/daily-cm')).status(),401);await anonymous.close();
 for(const language of ['en','tr','el'])for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},timezoneId:'America/New_York'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.request.post(base+'/api/demo-login',{headers:{Origin:base},data:{role:'member'}});
  const state=await(await context.request.get(base+'/api/state')).json(),a=await(await context.request.get(base+'/api/daily-cm')).json();
  assert.equal(a.cents,state.dailyCm.cents);const second=await(await context.request.get(base+'/api/daily-cm?memberId=someone-else&time=0')).json();assert.equal(second.cents,a.cents);assert.equal(second.period,a.period);assert.match((await context.request.get(base+'/api/daily-cm')).headers()['cache-control'],/no-store/);
  const snapshot=await(await context.request.get(base+'/api/state')).json();assert.equal(snapshot.member.balance,state.member.balance);assert.equal(snapshot.member.reserved,state.member.reserved);assert.deepEqual(snapshot.ledger,state.ledger);
  await page.goto(base);await page.locator('.pg-pp-meme').waitFor();await page.locator('select[name=language]').selectOption(language);
  const formatted=n=>new Intl.NumberFormat(language==='en'?'en-GB':language==='tr'?'tr-TR':'el-GR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100)+' cm';
  assert.equal(await page.locator('.pg-pp-meme > span').first().innerText(),formatted(a.cents));await page.reload();await page.locator('.pg-pp-meme').waitFor();assert.equal(await page.locator('.pg-pp-meme > span').first().innerText(),formatted(a.cents));assert.ok(await page.locator('.pg-cm-reset').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  // Pause the browser clock and simulate the daily boundary. No server clock or real account is changed.
  const start=Date.now(),first={cents:1462,period:'test-day-1',generatedAt:start,resetsAt:start+1000};let current=first,calls=0;
  await page.clock.install({time:new Date(start)});await page.clock.pauseAt(new Date(start));
  await page.route('**/api/state',route=>route.fulfill({json:{...state,member:{...state.member,balance:987654},dailyCm:current}}));
  await page.route('**/api/daily-cm',async route=>{
   calls++;if(calls===1)return route.fulfill({status:503,json:{error:'Temporary test failure'}});
   current={cents:6284,period:'test-day-2',generatedAt:start+16000,resetsAt:start+86401000};return route.fulfill({json:current});
  });
  await page.reload();await page.locator('.pg-pp-meme').waitFor();assert.equal(await page.locator('.pg-pp-meme > span').first().innerText(),formatted(1462),'Changed PP balance must not affect CM');
  await page.clock.runFor(1100);await page.waitForFunction(()=>document.querySelector('.pg-pp-meme > span')?.textContent.includes('…'));
  assert.equal(calls,1);const refresh=language==='en'?'Refreshing…':dictionary['Refreshing…'][language];assert.equal(await page.locator('.pg-pp-meme > span').first().innerText(),refresh);
  await page.clock.runFor(15000);await page.waitForFunction(text=>document.querySelector('.pg-pp-meme > span')?.textContent===text,formatted(6284));assert.equal(calls,2);
  if(width===390&&language==='en')await page.screenshot({path:'/private/tmp/paragon-daily-cm-390.png'});
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${language} ${width}px: stable server value/reloads, two decimals, PP independence, automatic boundary refresh and failed-request retry.`);
 }
 // A second isolated browser with the same demo member identity sees the same daily roll.
 const one=await browser.newContext(),two=await browser.newContext();for(const c of [one,two])await c.request.post(base+'/api/demo-login',{headers:{Origin:base},data:{role:'member'}});
 const a=await(await one.request.get(base+'/api/daily-cm')).json(),b=await(await two.request.get(base+'/api/daily-cm')).json();assert.equal(a.cents,b.cents);assert.equal(a.period,b.period);await one.close();await two.close();
 console.log('PASS authenticated read-only endpoint, ignored forged member/time parameters, unchanged financial data and cross-device consistency.');
}finally{await browser.close();}

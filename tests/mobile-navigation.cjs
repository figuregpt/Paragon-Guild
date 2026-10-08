const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3190';
assert.equal(new URL(base).hostname,'127.0.0.1','Use isolated local demo data only');
const dictionary=JSON.parse(readFileSync('lib/translations.json','utf8'));
const css=readFileSync('app/paragon.css','utf8');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
 try{
 for(const width of [320,390,430])for(const language of ['en','tr','el']){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.request.post(base+'/api/demo-login',{headers:{Origin:base},data:{role:'member'}});
  await page.goto(base);await page.locator('.pg-nav').waitFor();
  assert.match(await page.locator('meta[name=viewport]').getAttribute('content'),/viewport-fit=cover/);
  await page.locator('select[name=language]').selectOption(language);
  await page.waitForFunction(lang=>document.documentElement.lang===lang,language);
  const nav=page.locator('.pg-nav'),buttons=nav.locator('button');assert.equal(await buttons.count(),4);
  for(const [index,view] of ['home','auctions','events','profile'].entries()){
   await buttons.nth(index).tap();await page.waitForFunction(view=>new URL(location.href).searchParams.get('view')===view,view);
   assert.equal(await buttons.nth(index).getAttribute('aria-current'),'page');
   const before=await buttons.nth(index).boundingBox();
   await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();
   const pressed=await buttons.nth(index).boundingBox();assert.deepEqual(pressed,before,'Press must not shrink or move a tab');await page.mouse.up();
   const box=await nav.boundingBox();assert.ok(box.x>=12&&width-box.x-box.width>=12);assert.ok(844-box.y-box.height>=12);
   for(const button of await buttons.all()){
    const b=await button.boundingBox();assert.ok(b.width>=44&&b.height>=52,'Comfortable tap targets');
    assert.ok(b.x>=box.x+6&&b.x+b.width<=box.x+box.width-6,'Tabs stay inside rounded edges');
    assert.equal(await button.evaluate(e=>e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight),true,'Localized label must fit');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
   const help=page.locator('footer a[href="/how-to-use"]');await help.waitFor();
   const h=await help.boundingBox(),n=await nav.boundingBox();assert.ok(h.y+h.height<n.y,'Help link stays above the floating menu');
  }
  // Exercise the actual CSS formulas with iPhone-style safe insets, since Chromium reports zero env insets.
  const safeCss=css.replace(/env\(safe-area-inset-bottom(?:,0px)?\)/g,'34px').replace(/env\(safe-area-inset-left(?:,0px)?\)/g,'20px').replace(/env\(safe-area-inset-right(?:,0px)?\)/g,'20px');
  const injected=await page.addStyleTag({content:safeCss});
  const safe=await nav.boundingBox();assert.ok(Math.abs(844-safe.y-safe.height-46)<1);assert.ok(safe.x>=20&&width-safe.x-safe.width>=20);
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));const h=await page.locator('footer a[href="/how-to-use"]').boundingBox();assert.ok(h.y+h.height<safe.y);
  if(width===390&&language==='en'){await page.waitForTimeout(250);await page.screenshot({path:'/private/tmp/paragon-mobile-nav-safe.png'});}
  await injected.evaluate(e=>e.remove());
  await buttons.last().focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal(await buttons.last().evaluate(e=>e===document.activeElement),true);assert.equal(await buttons.last().evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
  if(width===390&&language==='en')await page.screenshot({path:'/private/tmp/paragon-mobile-nav.png'});
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${language} ${width}px: all tabs, stable presses, touch targets, safe area and unobscured help link.`);
 }
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 await context.request.post(base+'/api/demo-login',{headers:{Origin:base},data:{role:'member'}});await page.goto(base);await page.locator('.pg-nav').waitFor();
 assert.equal(await page.locator('.pg-nav').evaluate(e=>getComputedStyle(e).position),'static');
 await page.screenshot({path:'/private/tmp/paragon-desktop-nav.png'});await context.close();
 const anon=await browser.newContext(),entry=await anon.newPage();await entry.goto(base);await entry.locator('.pg-login').waitFor();assert.equal(await entry.locator('.pg-nav').count(),0);await anon.close();
 console.log('PASS desktop navigation preserved; signed-out entry has no floating menu.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

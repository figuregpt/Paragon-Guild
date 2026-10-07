import {tmpdir as testTmpdir} from 'node:os';
const testOutputDir=testTmpdir();
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3090';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,headless:true});
async function geometry(button,page){await button.scrollIntoViewIfNeeded();const normal=await button.boundingBox();await button.hover();const hover=await button.boundingBox();await page.mouse.down();const press=await button.boundingBox();await page.mouse.up();for(const state of [hover,press]){assert.equal(state.width,normal.width);assert.equal(state.height,normal.height);assert.equal(state.x,normal.x);assert.equal(state.y,normal.y);}}
try{
 for(const width of [320,390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.getByRole('button',{name:'Try as Guild Leader',exact:true}).waitFor();
 assert.equal(await page.locator('.pg-login-brand img').evaluate(i=>i.complete&&i.naturalWidth===1254),true);
 if(width===390||width===1440)await page.screenshot({path:`${testOutputDir}/paragon-crimson-login-${width}.png`,fullPage:true});
 await geometry(page.getByRole('button',{name:'Try as Guild Leader',exact:true}),page);await page.getByRole('navigation').waitFor();
 for(const view of ['auctions','profile','events']){
 await page.goto(base+'/?view='+view);await page.getByRole('navigation').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${view} overflow`);
 assert.equal(await page.locator('.pg-crest').evaluate(i=>i.complete&&i.naturalWidth===1254),true);
 assert.equal(await page.getByRole('navigation').locator('svg,img').count(),0);
 for(const button of await page.getByRole('navigation').getByRole('button').all()){const box=await button.boundingBox();assert.ok(box.height>=44);await button.focus();assert.equal(await button.evaluate(el=>el===document.activeElement),true);}
 const nav=await page.getByRole('navigation').boundingBox();assert.equal(nav.y+nav.height<=1000,true);if(width<=700)assert.equal(Math.round(nav.y+nav.height),1000);
 const primary=page.locator('.pg-main .pg-red:visible').first();if(await primary.count()){await geometry(primary,page);const d=page.getByRole('dialog');if(await d.isVisible())await d.getByRole('button',{name:'Close',exact:true}).click();}
 await page.evaluate(()=>scrollTo(0,0));if(width===390||width===1440)await page.screenshot({path:`${testOutputDir}/paragon-crimson-${view}-${width}.png`,fullPage:true});
 }
 await page.goto(base+'/?view=auctions');await page.getByRole('button',{name:'Inspect Dragon God Armour+0',exact:true}).click();await page.locator('.pg-item-tooltip h3').getByText('Dragon God Armour+0',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Place Bid',exact:true}).count(),1);
 const history=page.locator('.pg-bid-history>summary');await history.focus();await history.press('Enter');await page.getByText('No bids have been placed.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Inspect Poison Sword+0',exact:true}).click();await page.locator('.pg-bid-history>summary').click();await page.getByRole('region',{name:'Guild bid history'}).waitFor();await page.getByRole('region',{name:'Guild bid history'}).getByText('Ragnar',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Place Bid',exact:true}).click();await geometry(page.getByRole('dialog').getByRole('button',{name:'Confirm Bid',exact:true}),page);await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}px: approved logo, stable pointer geometry, all views, bottom navigation, item selection, bid history and bid dialog.`);
 }
 const ctx=await browser.newContext(),page=await ctx.newPage();await page.goto(base);const manifest=await (await ctx.request.get(base+'/manifest.webmanifest')).json();assert.equal(manifest.theme_color,'#0b0d11');assert.equal(manifest.icons.some(i=>i.src.includes('paragon-emblem')),true);const logo=await (await ctx.request.get(base+'/branding/paragon-emblem.png')).body();assert.deepEqual(logo,readFileSync(new URL('../public/branding/paragon-emblem.png',import.meta.url)));
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await ctx.setOffline(true);await page.goto(base+'/offline-check');await page.getByRole('heading',{name:'PARAGON',exact:true}).waitFor();assert.equal(await page.locator('img').evaluate(i=>i.complete&&i.naturalWidth===1254),true);assert.equal(await page.evaluate(async()=>{const cache=await caches.open('paragon-static-v3');return (await cache.keys()).some(r=>new URL(r.url).pathname.startsWith('/api/'));}),false);await ctx.close();console.log('PASS unchanged logo bytes, PWA branding and offline fallback without private API caching.');
}finally{await browser.close();}

import {chromium,request} from 'playwright';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173',api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});await api.post('/api/preview-login',{data:{role:'admin'}});const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,headless:true});
try {for(const width of [320,390,768,1440]){
const c=await browser.newContext({storageState:await api.storageState(),viewport:{width,height:900},isMobile:width<560,hasTouch:width<560}),p=await c.newPage();await p.goto(base+'/?view=auctions');await p.getByRole('navigation').waitFor();
const read=async b=>b.evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return [r.width,r.height,s.minHeight,s.borderWidth,s.borderImageWidth,s.borderImageSlice,s.borderImageSource,s.backgroundSize,s.backgroundImage,s.boxShadow,s.transform,s.filter,s.padding]});
async function check(b,name){await b.scrollIntoViewIfNeeded();await p.mouse.move(0,0);const normal=await read(b);await b.hover();assert.deepEqual(await read(b),normal,name+' hover');await p.mouse.down();assert.deepEqual(await read(b),normal,name+' pressed');await p.mouse.move(0,0);await p.mouse.up();}
for(const name of ['Place Bid','View PP History','Aether'])await check(p.getByRole('button',{name,exact:true}),name);
await p.getByRole('button',{name:'Place Bid',exact:true}).click();await p.locator('dialog[open]').waitFor();for(const name of ['Confirm Bid','Close'])await check(p.locator('dialog').getByRole('button',{name,exact:true}),name);await p.locator('dialog').getByRole('button',{name:'Close',exact:true}).click();
console.log('PASS '+width+'px: normal, hover and pressed geometry/native skin match for primary, secondary, account and dialog buttons.');await c.close();}
}finally {await browser.close();await api.dispose();}

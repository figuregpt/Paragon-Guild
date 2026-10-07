import {tmpdir as testTmpdir} from 'node:os';
const testOutputDir=testTmpdir();
import {chromium,request} from 'playwright';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3103';
const a=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base,Connection:'close'}}),other=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base,Connection:'close'}});
const png=readFileSync(new URL('../public/branding/paragon-emblem.png',import.meta.url));
const file={name:'item-screenshot.png',mimeType:'image/png',buffer:png};
const fields=(id=randomUUID())=>({id,name:'Poison Sword +9',quantity:'1',source:'Demon Tower',bonuses:'10% Critical Hit',minimum:'100',increment:'10',hours:'2',screenshot:file});
const state=async(client=a)=>(await client.get('/api/state')).json();
async function role(value,client=a){assert.equal((await client.post('/api/demo-login',{data:{role:value}})).status(),200);}
async function auction(data,status=200,client=a){const response=await client.post('/api/admin/auction',{multipart:data});assert.equal(response.status(),status,await response.text());}
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
try{
 await role('member');const initial=await state();assert.equal('items' in initial,false);await auction(fields(),403);assert.equal((await a.post('/api/admin/cancel-auction',{data:{id:initial.auctions[0].id}})).status(),403);
 await role('leader');const missing=fields();delete missing.screenshot;await auction(missing,400);
 await auction({...fields(),screenshot:{name:'fake.png',mimeType:'image/png',buffer:Buffer.from('<svg onload="alert(1)">'+'.'.repeat(100)+'</svg>')}},400);
 await auction({...fields(),screenshot:{...file,mimeType:'image/jpeg'}},400);
 await auction({...fields(),screenshot:{...file,buffer:Buffer.alloc(8000001)}},400);
 for(const patch of [{name:' '},{hours:'169'},{minimum:'0'},{increment:'0'},{quantity:'0'}])await auction({...fields(),...patch},400);
 for(const path of ['admin/item','admin/catalogue'])assert.equal((await a.post('/api/'+path,{data:{}})).status(),404);
 assert.equal((await a.post('/api/admin/auction',{data:{id:randomUUID(),itemId:'moon'}})).status(),400);
 const input=fields();await Promise.all([auction(input),auction(input)]);await auction(input);await auction({...input,name:'Different Item'},409);
 const after=await state(),item=after.auctions.find(v=>v.id===input.id);assert.equal(after.auctions.filter(v=>v.id===input.id).length,1);assert.equal(item.name,input.name);assert.equal(item.ends-item.starts,7200);assert.equal(item.height,1);assert.equal(item.classes,'');assert.equal(item.icon.startsWith('/api/images/'),true);
 const image=await a.get(item.icon);assert.equal(image.status(),200);assert.equal(image.headers()['content-type'],'image/png');assert.deepEqual(await image.body(),png);assert.ok(image.headers()['content-security-policy'].includes('sandbox'));
 await role('member',other);assert.equal((await other.get(item.icon)).status(),404);
 await role('member');await auction(fields(),403);assert.equal((await a.post('/api/bid',{data:{id:randomUUID(),auctionId:input.id,amount:100}})).status(),200);const reserved=await state();assert.equal(reserved.auctions.find(v=>v.id===input.id).winner,reserved.member.id);assert.equal(reserved.member.reserved,initial.member.reserved+100);
 await role('leader');assert.equal((await a.post('/api/admin/cancel-auction',{data:{id:input.id}})).status(),200);await role('member');assert.equal((await state()).member.reserved,initial.member.reserved);
 console.log('PASS API: member permissions, required screenshot, MIME/signature/size and bid-setting validation, catalogue removal, atomic concurrent retries, protected screenshots, demo isolation, bidding and reservation refund.');
 const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByRole('button',{name:'Try as Guild Leader',exact:true}).click();await page.getByRole('navigation',{name:'Guild navigation'}).waitFor();await page.getByRole('button',{name:'Auction House',exact:true}).click();await page.getByRole('button',{name:'Manage Auctions',exact:true}).click();
 assert.equal(await page.getByText('Item Catalogue',{exact:true}).count(),0);assert.equal(await page.locator('.pg-status').count(),0);assert.equal(await page.getByLabel('Loot Item',{exact:true}).count(),0);
 await page.getByLabel('Item Name',{exact:true}).fill('Screenshot Auction UI');await page.getByLabel('Item Screenshot',{exact:true}).setInputFiles({name:'item.png',mimeType:'image/png',buffer:png});await page.getByAltText('Selected item screenshot').waitFor();
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:1100});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const button=page.getByRole('button',{name:'Start Auction',exact:true});await button.scrollIntoViewIfNeeded();const before=await button.boundingBox();await button.hover();assert.deepEqual(await button.boundingBox(),before);await page.screenshot({path:(testOutputDir+"/paragon-screenshot-create-")+width+'.png',fullPage:true});}
 await page.getByRole('button',{name:'Start Auction',exact:true}).click();await page.getByText('Auction started.',{exact:true}).waitFor();assert.equal(await page.getByAltText('Selected item screenshot').count(),0);await page.getByRole('button',{name:'View Auctions',exact:true}).click();await page.getByRole('button',{name:'Inspect Screenshot Auction UI',exact:true}).click();await page.getByRole('link',{name:'View full screenshot of Screenshot Auction UI',exact:true}).waitFor();
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:1100});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const image=page.getByAltText('Screenshot Auction UI screenshot');assert.equal(await image.evaluate(v=>v.complete&&v.naturalWidth>0),true);assert.equal(await image.evaluate(v=>getComputedStyle(v).imageRendering),'auto');await page.screenshot({path:(testOutputDir+"/paragon-screenshot-detail-")+width+'.png',fullPage:true});}
 const account=(await (await context.request.get(base+'/api/state')).json()).member.name;await page.getByRole('button',{name:account,exact:true}).click();await page.getByRole('button',{name:'Switch to Guild Member',exact:true}).click();await page.getByRole('button',{name:'Manage Auctions',exact:true}).waitFor({state:'hidden'});assert.equal(await page.locator('.pg-status').count(),0);assert.deepEqual(errors,[]);await context.close();
 console.log('PASS UI: screenshot preview, create/reset, full screenshot, member controls, stable buttons and no overflow at 320/390/1440px.');
}finally{await browser.close();await a.dispose();await other.dispose();}

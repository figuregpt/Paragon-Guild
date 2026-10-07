import {request} from 'playwright';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3107';
if(!/^http:\/\/127\.0\.0\.1:/.test(base))throw new Error('Settlement time control is restricted to local isolated demos.');
const api=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base,Connection:'close'}});
const uuid=()=>crypto.randomUUID();
async function post(path,data,status=200){const r=await api.post('/api/'+path,{data});assert.equal(r.status(),status,path+': '+await r.text());return r.json();}
const role=async(role)=>post('demo-login',{role}),state=async()=>(await api.get('/api/state')).json();
const balances=async(member)=>{await role(member);return (await state()).member;};
const screenshot={name:'item.png',mimeType:'image/png',buffer:readFileSync(new URL('../public/branding/paragon-emblem.png',import.meta.url))};
async function auction(){await role('leader');const id=uuid(),r=await api.post('/api/admin/auction',{multipart:{id,name:'Financial Test '+id.slice(0,5),quantity:'1',source:'Demon Tower',bonuses:'',minimum:'100',increment:'10',hours:'1',screenshot}});assert.equal(r.status(),200,await r.text());return id;}
function expire(auctionId){let found=false;for(const name of readdirSync(tmpdir()).filter(s=>s.startsWith('paragon-demo-'))){let db;try{db=new DatabaseSync(tmpdir()+'/'+name+'/demo.sqlite');if(db.prepare('SELECT id FROM auctions WHERE id=?').get(auctionId)){assert.ok(db.prepare("SELECT id FROM members WHERE id='demo-member'").get());db.prepare("UPDATE auctions SET starts=unixepoch()-300,ends=unixepoch()-1 WHERE id=? AND status='active'").run(auctionId);found=true;break;}}catch{}finally{db?.close();}}assert.ok(found,'Only the isolated local demo auction was expired');}
try{
 await role('member');const memberInitial=(await state()).member;await role('leader');const leaderInitial=(await state()).member;
 const one=await auction(),two=await auction(),three=await auction(),empty=await auction();
 await role('member');const first={id:uuid(),auctionId:one,amount:100};await post('bid',first);await post('bid',first);await post('bid',{...first,amount:110},409);let m=(await state()).member;assert.equal(m.balance,memberInitial.balance);assert.equal(m.reserved,memberInitial.reserved+100);
 await role('leader');await post('bid',{id:uuid(),auctionId:one,amount:110});let l=(await state()).member;assert.equal(l.balance,leaderInitial.balance);assert.equal(l.reserved,leaderInitial.reserved+110);m=await balances('member');assert.equal(m.reserved,memberInitial.reserved);
 await post('bid',{id:uuid(),auctionId:one,amount:130});m=(await state()).member;assert.equal(m.reserved,memberInitial.reserved+130);l=await balances('leader');assert.equal(l.reserved,leaderInitial.reserved);
 await role('member');await post('bid',{id:uuid(),auctionId:one,amount:160});await post('bid',{id:uuid(),auctionId:one,amount:165},409);assert.equal((await state()).member.reserved,memberInitial.reserved+160);
 const secondAmount=Math.floor((memberInitial.balance-memberInitial.reserved-160)/10)*10;await post('bid',{id:uuid(),auctionId:two,amount:secondAmount});await post('bid',{id:uuid(),auctionId:three,amount:100},409);
 const concurrent=await Promise.all([api.post('/api/bid',{data:{id:uuid(),auctionId:one,amount:170}}),api.post('/api/bid',{data:{id:uuid(),auctionId:one,amount:170}})]);assert.ok(concurrent.every(r=>r.status()===409));assert.equal((await state()).member.balance,memberInitial.balance);
 await role('leader');await post('admin/cancel-auction',{id:two});await post('admin/cancel-auction',{id:two},409);m=await balances('member');assert.equal(m.reserved,memberInitial.reserved+160);assert.equal(m.balance,memberInitial.balance);
 expire(one);await role('leader');const settled=await state();assert.equal(settled.auctions.find(a=>a.id===one).status,'closed');assert.equal(settled.member.balance,leaderInitial.balance);assert.equal(settled.member.reserved,leaderInitial.reserved);
 m=await balances('member');assert.equal(m.balance,memberInitial.balance-160);assert.equal(m.reserved,memberInitial.reserved);assert.equal((await state()).ledger.filter(l=>l.id==='auction:'+one).length,1);await state();await state();assert.equal((await state()).member.balance,memberInitial.balance-160);await post('bid',{id:uuid(),auctionId:one,amount:180},409);
 expire(empty);assert.equal((await state()).auctions.find(a=>a.id===empty).status,'closed');assert.equal((await state()).member.balance,memberInitial.balance-160);await role('leader');await post('admin/cancel-auction',{id:three});
 console.log('PASS full auction finance API: join/bid, own raise replaces reservation, outbid releases previous PP, increments, duplicate IDs, multi-auction budget, simultaneous insufficient bids, cancellation refunds, expiry settles once, only winner pays 160 PP, loser/empty-auction balances unchanged, ended bids rejected. All data was isolated demo data.');
}finally{await api.dispose();}

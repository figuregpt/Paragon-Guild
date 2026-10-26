import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),catalog=JSON.parse(readFileSync(new URL('lib/guide-loot.json',root),'utf8'));
const {items,chests}=catalog,counts=[29,23,31,29,32,30];
assert.equal(chests.length,6);assert.equal(new Set(chests.map(c=>c.id)).size,6);
function icon(value){
 assert.ok(value.src.startsWith('/guide/loot/'));assert.ok(existsSync(new URL('public'+value.src,root)),value.src);
 if(value.sheetWidth){
  for(const field of ['sheetWidth','sheetHeight','width','height'])assert.ok(Number.isFinite(value[field])&&value[field]>0);
  assert.ok(value.x>=0&&value.y>=0);assert.ok(value.x+value.width<=value.sheetWidth);assert.ok(value.y+value.height<=value.sheetHeight);
 }
}
const used=new Set(),numbers=new Set();
for(const item of Object.values(items)){
 assert.equal(items[item.id],item);assert.ok(item.name);assert.ok(['Weapons','Armours','Accessories','Materials','Utility','Unconfirmed'].includes(item.category));icon(item.icon);
 if(item.status==='unconfirmed'){assert.ok(Number.isInteger(item.questionNumber));assert.ok(!numbers.has(item.questionNumber));numbers.add(item.questionNumber);assert.equal(item.category,'Unconfirmed');assert.ok(item.icon.sheetWidth,'Unknown items must retain the actual reference icon.');}
 else assert.equal(item.status,'identified');
}
for(const [index,chest]of chests.entries()){
 assert.equal(chest.entries.length,counts[index]);icon(chest.icon);const seen=new Set();
 for(const entry of chest.entries){assert.ok(items[entry.item],entry.item);used.add(entry.item);if(entry.quantity!==undefined)assert.ok(Number.isInteger(entry.quantity)&&entry.quantity>0);if(entry.quantities){assert.ok(entry.quantities.length>1);assert.deepEqual(entry.quantities,[...new Set(entry.quantities)].sort((a,b)=>a-b));for(const q of entry.quantities)assert.ok(Number.isInteger(q)&&q>0);}const key=entry.item+':'+(entry.quantity??'unknown');assert.ok(!seen.has(key),'Duplicate entry '+key);seen.add(key);}
}
assert.equal(used.size,Object.keys(items).length,'No unused or invented catalog entries.');
assert.equal(chests.find(c=>c.id==='grim-reaper-chest').aliases.includes('Lusifer Sandığı'),true);
assert.equal(chests.find(c=>c.id==='flame-king-chest').bossId,'flame-king');assert.equal(chests.find(c=>c.id==='giant-red-tree-chest').bossId,'giant-red-tree-ghost');
assert.equal(chests.find(c=>c.id==='yellow-tiger-chest').bossId,'yellow-tiger','Keep Yellow Tiger separate from Ember Tiger.');
assert.equal(chests.reduce((n,c)=>n+c.referenceEntryCount,0),176);assert.equal(chests.reduce((n,c)=>n+c.entries.length,0),174);
for(const chestId of ['giant-red-tree-chest','grim-reaper-chest'])assert.deepEqual(chests.find(c=>c.id===chestId).entries.find(e=>e.item==='reinforce-core').quantities,[1,2]);
assert.equal(Object.keys(items).length,77);assert.equal(Object.values(items).filter(i=>i.status==='unconfirmed').length,0);assert.equal(items['enchant-fragment'].englishNamePending,true);assert.equal(chests.find(c=>c.id==='yellow-tiger-chest').entries.find(e=>e.item==='ghost-mask-sallet').quantity,undefined);
for(const chest of chests)for(const entry of chest.entries)if(entry.item==='boss-summoning-medal')assert.ok(entry.summonsBoss);
assert.ok(!JSON.stringify(catalog).includes('dropChance'),'No made-up drop probabilities.');
const dict=JSON.parse(readFileSync(new URL('lib/translations.json',root),'utf8')),ui=readFileSync(new URL('app/guide-chests.tsx',root),'utf8');
for(const item of Object.values(items))for(const language of ['tr','el'])assert.ok(dict[item.name]?.[language]&&dict[item.name][language]!==item.name,item.name+' '+language);
for(const [,key]of ui.matchAll(/\bt\('([^']+)'/g))for(const language of ['tr','el'])assert.ok(dict[key]?.[language],'Missing '+language+': '+key);
console.log('PASS: six unique chests, 176 reference entries grouped into 174 chest items, 77 named items, core quantities 1/2 grouped, boss-specific summoning medals, no invented helmet stack count, valid assets and three-language names; only the exact English Enchant Fragment label remains tentative.');

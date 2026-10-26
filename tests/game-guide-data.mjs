import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../lib/game-guide.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {guideBosses,guideMaps,guideBoss}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert.equal(guideMaps.length,4);assert.equal(guideBosses.length,9);
assert.equal(new Set(guideBosses.map(b=>b.id)).size,9);
for(const map of guideMaps)assert.ok(existsSync(new URL('../public'+map.image,import.meta.url)),map.id);
const counts={'magma-golem':6,'flame-king':6,'ember-tiger':4,'thornspike-stump':5,'nightmare-tree':0,'giant-red-tree-ghost':5,'giant-ghost-tree':5,'dark-crystal-golem':3,'plague-carrier':5};
for(const boss of guideBosses){
 assert.ok(guideMaps.some(map=>map.id===boss.map));assert.equal(boss.points.length,counts[boss.id]);
 assert.equal(boss.bossDrops,null);assert.equal(boss.chestDrops,null);
 for(const p of boss.points){assert.ok(Number.isFinite(p.x)&&p.x>=0&&p.x<=100);assert.ok(Number.isFinite(p.y)&&p.y>=0&&p.y<=100);}
 assert.equal(new Set(boss.points.map(p=>p.x+':'+p.y)).size,boss.points.length);
}
assert.equal(guideBoss('constructor'),undefined);assert.equal(guideBoss(null),undefined);
assert.notEqual(guideMaps.find(m=>m.id==='ghost-forest').image,'/maps/ghost-forest.png','Do not use the old Ghost Forest terrain.');
assert.equal(guideBoss('nightmare-tree').points.length,0,'User confirmed the Nightmare reference was wrong; await replacement.');
const dictionary=JSON.parse(readFileSync(new URL('../lib/translations.json',import.meta.url),'utf8'));
const ui=readFileSync(new URL('../app/guide-boss-map.tsx',import.meta.url),'utf8')+readFileSync(new URL('../app/game-guide.tsx',import.meta.url),'utf8');
for(const [,key]of ui.matchAll(/\bt\('([^']+)'/g))for(const language of ['tr','el'])assert.ok(dictionary[key]?.[language],'Missing '+language+' translation: '+key);
console.log('PASS: four map assets, nine bosses, 39 bounded distinct spawn points, corrected Nightmare pending, Arthion Ghost Forest reference, separate unknown boss/chest loot, TR/EL interface translations.');

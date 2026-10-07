import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import assert from 'node:assert/strict';
import {NodeDatabase,migrate} from '../lib/railway/storage.mjs';
const db=new NodeDatabase(':memory:');migrate(db);
let clock=Date.parse('2026-10-07T10:00:00Z');
const RealDate=Date;class TestDate extends RealDate{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
const env={DB:db,GUILD_SHEET_ID:'test-spreadsheet-id-for-fixtures'};
const rows=[['2026-09-30','Alice',1000000],['2026-10-06','Alice',250000],['2026-10-06','Bob',500000],['2026-09-30','Later',1750000],['2026-09-30','Duplicate',500000],['2026-09-30','Lost',500000]];
const deposits=()=>['Date,Member Name,Yang Deposited,Notes',...rows.map(r=>r.join(',')+',')].join('\n');
const totals=()=>['Member Name,Class,Yang Deposited',...['Alice','Bob','Later','Duplicate','Lost','YIGO'].map(name=>[name,'Shaman',rows.filter(r=>r[1]===name).reduce((s,r)=>s+r[2],0)].join(','))].join('\n');
const context=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob,btoa,Date:TestDate,URL,URLSearchParams,Request,Response,AbortSignal,console,fetch:async url=>new Response(new URL(url).searchParams.get('gid')==='0'?deposits():totals(),{headers:{'content-type':'text/csv'}})});
const worker=new vm.SyntheticModule(['env'],function(){this.setExport('env',env);},{context}),modules=new Map();
async function load(filename){if(modules.has(filename))return modules.get(filename);const raw=readFileSync(filename,'utf8'),source=filename.endsWith('.ts')?ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText:raw;const module=new vm.SourceTextModule(source,{context,identifier:filename,initializeImportMeta(meta){meta.env={DEV:false};}});modules.set(filename,module);return module;}
const mod=await load(path.resolve('lib/contributions.ts'));await mod.link(async(spec,ref)=>spec==='cloudflare:workers'?worker:load(path.resolve(path.dirname(ref.identifier),spec+(path.extname(spec)?'':'.ts'))));await mod.evaluate();const {syncContributions,readContribution}=mod.namespace;
const member=id=>db.connection.prepare('SELECT * FROM members WHERE id=?').get(id);
const addMember=(id,name)=>db.connection.prepare("INSERT INTO members(id,name,class,created) VALUES(?,?,'Shaman',?)").run(id,name,clock/1000);
const baseline=(name,yang,weeklyPp)=>db.connection.prepare('INSERT INTO contribution_baselines(name_key,name,yang,pp,week,weekly_pp,unit,rate,source_batch,created) VALUES(?,?,?,?,?, ?,500000,20,?,?)').run(name.toLowerCase(),name,yang,Math.floor(yang/500000*20),'2026-10-05',weeklyPp,'fixture',clock/1000);
try{
 for(const [name,yang,pp] of [['Alice',1250000,10],['Bob',500000,20],['Later',1750000,0],['Duplicate',500000,0],['Lost',500000,0],['YIGO',0,0]])baseline(name,yang,pp);
 for(const [id,name] of [['alice','Alice'],['bob','Bob'],['yigo','YIGO']])addMember(id,name);
 await syncContributions();
 assert.equal(member('alice').balance,50);assert.equal(member('bob').balance,20);assert.equal(member('yigo').balance,0);
 assert.equal(db.connection.prepare("SELECT pp FROM weekly_rewards WHERE member_id='bob'").get().pp,0);
 await Promise.all(Array.from({length:15},()=>readContribution(member('alice'))));
 assert.equal(db.connection.prepare("SELECT COUNT(*) n FROM ledger WHERE member_id='alice'").get().n,1);
 // The frozen opening balance works even before the next source refresh, including late sign-ins.
 clock+=901000;addMember('later','Later');await readContribution(member('later'));assert.equal(member('later').balance,70);
 // Complete a partial quest: 10 PP already imported + only 10 remaining PP; never 20 more.
 rows.push(['2026-10-07','Alice',250000],['2026-10-07','Bob',500000]);await syncContributions();
 assert.equal(member('alice').balance,60);assert.equal(member('bob').balance,20);
 assert.equal(db.connection.prepare("SELECT pp FROM weekly_rewards WHERE member_id='alice'").get().pp,10);
 await readContribution(member('alice'));assert.equal(member('alice').balance,60);
 // A nickname change cannot claim a second source row, and another account cannot reclaim a row.
 db.connection.prepare("UPDATE members SET name='Duplicate' WHERE id='alice'").run();await readContribution(member('alice'));assert.equal(member('alice').balance,60);
 addMember('imposter','Alice');await readContribution(member('imposter'));assert.equal(member('imposter').balance,0);
 db.connection.prepare("UPDATE members SET name='Alice' WHERE id='alice'").run();
 addMember('duplicate-a','Duplicate');addMember('duplicate-b','DUPLICATE');await Promise.all([readContribution(member('duplicate-a')),readContribution(member('duplicate-b'))]);assert.equal(member('duplicate-a').balance,0);assert.equal(member('duplicate-b').balance,0);
 // Demo reads cannot claim a real source row; unavailable bot membership fails closed.
 addMember('lost','Lost');env.DEMO_SESSION=true;await readContribution(member('lost'));assert.equal(member('lost').balance,0);delete env.DEMO_SESSION;
 env.DISCORD_BOT_TOKEN='test-only';await readContribution(member('lost'));assert.equal(member('lost').balance,0);delete env.DISCORD_BOT_TOKEN;
 db.connection.prepare("UPDATE members SET active=0 WHERE id='lost'").run();assert.throws(()=>db.connection.prepare("INSERT INTO contribution_baseline_claims VALUES('lost','lost',?)").run(clock/1000));
 // Snapshot, claims and credited history cannot be rewritten or deleted.
 for(const sql of ["UPDATE contribution_baselines SET pp=pp+1 WHERE name_key='alice'","DELETE FROM contribution_baselines WHERE name_key='alice'","UPDATE contribution_baseline_claims SET member_id='imposter' WHERE name_key='alice'","DELETE FROM contribution_baseline_claims WHERE name_key='alice'","DELETE FROM ledger WHERE member_id='alice'"])assert.throws(()=>db.connection.exec(sql));
 clock=Date.parse('2026-10-12T10:00:00Z');rows.push(['2026-10-12','Alice',500000]);await syncContributions();assert.equal(member('alice').balance,80);await readContribution(member('alice'));assert.equal(member('alice').balance,80);
 assert.equal(db.connection.prepare('PRAGMA foreign_key_check').all().length,0);
 console.log('PASS: historical proportional PP, single concurrent claim, late sign-in, unpaid YIGO, full/partial current-week deduplication, future week rewards, nickname/duplicate protection, demo isolation, role failure and immutable history.');
}finally{db.close();}

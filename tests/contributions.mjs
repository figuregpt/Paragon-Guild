import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import assert from 'node:assert/strict';
import {NodeDatabase,migrate} from '../lib/railway/storage.mjs';
import {parseContributionSheets,csvRows} from '../lib/contribution-source.mjs';
const db=new NodeDatabase(':memory:');migrate(db);
let clock=Date.parse('2026-10-07T10:00:00Z'),fetches=0,bad=false;
const RealDate=Date;class TestDate extends RealDate{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
const env={DB:db,SESSION_SECRET:'test-only',GUILD_SHEET_ID:'test-spreadsheet-id-for-fixtures'};
const deposits='Date,Member Name,Yang Deposited,Notes\n2026-10-06,Alice,"250,000 Yang",first\n2026-10-07,alice,"250,000 Yang",second\n2026-09-30,Alice,"1,000,000 Yang",history\n2026-10-08,Alice,"500,000 Yang",future\n2026-10-06,Bob,"500,000 Yang",weekly\n';
const totals='Member Name,Class,Yang Deposited\nAlice,Shaman,"2,000,000 Yang"\nBob,Warrior,"500,000 Yang"\nYIGO,Sura,0\n';
assert.deepEqual(csvRows('a,b\n"x, y","a""b\nc"\n'),[['a','b'],['x, y','a"b\nc']]);
assert.throws(()=>parseContributionSheets(deposits,totals.replace('2,000,000','3,000,000')));
assert.throws(()=>parseContributionSheets(deposits.replace('2026-10-08','2026-02-30'),totals));
assert.throws(()=>parseContributionSheets(deposits,totals+'ALICE,Ninja,0\n'));
const context=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob,btoa,Date:TestDate,URL,URLSearchParams,Request,Response,AbortSignal,console,fetch:async url=>{fetches++;return bad?new Response('<html>Unavailable</html>',{headers:{'content-type':'text/html'}}):new Response(new URL(url).searchParams.get('gid')==='0'?deposits:totals,{headers:{'content-type':'text/csv'}});}});
const worker=new vm.SyntheticModule(['env'],function(){this.setExport('env',env);},{context}),modules=new Map();
async function load(filename){if(modules.has(filename))return modules.get(filename);const raw=readFileSync(filename,'utf8'),source=filename.endsWith('.ts')?ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText:raw;const module=new vm.SourceTextModule(source,{context,identifier:filename,initializeImportMeta(meta){meta.env={DEV:false};}});modules.set(filename,module);await module.link(async(spec,ref)=>spec==='cloudflare:workers'?worker:load(path.resolve(path.dirname(ref.identifier),spec+(path.extname(spec)?'':'.ts'))));return module;}
const mod=await load(path.resolve('lib/contributions.ts'));await mod.evaluate();const {syncContributions,readContribution}=mod.namespace;
const member=id=>db.connection.prepare('SELECT * FROM members WHERE id=?').get(id);
try{
 for(const [id,name] of [['alice','Alice'],['bob','Bob'],['yigo','YIGO']])db.connection.prepare("INSERT INTO members(id,name,class,created) VALUES(?,?,'Shaman',?)").run(id,name,clock/1000);
 // Existing approved weekly PP is preserved, never credited a second time.
 db.connection.prepare("INSERT INTO deposits(id,member_id,yang,pp,kind,week,note,created) VALUES('old-weekly','bob',500000,20,'weekly','2026-10-05','',?)").run(clock/1000);
 db.connection.prepare("UPDATE deposits SET status='approved',reviewed_by='bob',reviewed=? WHERE id='old-weekly'").run(clock/1000);
 await Promise.all([syncContributions(),syncContributions()]);assert.equal(fetches,2);
 let alice=await readContribution(member('alice'));assert.equal(alice.total_yang,1500000);assert.equal(alice.weekly_yang,500000);assert.deepEqual(Array.from(alice.entries,d=>d.yang),[1000000,250000,250000]);assert.equal(member('alice').balance,20);assert.equal(member('bob').balance,20);
 const yigo=await readContribution(member('yigo'));assert.equal(yigo.total_yang,0);assert.equal(yigo.weekly_yang,0);assert.equal(yigo.stale,false);
 // Production bot configuration never blocks or enters a fictional demo reward.
 env.DEMO_SESSION=true;env.DISCORD_BOT_TOKEN='test-bot-token';
 db.connection.prepare("INSERT INTO members(id,name,class,created) VALUES('fictional-demo','Alice','Shaman',?)").run(clock/1000);
 await readContribution(member('fictional-demo'));assert.equal(member('fictional-demo').balance,20);delete env.DEMO_SESSION;delete env.DISCORD_BOT_TOKEN;
 await Promise.all([readContribution(member('alice')),readContribution(member('alice'))]);await syncContributions();assert.equal(fetches,2);assert.equal(member('alice').balance,20);
 clock+=300000;await syncContributions();assert.equal(fetches,4);assert.equal(member('alice').balance,20);
 bad=true;clock+=300000;await syncContributions();alice=await readContribution(member('alice'));assert.equal(alice.total_yang,1500000);assert.equal(alice.error,true);assert.equal(member('alice').balance,20);
 clock+=900001;assert.equal((await readContribution(member('alice'))).stale,true);
 bad=false;clock=Date.parse('2026-10-12T00:00:00Z');await syncContributions();alice=await readContribution(member('alice'));assert.equal(alice.weekly_yang,0);assert.equal(alice.total_yang,2000000);assert.equal(member('alice').balance,20);
 assert.equal(db.connection.prepare("SELECT COUNT(*) n FROM weekly_rewards WHERE member_id='alice'").get().n,1);
 console.log('PASS: CSV validation, exact character matching, current week and future dates, 5-minute cadence, atomic snapshots, retained cache on failure, single PP credit, prior manual credit deduplication, YIGO unpaid and week rollover.');
}finally{db.close();}

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import ts from 'typescript';
const source=readFileSync('lib/daily-cm.ts','utf8'),code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {dailyCm,cmPeriod}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
for(const [instant,day,next] of [
 ['2026-10-08T00:59:59.999+03:00','2026-10-07','2026-10-08T01:00:00+03:00'],
 ['2026-10-08T01:00:00+03:00','2026-10-08','2026-10-09T01:00:00+03:00'],
 ['2026-10-08T23:59:59+03:00','2026-10-08','2026-10-09T01:00:00+03:00'],
 ['2027-01-01T00:30:00+03:00','2026-12-31','2027-01-01T01:00:00+03:00'],
 ['2027-01-01T01:00:00+03:00','2027-01-01','2027-01-02T01:00:00+03:00'],
 ['2028-03-01T00:59:59+03:00','2028-02-29','2028-03-01T01:00:00+03:00']
])assert.deepEqual(cmPeriod(Date.parse(instant)),{period:day,resetsAt:Date.parse(next)});
const secret='test-only-unrelated-to-production',member='test-member',before=Date.parse('2026-10-08T00:59:59+03:00'),after=before+1000;
const a=await dailyCm(member,secret,before),b=await dailyCm(member,secret,before-500000);
assert.equal(a.cents,b.cents);assert.equal(a.period,b.period);assert.ok(a.cents>=0&&a.cents<=10000&&Number.isInteger(a.cents));
const expected=createHmac('sha256',secret).update(JSON.stringify(['paragon-daily-cm-v1',member,a.period,0])).digest().readUInt32BE(0)%10001;
assert.equal(a.cents,expected);const next=await dailyCm(member,secret,after);assert.notEqual(a.period,next.period);assert.notEqual(a.cents,next.cents);
for(const zone of ['UTC','Europe/Istanbul','America/New_York','Asia/Tokyo']){process.env.TZ=zone;assert.deepEqual(await dailyCm(member,secret,before),a);}
const rolls=await Promise.all(Array.from({length:1000},(_,n)=>dailyCm('sample-'+n,secret,before)));const values=rolls.map(r=>r.cents);
assert.ok(new Set(values).size>850);assert.ok(Math.min(...values)<100);assert.ok(Math.max(...values)>9800);
await assert.rejects(dailyCm('',secret));await assert.rejects(dailyCm(member,''));
const route=readFileSync('app/api/[[...path]]/route.ts','utf8');assert.ok(route.indexOf("path==='daily-cm'")>route.indexOf('await requireMember('));assert.match(route,/dailyCm\(m\.id,env\.SESSION_SECRET/);
assert.doesNotMatch(readFileSync('app/guild-app.tsx','utf8'),/balance\/100|100 PP = 1 cm/);
console.log('PASS daily CM: independent keyed randomness, hundredths 0–100, same-day stability, member isolation, exact Türkiye 01:00 reset, midnight/year/leap boundaries and device time-zone independence.');

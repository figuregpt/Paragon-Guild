import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';

const database = new DatabaseSync(':memory:');
for (const file of readdirSync('drizzle').filter(file => file.endsWith('.sql')).sort()) {
  database.exec(readFileSync('drizzle/' + file, 'utf8'));
}
const checkedAt = Math.floor(Date.now() / 1000);
for (const [id, active] of [['first', 1], ['second', 1], ['removed', 0]]) {
  database.prepare("INSERT INTO members(id,name,class,created,active) VALUES(?,?,'Warrior',?,?)").run(id, id, checkedAt, active);
}
for (const [member, channel, deadline] of [['first', 1, 600], ['second', 4, 1200], ['removed', 2, 300], ['first', 3, -60]]) {
  database.prepare('INSERT INTO boss_timers VALUES(?,?,?,?,?,?)').run(member, 'flame-king', channel, checkedAt - 1800, checkedAt + deadline, crypto.randomUUID());
}
const environment = { PRIVATE_TIMER_VIEW_TOKEN: 'test-only-'.padEnd(64, 'x') };
globalThis.__privateFeedTest = {
  env: environment,
  all: async (query, ...values) => database.prepare(query).all(...values),
};
let source = readFileSync('lib/private-timer-feed.ts', 'utf8');
source = source.replace("import { env } from 'cloudflare:workers';", 'const { env } = globalThis.__privateFeedTest;')
  .replace("import { all } from './database';", 'const { all } = globalThis.__privateFeedTest;')
  .replace("import { findGuideBoss } from './boss-guide';", 'const findGuideBoss = () => ({name:"Flame King",mapName:"Doyyumhwan"});');
const compiled = ts.transpileModule(source, {compilerOptions: { module: ts.ModuleKind.ESNext }}).outputText;
const { privateTimerFeed } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const request = (method = 'GET', token = environment.PRIVATE_TIMER_VIEW_TOKEN) => new Request('https://guild.test/api/private-timer-feed', {
  method, headers: token === null ? {} : { Authorization: 'Bearer ' + token },
});
try {
  assert.equal(await privateTimerFeed(request(), 'unrelated'), null);
  assert.equal((await privateTimerFeed(request('GET', null), 'private-timer-feed')).status, 404);
  assert.equal((await privateTimerFeed(request('GET', 'wrong'), 'private-timer-feed')).status, 404);
  assert.equal((await privateTimerFeed(request('POST'), 'private-timer-feed')).status, 405);
  const response = await privateTimerFeed(request(), 'private-timer-feed');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /private, no-store/);
  const snapshot = await response.json();
  assert.equal(snapshot.timers.length, 2);
  assert.deepEqual(snapshot.timers.map(timer => timer.player), ['first', 'second']);
  assert.equal(snapshot.timers[0].channel, 1);
  assert.equal(snapshot.timers[0].bossName, 'Flame King');
  assert.deepEqual(Object.keys(snapshot.timers[0]).sort(), ['bossId', 'bossName', 'channel', 'key', 'killedAt', 'mapName', 'player', 'respawnsAt']);
  environment.PRIVATE_TIMER_VIEW_TOKEN = undefined;
  assert.equal((await privateTimerFeed(request('GET', 'configured-earlier'), 'private-timer-feed')).status, 404);
  console.log('PASS private timer feed: absent/wrong credentials rejected, read-only methods, active members and future timers only, restricted output, uncached responses.');
} finally {
  database.close();
  delete globalThis.__privateFeedTest;
}

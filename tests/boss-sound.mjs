import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const notes=[],levels=[];
class Audio{
 constructor(){this.state='suspended';this.currentTime=100;this.destination={};}
 async resume(){this.state='running';}
 async close(){this.state='closed';}
 createGain(){return {gain:{setValueAtTime:(v,t)=>levels.push([v,t]),exponentialRampToValueAtTime:(v,t)=>levels.push([v,t])},connect(){}};}
 createOscillator(){const note={frequency:{value:0},connect(){},start(t){this.startAt=t;},stop(t){this.stopAt=t;}};notes.push(note);return note;}
}
globalThis.window={AudioContext:Audio};
try{
 const code=ts.transpileModule(readFileSync(new URL('../lib/boss-sound.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const {BossChime}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')),sound=new BossChime();
 assert.equal(sound.play(),false,'No autoplay before a user gesture prepares audio');assert.equal(await sound.prepare(),true);assert.equal(sound.play(),true);
 assert.equal(notes.length,2);assert.equal(notes[0].type,'sine');assert.equal(notes[0].frequency.value,880);assert.equal(notes[1].frequency.value,1174.66);assert.ok(notes[1].startAt>notes[0].startAt);assert.ok(notes[1].stopAt-notes[0].startAt<.5);assert.equal(Math.max(...levels.map(([v])=>v)),.035);
 sound.close();assert.equal(sound.ready,false);assert.equal(sound.play(),false);
 console.log('PASS: user-gesture audio preparation, quiet double chime, soft envelope, sub-half-second duration, clean disposal; audio graph stubbed.');
}finally{delete globalThis.window;}

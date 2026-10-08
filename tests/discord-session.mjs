import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import assert from 'node:assert/strict';
import {NodeDatabase,migrate} from '../lib/railway/storage.mjs';
const db=new NodeDatabase(':memory:');migrate(db);
const memberRole='1476262174971400332',organizerRole='1557381184231710770',shaman='1480603704099864769',ninja='1480605021983997983',yigo='358748815831990274',other='100000000000000001';
let identity=other,roles=[memberRole,shaman,organizerRole],fetches=0,delay=0,limited=false;
const env={DB:db,MEMBERS_ONLY:'true',SESSION_SECRET:'test-secret-never-production',DISCORD_GUILD_ID:'1475989193300643853',DISCORD_CLIENT_ID:'1557348788950011955',DISCORD_CLIENT_SECRET:'mock-secret',DISCORD_MEMBER_ROLE_IDS:memberRole,DISCORD_CLASS_ROLES:JSON.stringify({Shaman:shaman,Ninja:ninja}),DISCORD_EVENT_CREATOR_ROLE_IDS:organizerRole,DISCORD_ADMIN_USER_IDS:yigo,DISCORD_EVENT_CREATOR_USER_IDS:yigo};
const context=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob,btoa,Date,URL,URLSearchParams,Request,Response,AbortSignal,console,fetch:async(url)=>{fetches++;if(delay)await new Promise(resolve=>setTimeout(resolve,delay));if(limited)return new Response('{}',{status:429,headers:{'retry-after':'60'}});return Response.json(url.endsWith('/member')?{nick:'Test Member',roles}:{id:identity,username:'tester',global_name:'Test Member',avatar:null});}});
const worker=new vm.SyntheticModule(['env'],function(){this.setExport('env',env);},{context});
const modules=new Map();
async function load(filename){if(modules.has(filename))return modules.get(filename);const source=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;const module=new vm.SourceTextModule(source,{context,identifier:filename,initializeImportMeta(meta){meta.env={DEV:false};}});modules.set(filename,module);await module.link(async(spec,ref)=>spec==='cloudflare:workers'?worker:load(path.resolve(path.dirname(ref.identifier),spec+'.ts')));return module;}
const mod=await load(path.resolve('lib/auth.ts'));await mod.evaluate();const auth=mod.namespace;
const seconds=()=>Math.floor(Date.now()/1000);
async function login(){await auth.upsertMember(await auth.discordIdentity('mock-access'));const cookie=await auth.createSession(identity,new Request('https://guild.test/'),{access:'mock-access',refresh:'mock-refresh',expires:seconds()+3600});return new Request('https://guild.test/api/state',{headers:{Cookie:cookie.split(';')[0]}});}
try{
 assert.equal(auth.configReady(),true);
 const configuredMemberRole=env.DISCORD_MEMBER_ROLE_IDS;
 env.DISCORD_MEMBER_ROLE_IDS='';assert.equal(auth.configReady(),false);
 assert.throws(()=>auth.identityPermissions({id:other,name:'Test',roles:[shaman],avatar:null}),e=>e.status===503);
 env.DISCORD_MEMBER_ROLE_IDS=configuredMemberRole;
 env.DEMO_SESSION=true;await assert.rejects(auth.requireMember(new Request('https://guild.test/')),e=>e.status===401);env.DEMO_SESSION=false;
 let request=await login();assert.equal((await auth.requireMember(request)).can_host,1);assert.equal((await auth.requireMember(request)).admin,0);
 roles=[memberRole,ninja];db.connection.prepare('UPDATE sessions SET verified=?').run(seconds()-31);let user=await auth.requireMember(request);assert.equal(user.class,'Ninja');assert.equal(user.can_host,0);
 // A just-verified session still rechecks membership before a write.
 roles=[ninja];await assert.rejects(auth.requireMember(request,false,true),e=>e.status===403);assert.equal(db.connection.prepare('SELECT COUNT(*) n FROM sessions').get().n,0);assert.equal(db.connection.prepare('SELECT active FROM members WHERE id=?').get(other).active,0);
 roles=[memberRole,ninja];request=await login();assert.equal(db.connection.prepare('SELECT active FROM members WHERE id=?').get(other).active,1);
 // The Member role grants access even before a cosmetic class role is assigned.
 roles=[memberRole];request=await login();user=await auth.requireMember(request,false,true);assert.equal(user.class,'Unassigned');assert.equal(db.connection.prepare('SELECT active FROM members WHERE id=?').get(other).active,1);
 roles=[memberRole,ninja,shaman];request=await login();user=await auth.requireMember(request,false,true);assert.equal(user.class,'Unassigned');assert.equal(user.admin,0);
 // Member role removal also expires a periodically refreshed read-only session.
 roles=[ninja];db.connection.prepare('UPDATE sessions SET verified=?').run(seconds()-31);await assert.rejects(auth.requireMember(request),e=>e.status===403);
 identity=yigo;roles=[memberRole,shaman];request=await login();user=await auth.requireMember(request,false,true);assert.equal(user.admin,1);assert.equal(user.can_host,0);
 // The explicit admin identity never bypasses the guild membership gate.
 roles=[shaman];await assert.rejects(auth.requireMember(request,true),e=>e.status===403);
 roles=[memberRole,shaman];request=await login();let before=fetches;delay=20;await Promise.all(Array.from({length:5},()=>auth.requireMember(request,false,true)));delay=0;assert.equal(fetches-before,2);
 limited=true;db.connection.prepare('UPDATE sessions SET verified=?').run(seconds()-31);await assert.rejects(auth.requireMember(request),e=>e.status===503);before=fetches;await assert.rejects(auth.requireMember(request),e=>e.status===503);assert.equal(fetches,before);assert.equal(db.connection.prepare('SELECT COUNT(*) n FROM sessions').get().n,1);limited=false;
 env.DISCORD_BOT={ready:true,getMember:async()=>({id:identity,name:'Test Member',roles,avatar:null})};before=fetches;roles=[memberRole,ninja,organizerRole];user=await auth.requireMember(request);assert.equal(user.class,'Ninja');assert.equal(user.can_host,1);assert.equal(fetches,before);
 roles=[memberRole,ninja];user=await auth.requireMember(request,false,true);assert.equal(user.can_host,0); // Admin and legacy user allowlists do not bypass Experienced.
 roles=[ninja];await assert.rejects(auth.requireMember(request),e=>e.status===403);assert.equal(db.connection.prepare('SELECT COUNT(*) n FROM sessions').get().n,0);
 assert.ok(fetches>=12);console.log('PASS: live-role refresh changes class/organizer access, removed Member roles revoke sessions before writes and periodic reads, rejoining restores access, and explicit YIGO admin requires Member role; simultaneous checks deduplicate, 429 respects Retry-After without logout and connected bot checks revoke roles immediately.');
}finally{db.close();}

import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,mkdtempSync,rmSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {AsyncLocalStorage} from 'node:async_hooks';
import {seedDemo} from './demo-seed.mjs';
import {getDiscordBot} from './discord-bot.mjs';
import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export const dataDirectory=()=>process.env.PARAGON_DATA_DIR||process.env.RAILWAY_VOLUME_MOUNT_PATH||path.resolve('.railway-data');
export class Statement {
 constructor(database,sql,args=[]){this.database=database;this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.database,this.sql,args);}
 async all(){const started=performance.now();const stmt=this.database.connection.prepare(this.sql);const results=stmt.all(...this.args);return {success:true,results,meta:{changes:0,duration:performance.now()-started}};}
 async first(column){const row=this.database.connection.prepare(this.sql).get(...this.args);return row?(column?row[column]:row):null;}
 execute(){const started=performance.now();const result=this.database.connection.prepare(this.sql).run(...this.args);return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid),duration:performance.now()-started}};}
 async run(){return this.execute();}
 async raw(){const statement=this.database.connection.prepare(this.sql);statement.setReturnArrays(true);return statement.all(...this.args);}
}
export class NodeDatabase {
 constructor(filename){mkdirSync(path.dirname(filename),{recursive:true});this.connection=new DatabaseSync(filename);this.connection.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=10000;');}
 prepare(sql){return new Statement(this,sql);}
 async batch(statements){this.connection.exec('BEGIN IMMEDIATE');try{const results=[];for(const s of statements)results.push(s.execute());this.connection.exec('COMMIT');return results;}catch(error){this.connection.exec('ROLLBACK');throw error;}}
 async exec(sql){this.connection.exec(sql);return {count:1,duration:0};}
 close(){this.connection.close();}
}
// Preserve entire migration files, including SQLite triggers. Never split on semicolons.
export function migrate(database,directory=path.resolve('drizzle')){
 const db=database.connection;db.exec('CREATE TABLE IF NOT EXISTS railway_migrations(name TEXT PRIMARY KEY,hash TEXT NOT NULL,applied INTEGER NOT NULL)');
 for(const name of readdirSync(directory).filter(f=>/^\d+.*\.sql$/.test(f)).sort()){
  const sql=readFileSync(path.join(directory,name),'utf8'),hash=createHash('sha256').update(sql).digest('hex'),old=db.prepare('SELECT hash FROM railway_migrations WHERE name=?').get(name);
  if(old){if(old.hash!==hash)throw new Error('Previously applied migration changed: '+name);continue;}
  db.exec('BEGIN IMMEDIATE');try{db.exec(sql);db.prepare('INSERT INTO railway_migrations VALUES(?,?,unixepoch())').run(name,hash);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
 }
}
let singleton;
export const getDatabase=()=>singleton??=new NodeDatabase(path.join(dataDirectory(),'guild.sqlite'));
export class NodeBucket {
 constructor(root){this.root=root;}
 filename(key){if(!/^(icons|evidence)\/[a-zA-Z0-9-]+\.(png|jpg|webp|gif)$/.test(key))throw new Error('Invalid image key.');return path.join(this.root,key);}
 async put(key,value,options={}){const file=this.filename(key),temporary=file+'.'+randomUUID()+'.tmp';await mkdir(path.dirname(file),{recursive:true});await writeFile(temporary,Buffer.from(value));await rename(temporary,file);await writeFile(file+'.json',JSON.stringify(options.httpMetadata||{}));return {key};}
 async get(key){const file=this.filename(key);try{const [body,metadata]=await Promise.all([readFile(file),readFile(file+'.json','utf8')]);return {body:new Uint8Array(body),httpMetadata:JSON.parse(metadata)};}catch(error){if(error.code==='ENOENT')return null;throw error;}}
 async delete(key){const file=this.filename(key);for(const target of [file,file+'.json'])try{await unlink(target);}catch(error){if(error.code!=='ENOENT')throw error;}}
}
// Opaque, HttpOnly demo credentials select a completely separate database and image bucket.
// Demo data expires after two hours and intentionally resets after server restarts.
const demoContext=new AsyncLocalStorage(),demos=new Map(),lifetime=7200;
const parseCookies=request=>Object.fromEntries((request.headers.get('cookie')||'').split(';').map(v=>v.trim().split('=')));
const digest=value=>createHash('sha256').update(value).digest('hex');
const demoCookie=(request,name,value,age=lifetime)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(request.url).protocol==='https:'||process.env.APP_ORIGIN?.startsWith('https://')?'; Secure':''}`;
const demoError=(message,status=401)=>Response.json({error:message},{status,headers:{'Cache-Control':'private, no-store'}});
function cleanupDemos(){for(const [key,demo] of demos)if(demo.expires<=Date.now()&&!demo.active){demo.database.close();rmSync(demo.directory,{recursive:true,force:true});demos.delete(key);}}
export const demoRuntime={
 get enabled(){return process.env.MEMBERS_ONLY!=='true'&&process.env.DEMO_ENABLED==='true';},
 async login(request,role){
  if(!this.enabled)return demoError('Not found.',404);
  cleanupDemos();const credentials=parseCookies(request);let token=credentials.pg_demo,demo=demos.get(digest(token||''));
  if(!demo){
   if(demos.size>=100)return demoError('The demo is busy. Please try again shortly.',429);
   const directory=mkdtempSync(path.join(tmpdir(),'paragon-demo-')),database=new NodeDatabase(path.join(directory,'demo.sqlite'));
   try{migrate(database);seedDemo(database);}catch(error){database.close();rmSync(directory,{recursive:true,force:true});throw error;}
   token=randomUUID()+randomUUID();demo={directory,database,bucket:new NodeBucket(path.join(directory,'uploads')),expires:Date.now()+lifetime*1000,active:0};demos.set(digest(token),demo);
  }
  const session=randomUUID()+randomUUID(),time=Math.floor(Date.now()/1000);
  // Role switching invalidates the previous demo session but keeps this browser's sample changes.
  demo.database.connection.prepare('DELETE FROM sessions').run();
  demo.database.connection.prepare('INSERT INTO sessions(token,member_id,expires,verified) VALUES(?,?,?,?)').run(digest(session),role==='leader'?'demo-leader':'demo-member',Math.floor(demo.expires/1000),time);
  const age=Math.max(0,Math.floor((demo.expires-Date.now())/1000)),headers=new Headers({'Cache-Control':'private, no-store','Content-Type':'application/json'});
  headers.append('Set-Cookie',demoCookie(request,'pg_demo',token,age));headers.append('Set-Cookie',demoCookie(request,'pg_demo_session',session,age));
  return new Response(JSON.stringify({ok:true}),{headers});
 },
 async run(request,callback){
  const route=new URL(request.url).pathname;
  // Login/status and the production scheduler do not inherit demo context.
  if(['/api/demo-login','/api/status','/api/health','/api/jobs/tick'].includes(route))return callback();
  const token=parseCookies(request).pg_demo;
  if(!token)return callback();cleanupDemos();const demo=this.enabled&&demos.get(digest(token));
  if(!demo){const response=demoError(process.env.MEMBERS_ONLY==='true'?'Sign in with Discord to continue.':'Your demo has expired. Choose a demo role to continue.');response.headers.append('Set-Cookie',demoCookie(request,'pg_demo','',0));response.headers.append('Set-Cookie',demoCookie(request,'pg_demo_session','',0));return response;}
  demo.active++;try{return await demoContext.run(demo,callback);}finally{demo.active--;}
 }
};
const bucket=new NodeBucket(path.join(dataDirectory(),'uploads'));
export const env=new Proxy({}, {get(_target,key){const demo=demoContext.getStore();if(key==='DISCORD_BOT')return demo?undefined:getDiscordBot();if(key==='DEMO_RUNTIME')return demoRuntime;if(key==='DEMO_SESSION')return Boolean(demo);if(key==='DB')return demo?.database||getDatabase();if(key==='BUCKET')return demo?.bucket||bucket;if(demo&&['DISCORD_BOT_TOKEN','GUILD_SHEET_ID','GUILD_BANK_SNAPSHOT','VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','SCHEDULER_SECRET','SCHEDULER_ENABLED'].includes(key))return undefined;return process.env[key];}});

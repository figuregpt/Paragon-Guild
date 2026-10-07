import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {NodeDatabase,dataDirectory,migrate} from '../lib/railway/storage.mjs';
import path from 'node:path';
if(process.env.RAILWAY_ENVIRONMENT_ID&&!process.env.RAILWAY_VOLUME_MOUNT_PATH)throw new Error('A persistent Railway volume is required.');
if(!process.env.SESSION_SECRET)throw new Error('SESSION_SECRET is required.');
process.env.NODE_ENV='production';
const database=new NodeDatabase(path.join(dataDirectory(),'guild.sqlite'));migrate(database);database.close();
const port=Number(process.env.PORT||3000);
// Quiesce both web requests and scheduled jobs during a backed-up database reset.
if(process.env.PARAGON_MAINTENANCE==='true'){
 const maintenance=createServer((request,response)=>{
  const health=request.url==='/api/health';
  response.writeHead(health?200:503,{'Content-Type':'application/json','Cache-Control':'no-store','Retry-After':'120'});
  response.end(JSON.stringify(health?{ok:true,maintenance:true}:{error:'Guild maintenance is in progress. Please try again shortly.'}));
 });
 maintenance.listen(port,'0.0.0.0');
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>maintenance.close(()=>process.exit(0)));
}else{
const server=spawn(process.execPath,['node_modules/vinext/dist/cli.js','start','--hostname','0.0.0.0','--port',String(port)],{stdio:'inherit',env:process.env});
let running=false;
async function tick(){if(running||process.env.SCHEDULER_ENABLED!=='true'||!process.env.SCHEDULER_SECRET)return;running=true;try{const r=await fetch(`http://127.0.0.1:${port}/api/jobs/tick`,{method:'POST',headers:{Authorization:'Bearer '+process.env.SCHEDULER_SECRET},signal:AbortSignal.timeout(45000)});if(!r.ok)console.error('Scheduled guild jobs failed:',r.status);}catch{console.error('Scheduled guild jobs unavailable; retrying next minute.');}finally{running=false;}}
const timer=setInterval(tick,60000);const initial=setTimeout(tick,5000);
function stop(signal){clearInterval(timer);clearTimeout(initial);server.kill(signal);}
process.on('SIGTERM',()=>stop('SIGTERM'));process.on('SIGINT',()=>stop('SIGINT'));
server.on('exit',code=>{clearInterval(timer);clearTimeout(initial);process.exit(code??1);});
}

import {env} from 'cloudflare:workers';
import {first,run} from './database';
import {CLASSES,now,id,type Member} from './domain';
import {DiscordRoleError,parseClassRoles,parseRoleList,resolveDiscordRoles,matchesDiscordAccess} from './discord-roles';
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export const cookieName='pg_session';
export const sessionCookieName=()=>env.DEMO_SESSION?'pg_demo_session':cookieName;
export const configReady=()=>{if(!env.DISCORD_CLIENT_ID||!env.DISCORD_CLIENT_SECRET||!env.DISCORD_GUILD_ID||!env.SESSION_SECRET)return false;try{parseClassRoles(env.DISCORD_CLASS_ROLES,CLASSES);parseRoleList(env.DISCORD_MEMBER_ROLE_IDS);parseRoleList(env.DISCORD_ADMIN_ROLE_IDS);parseRoleList(env.DISCORD_ADMIN_USER_IDS);parseRoleList(env.DISCORD_EVENT_CREATOR_USER_IDS);parseRoleList(env.DISCORD_EVENT_CREATOR_ROLE_IDS);return true;}catch{return false;}};
export const localRequest=(r:Request)=>import.meta.env.DEV&&['localhost','127.0.0.1','[::1]'].includes(new URL(r.url).hostname);
export const cookie=(name:string,value:string,age:number,request:Request)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${(new URL(request.url).protocol==='https:'||env.APP_ORIGIN?.startsWith('https://'))?'; Secure':''}`;
export function cookies(request:Request){return Object.fromEntries((request.headers.get('cookie')||'').split(';').map(v=>v.trim().split('=')));}
export const hash=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(v=>v.toString(16).padStart(2,'0')).join('');
const b64=(v:Uint8Array)=>btoa(String.fromCharCode(...v));
const bytes=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
async function secretKey(){if(!env.SESSION_SECRET)throw new HttpError(503,'Discord sign-in has not been configured.');return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.SESSION_SECRET)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function seal(value:unknown){const iv=crypto.getRandomValues(new Uint8Array(12));return b64(iv)+'.'+b64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await secretKey(),new TextEncoder().encode(JSON.stringify(value)))));}
async function unseal(value:string){const [iv,data]=value.split('.');return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv)},await secretKey(),bytes(data))));}
const unavailable=()=>new HttpError(503,'Discord is temporarily unavailable. Please try again shortly.');
const cooldowns=new Map<string,number>();
async function discordFetch(url:string,options:RequestInit,key:string){
 if((cooldowns.get(key)||0)>now())throw unavailable();
 let response:Response;try{response=await fetch(url,{...options,signal:AbortSignal.timeout(10000)});}catch{console.warn('Discord verification failed: connection timeout.');throw unavailable();}
 if(response.status===429){const wait=Math.max(1,Math.min(3600,Math.ceil(Number(response.headers.get('retry-after'))||30)));if(cooldowns.size>1000)for(const [k,until] of cooldowns)if(until<=now())cooldowns.delete(k);cooldowns.set(key,now()+wait);console.warn('Discord verification rate limited; retry after',wait,'seconds.');throw unavailable();}
 if(response.status>=500){console.warn('Discord verification failed: HTTP',response.status);throw unavailable();}
 return response;
}
function identityPermissions(value:{id:string;name:string;roles:unknown;avatar:string|null}){
 let permissions:{class:string;admin:number};let canHost=0;
 try{permissions=resolveDiscordRoles(value.roles,parseClassRoles(env.DISCORD_CLASS_ROLES,CLASSES),parseRoleList(env.DISCORD_MEMBER_ROLE_IDS),parseRoleList(env.DISCORD_ADMIN_ROLE_IDS));canHost=matchesDiscordAccess(value.roles as string[],value.id,parseRoleList(env.DISCORD_EVENT_CREATOR_ROLE_IDS),parseRoleList(env.DISCORD_EVENT_CREATOR_USER_IDS))?1:0;if(parseRoleList(env.DISCORD_ADMIN_USER_IDS).includes(value.id))permissions.admin=1;}catch(error){if(error instanceof DiscordRoleError)throw new HttpError(error.status,error.message);throw error;}
 return {id:value.id,name:value.name.slice(0,80),class:permissions.class,avatar:value.avatar,admin:permissions.admin,can_host:canHost};
}
export async function botMemberIdentity(memberId:string){
 const bot=env.DISCORD_BOT;if(!bot?.ready)throw unavailable();
 let identity;try{identity=await bot.getMember(memberId);}catch{throw unavailable();}
 if(!identity)throw new HttpError(403,'You must be a member of the Paragon Discord server.');
 if(identity.id!==memberId)throw new HttpError(401,'Discord account could not be verified.');
 return identityPermissions(identity);
}
export async function discordIdentity(access:string){
 const headers={Authorization:`Bearer ${access}`},key=await hash(access);
 const [ur,mr]=await Promise.all([discordFetch('https://discord.com/api/v10/users/@me',{headers},key+':user'),discordFetch(`https://discord.com/api/v10/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`,{headers},key+':member')]);
 if(!ur.ok||!mr.ok)throw new HttpError(403,'You must be a member of the Paragon Discord server.');
 const u:any=await ur.json(),m:any=await mr.json();
 return identityPermissions({id:String(u.id),name:String(m.nick||u.global_name||u.username),roles:m.roles,avatar:u.avatar?`https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`:null});
}
export async function upsertMember(m:{id:string;name:string;class:string;avatar:string|null;admin:number;can_host:number}){await run('INSERT INTO members(id,name,class,avatar,admin,can_host,created) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,class=excluded.class,avatar=excluded.avatar,admin=excluded.admin,can_host=excluded.can_host,active=1',m.id,m.name,m.class,m.avatar,m.admin,m.can_host,now());}
export async function createSession(memberId:string,request:Request,oauth?:unknown){const token=id()+id();await run('INSERT INTO sessions(token,member_id,expires,verified,oauth) VALUES(?,?,?,?,?)',await hash(token),memberId,now()+7*86400,now(),oauth?await seal(oauth):null);return cookie(cookieName,token,7*86400,request);}
const verifications=new Map<string,Promise<void>>();
async function verifySession(hashed:string,memberId:string){
 if(verifications.has(hashed))return verifications.get(hashed)!;
 const operation=(async()=>{
  const current=await first<any>('SELECT * FROM sessions WHERE token=? AND expires>?',hashed,now());if(!current?.oauth)throw new HttpError(401,'Sign in with Discord to continue.');
  try{
   const bot=env.DISCORD_BOT;
   if(bot?.ready){
    await upsertMember(await botMemberIdentity(memberId));await run('UPDATE sessions SET verified=? WHERE token=?',now(),hashed);return;
   }
   let oauth=await unseal(current.oauth);
   if(oauth.expires<now()+30){
    const r=await discordFetch('https://discord.com/api/v10/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.DISCORD_CLIENT_ID!,client_secret:env.DISCORD_CLIENT_SECRET!,grant_type:'refresh_token',refresh_token:oauth.refresh})},memberId+':refresh');
    if(!r.ok)throw new HttpError(401,'Sign in again to refresh your Discord session.');const t:any=await r.json();oauth={access:t.access_token,refresh:t.refresh_token,expires:now()+t.expires_in};
    // Keep a rotated refresh token even if the subsequent membership call is unavailable.
    await run('UPDATE sessions SET oauth=? WHERE token=?',await seal(oauth),hashed);
   }
   const identity=await discordIdentity(oauth.access);if(identity.id!==memberId)throw new HttpError(401,'Discord account could not be verified.');
   await upsertMember(identity);await run('UPDATE sessions SET verified=? WHERE token=?',now(),hashed);
  }catch(e){if(e instanceof HttpError&&e.status===503)throw e;if(e instanceof HttpError&&e.status===403){await run('UPDATE members SET active=0 WHERE id=?',memberId);await run('DELETE FROM sessions WHERE member_id=?',memberId);}else await run('DELETE FROM sessions WHERE token=?',hashed);throw e;}
 })();verifications.set(hashed,operation);try{return await operation;}finally{if(verifications.get(hashed)===operation)verifications.delete(hashed);}
}
export async function requireMember(request:Request,admin=false,reverify=false):Promise<Member>{
 const token=cookies(request)[sessionCookieName()];if(!token)throw new HttpError(401,'Sign in with Discord to continue.');
 const hashed=await hash(token);
 const s=await first<any>('SELECT s.*,m.active FROM sessions s JOIN members m ON m.id=s.member_id WHERE token=? AND expires>?',hashed,now());
 if(!s||!s.active)throw new HttpError(401,'Your session has expired. Sign in again.');
 // Connected Gateway updates invalidate roles immediately; OAuth rechecks writes and periodic reads.
 if(s.oauth&&(env.DISCORD_BOT?.ready||admin||reverify||now()-s.verified>=30))await verifySession(hashed,s.member_id);
 else if(!s.oauth&&!localRequest(request)&&!env.DEMO_SESSION)throw new HttpError(401,'Sign in with Discord to continue.');
 const m=await first<Member>('SELECT id,name,class,avatar,admin,can_host,balance,reserved,new_events FROM members WHERE id=? AND active=1',s.member_id);
 if(!m)throw new HttpError(401,'Account was not found.');if(admin&&!m.admin)throw new HttpError(403,'Administrator access is required.');return m;
}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(!origin||origin!==(env.APP_ORIGIN||new URL(request.url).origin))throw new HttpError(403,'This request must come from the guild application.');}

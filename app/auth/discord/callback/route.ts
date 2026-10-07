import {env} from 'cloudflare:workers';
import {cookie,cookies,createSession,discordIdentity,upsertMember} from '@/lib/auth';
import {first} from '@/lib/database';
import {now} from '@/lib/domain';
export async function GET(request:Request){
 const url=new URL(request.url),state=url.searchParams.get('state'),code=url.searchParams.get('code');
 const deny=(message:string)=>Response.redirect(new URL('/?signin='+encodeURIComponent(message),request.url),303);
 if(!code||!state||cookies(request).pg_oauth!==state)return deny('Discord sign-in was cancelled or expired.');
 const consumed=await first('DELETE FROM oauth_states WHERE state=? AND expires>? RETURNING state',state,now());if(!consumed)return deny('Sign-in expired. Please try again.');
 try{
  const redirect=(env.APP_ORIGIN||url.origin)+'/auth/discord/callback';
  const r=await fetch('https://discord.com/api/v10/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.DISCORD_CLIENT_ID!,client_secret:env.DISCORD_CLIENT_SECRET!,grant_type:'authorization_code',code,redirect_uri:redirect})});
  if(!r.ok)return deny('Discord could not complete sign-in. Please try again.');
  const t:any=await r.json(),m=await discordIdentity(t.access_token);await upsertMember(m);
  const headers=new Headers({Location:'/', 'Cache-Control':'no-store'});headers.append('Set-Cookie',await createSession(m.id,request,{access:t.access_token,refresh:t.refresh_token,expires:now()+t.expires_in}));headers.append('Set-Cookie',cookie('pg_oauth','',0,request));headers.append('Set-Cookie',cookie('pg_demo','',0,request));headers.append('Set-Cookie',cookie('pg_demo_session','',0,request));return new Response(null,{status:303,headers});
 }catch(e){return deny(e instanceof Error?e.message:'Discord sign-in failed.');}
}

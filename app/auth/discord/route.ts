import {env} from 'cloudflare:workers';
import {configReady,cookie} from '@/lib/auth';
import {run} from '@/lib/database';
import {id,now} from '@/lib/domain';
export async function GET(request:Request){
 if(!configReady())return Response.redirect(new URL('/?signin=not-configured',request.url),303);
 const state=id()+id();await run('INSERT INTO oauth_states(state,expires) VALUES(?,?)',state,now()+600);
 const redirect=(env.APP_ORIGIN||new URL(request.url).origin)+'/auth/discord/callback';
 const url=new URL('https://discord.com/oauth2/authorize');url.search=new URLSearchParams({client_id:env.DISCORD_CLIENT_ID!,redirect_uri:redirect,response_type:'code',scope:'identify guilds.members.read',state}).toString();
 return new Response(null,{status:302,headers:{Location:url.toString(),'Set-Cookie':cookie('pg_oauth',state,600,request),'Cache-Control':'no-store'}});
}

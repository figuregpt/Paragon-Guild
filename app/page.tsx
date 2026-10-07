import GuildApp from './guild-app';
import GuildSignIn from './guild-sign-in';
import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {configReady,HttpError,localRequest,requireMember} from '@/lib/auth';

export const dynamic='force-dynamic';
export const revalidate=0;

export default async function Page({searchParams}:{searchParams:Promise<{signin?:string|string[]}>}){
 const requestHeaders=await headers();
 const request=new Request(new URL('/',env.APP_ORIGIN||'https://paragonguild.xyz'),{headers:requestHeaders});
 // Public previews are opt-in and cannot bypass a members-only deployment.
 if(env.MEMBERS_ONLY!=='true'&&(env.DEMO_RUNTIME?.enabled||localRequest(request)))return <GuildApp/>;
 let message:string|undefined;
 try{await requireMember(request,false,true);return <GuildApp/>;}
 catch(error){
  if(error instanceof HttpError){if(error.status!==401)message=error.message;}
  else{console.error('Guild page membership verification failed.');message='Member access could not be verified. Please try again shortly.';}
 }
 const params=await searchParams;
 if(!message&&typeof params.signin==='string')message=params.signin.slice(0,300);
 return <GuildSignIn ready={configReady()} message={message}/>;
}

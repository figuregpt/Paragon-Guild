declare namespace Cloudflare {
 interface Env {
  MEMBERS_ONLY?:string; DEMO_SESSION?:boolean; DEMO_RUNTIME?:{enabled:boolean;login(request:Request,role:string):Promise<Response>;run(request:Request,callback:()=>Promise<Response>):Promise<Response>}; GUILD_BANK_SNAPSHOT?:string; GUILD_SHEET_ID?:string; DB?:D1Database; BUCKET?:R2Bucket; CONNECTORS?:any;
  DISCORD_BOT?:{readonly ready:boolean;readonly version:number;getMembers():Promise<{members:{id:string;name:string;roles:string[];avatar:string|null;bot:boolean}[];version:number;checked:number}>;sendEventCard(event:any,channelId:string,origin:string):Promise<string>;getMember(userId:string):Promise<{id:string;name:string;roles:string[];avatar:string|null}|null>}; DISCORD_BOT_TOKEN?:string; DISCORD_EVENT_CHANNEL_ID?:string; DISCORD_CLIENT_ID?:string; DISCORD_CLIENT_SECRET?:string; DISCORD_GUILD_ID?:string;
  DISCORD_ADMIN_USER_IDS?:string; DISCORD_EVENT_CREATOR_USER_IDS?:string; DISCORD_EVENT_CREATOR_ROLE_IDS?:string; DISCORD_ADMIN_ROLE_IDS?:string; DISCORD_MEMBER_ROLE_IDS?:string; DISCORD_CLASS_ROLES?:string; DISCORD_CONTRIBUTION_NAMES?:string;
  SESSION_SECRET?:string; APP_ORIGIN?:string; VAPID_PUBLIC_KEY?:string; VAPID_PRIVATE_KEY?:string; VAPID_SUBJECT?:string;
  SCHEDULER_SECRET?:string; SCHEDULER_ENABLED?:string;
 }
}

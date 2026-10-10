import {notificationCard} from './event-card.mjs';
import {notificationChannels,notificationRole,snowflake} from './discord-routing.mjs';
import {Client,Events,GatewayIntentBits,Status} from 'discord.js';

// Guild membership reads and event/auction cards only. No role edits or moderation commands.
export function membershipReader(client,guildId){
 const cache=new Map(),pending=new Map();let generation=0,roster,rosterPending;
 const clear=()=>{generation++;cache.clear();pending.clear();};
 const ready=()=>client.isReady()&&client.ws.status===Status.Ready&&Boolean(client.guilds.cache.get(guildId))&&client.guilds.cache.get(guildId).available!==false;
 const identity=member=>({id:member.id,name:member.nickname||member.user.globalName||member.user.username,roles:[...member.roles.cache.keys()].filter(id=>id!==guildId),avatar:member.user.avatar?`https://cdn.discordapp.com/avatars/${member.id}/${member.user.avatar}.png`:null,bot:Boolean(member.user.bot)});
 client.on(Events.ClientReady,clear);client.on(Events.ShardDisconnect,clear);client.on(Events.ShardReconnecting,clear);client.on(Events.ShardResume,clear);client.on(Events.Invalidated,clear);
 client.on(Events.GuildUnavailable,guild=>{if(guild.id===guildId)clear();});client.on(Events.GuildDelete,guild=>{if(guild.id===guildId)clear();});client.on(Events.GuildRoleDelete,role=>{if(role.guild.id===guildId)clear();});
 client.on(Events.GuildMemberUpdate,(_old,member)=>{if(member.guild.id!==guildId)return;generation++;if(cache.has(member.id))cache.set(member.id,identity(member));});
 client.on(Events.GuildMemberRemove,member=>{if(member.guild.id!==guildId)return;generation++;if(cache.has(member.id)||pending.has(member.id))cache.set(member.id,null);});
 client.on(Events.GuildMemberAdd,member=>{if(member.guild.id!==guildId)return;generation++;if(cache.has(member.id))cache.set(member.id,identity(member));});
 client.on(Events.UserUpdate,(_old,user)=>{const previous=cache.get(user.id);if(previous){generation++;cache.delete(user.id);}});
 return {get ready(){return ready();},get version(){return generation;},async getMembers(){
  if(!ready())throw new Error('Discord membership connection is unavailable.');
  if(roster?.version===generation&&Date.now()-roster.checked<300000)return roster;
  if(rosterPending)return rosterPending;
  const operation=(async()=>{
   const version=generation,guild=client.guilds.cache.get(guildId),members=[];let after;
   while(true){
    const page=await guild.members.list({limit:1000,...(after?{after}:{})});
    for(const member of page.values())members.push(identity(member));
    if(members.length>5000)throw new Error('Guild roster exceeds the supported limit.');
    if(page.size<1000)break;
    const next=page.last?.()?.id||[...page.values()].at(-1)?.id;
    if(!next||next===after)throw new Error('Guild roster pagination did not advance.');after=next;
   }
   if(!ready()||generation!==version)throw new Error('Guild membership changed while reading the roster.');
   for(const member of members)cache.set(member.id,member);
   roster={members,version,checked:Date.now()};return roster;
  })();rosterPending=operation;try{return await operation;}finally{if(rosterPending===operation)rosterPending=undefined;}
 },async deliverCard(entity,channelId,origin,{messageId,purpose='card',part=0,image,evidence=[]}={}){
  if(!ready())throw new Error('Discord membership connection is unavailable.');
  if(!snowflake(channelId)||!Object.values(notificationChannels(process.env)).includes(channelId))throw new Error('Invalid notification channel.');
  const channel=await client.channels.fetch(channelId);
  if(!channel||channel.guildId!==guildId||!channel.isTextBased()||typeof channel.send!=='function')throw new Error('Notification channel is unavailable.');
  const imageName=image?'item.'+image.extension:undefined;
  const proofs=entity.entity_type==='event'&&['approved','rejected'].includes(entity.phase)?evidence:[];
  if(proofs.length>3||new Set(proofs.map(p=>p.name)).size!==proofs.length||proofs.some(p=>!/^evidence-[a-zA-Z0-9-]+\.(png|jpg|webp)$/.test(p.name)||!p.bytes?.length||p.bytes.length>8000000))throw new Error('Invalid screenshot evidence.');
  const files=[...(image?[{attachment:Buffer.from(image.bytes),name:imageName}]:[]),...proofs.map(p=>({attachment:Buffer.from(p.bytes),name:p.name,description:'Event screenshot evidence'}))];
  const card=notificationCard(entity,origin,{roleId:notificationRole(process.env),purpose,part,mention:!messageId,imageName,evidenceNames:proofs.map(p=>p.name)});
  if(messageId){
   if(!snowflake(messageId))throw new Error('Invalid notification message.');
   const message=await channel.messages.fetch(messageId);
   if(message.author.id!==client.user.id)throw new Error('Only this bot’s cards can be updated.');
   delete card.nonce;delete card.enforceNonce;
   // Retain the original Member mention as text while suppressing new pings on edits.
   card.content=message.content;
   const attachments=[...(message.attachments?.values()||[])];
   // Discord can promote attached images into embed media and omit them from attachments.
   const existingImage=name=>attachments.find(a=>a.name===name)?.url||message.embeds?.map(e=>e.image?.url).find(value=>{
    try{const url=new URL(value);return url.protocol==='https:'&&['cdn.discordapp.com','media.discordapp.net'].includes(url.hostname)&&decodeURIComponent(url.pathname).endsWith('/'+name);}catch{return false;}
   });
   const missing=files.filter(file=>!existingImage(file.name));
   for(const embed of card.embeds){if(embed.image?.url.startsWith('attachment://')){const previous=existingImage(embed.image.url.slice('attachment://'.length));if(previous)embed.image={url:previous};}}
   if(missing.length){card.attachments=attachments.map(a=>({id:a.id}));card.files=missing;}
   if(entity.entity_type==='auction'){const previous=existingImage(imageName||'item.png')||existingImage('item.jpg')||existingImage('item.webp')||attachments[0]?.url;if(previous)card.embeds[0].image={url:previous};}
   await message.edit(card);return message.id;
  }
  // A stable nonce covers short retries; inspect recent own cards to recover after a restart.
  const recent=await channel.messages.fetch({limit:100});
  const existing=recent.find(message=>message.author.id===client.user.id&&message.components?.[0]?.components?.[0]?.url===card.components[0].components[0].url&&message.embeds?.[0]?.footer?.text===card.embeds[0].footer.text);
  if(existing)return this.deliverCard(entity,channelId,origin,{messageId:existing.id,purpose,part,image,evidence});
  if(files.length)card.files=files;
  const message=await channel.send(card);return message.id;
 },async getMember(userId){
  if(!ready())throw new Error('Discord membership connection is unavailable.');
  if(cache.has(userId))return cache.get(userId);
  if(pending.has(userId))return pending.get(userId);
  const operation=(async()=>{
   const version=generation;let value;
   try{const guild=client.guilds.cache.get(guildId);if(!guild)throw new Error('Guild unavailable');value=identity(await guild.members.fetch({user:userId,force:true}));}
   catch(error){if(error.code===10007)value=null;else{console.warn('Discord bot membership read failed:',Number(error.status)||'connection');throw new Error('Discord membership could not be verified.');}}
   // Never return an old REST result after a Gateway role update or disconnect.
   if(!ready())throw new Error('Discord membership connection is unavailable.');
   if(generation!==version){if(cache.has(userId))return cache.get(userId);throw new Error('Discord membership changed; retry verification.');}
   if(cache.size>=1000)cache.delete(cache.keys().next().value);cache.set(userId,value);return value;
  })();pending.set(userId,operation);try{return await operation;}finally{if(pending.get(userId)===operation)pending.delete(userId);}
 }};
}
let singleton;
export function getDiscordBot(){
 if(!process.env.DISCORD_BOT_TOKEN||!process.env.DISCORD_GUILD_ID)return undefined;
 if(singleton)return singleton;
 const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers],rest:{timeout:10000,retries:2},failIfNotExists:true});
 singleton=membershipReader(client,process.env.DISCORD_GUILD_ID);
 client.on(Events.Error,()=>console.warn('Discord bot connection error. Check bot settings and Server Members Intent.'));
 client.on(Events.ClientReady,()=>console.info('Discord membership bot connected.'));
 client.login(process.env.DISCORD_BOT_TOKEN).catch(()=>console.warn('Discord bot login failed. OAuth verification remains available.'));
 return singleton;
}

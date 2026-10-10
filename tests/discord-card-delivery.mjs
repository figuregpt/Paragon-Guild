import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Status} from 'discord.js';
import {membershipReader} from '../lib/railway/discord-bot.mjs';
const guild='100000000000000001',channelId='100000000000000002',role='100000000000000003',botId='100000000000000004';
const saved={routes:process.env.DISCORD_NOTIFICATION_CHANNELS,role:process.env.DISCORD_NOTIFICATION_ROLE_ID};
process.env.DISCORD_NOTIFICATION_CHANNELS=JSON.stringify({Help:channelId,Auction:channelId});process.env.DISCORD_NOTIFICATION_ROLE_ID=role;
const client=new EventEmitter();client.user={id:botId};client.isReady=()=>true;client.ws={status:Status.Ready};client.guilds={cache:new Map([[guild,{}]])};
let posts=0,edits=0,uploads=0,loseResponse=false,wrongGuild=false;const stored=new Map();
const addFiles=(message,payload)=>{if(payload.attachments)message.attachments=new Map([...message.attachments].filter(([id])=>payload.attachments.some(a=>a.id===id)));for(const file of payload.files||[]){uploads++;const id=String(100000000000002000n+BigInt(uploads));message.attachments.set(id,{id,name:file.name,url:'https://cdn.discordapp.com/attachments/channel/file/'+file.name});}};
const channel={guildId:guild,isTextBased:()=>true,messages:{fetch:async key=>typeof key==='string'?stored.get(key):{find:predicate=>[...stored.values()].find(predicate)}},send:async payload=>{
 posts++;const id=String(100000000000000100n+BigInt(posts)),message={id,author:{id:botId},content:payload.content,components:payload.components,embeds:payload.embeds,attachments:new Map(),edit:async value=>{edits++;assert.equal(value.allowedMentions.roles.length,0);assert.equal(value.allowedMentions.users.length,0);assert.equal(value.content,message.content);message.components=value.components;message.embeds=value.embeds;addFiles(message,value);return message;}};addFiles(message,payload);stored.set(id,message);if(loseResponse){loseResponse=false;throw new Error('lost response');}return message;
}};
client.channels={fetch:async()=>wrongGuild?{...channel,guildId:'100000000000000999'}:channel};const bot=membershipReader(client,guild);
const entity={id:'test-id',entity_type:'event',title:'Safe test',kind:'Help',phase:'open',pp:10,starts:Math.floor(Date.now()/1000),created:Math.floor(Date.now()/1000),created_by:'100000000000000005',creator_name:'Test',people:[]};
try{
 await assert.rejects(bot.deliverCard(entity,'100000000000000999','https://paragon.example'));assert.equal(posts,0);
 wrongGuild=true;await assert.rejects(bot.deliverCard(entity,channelId,'https://paragon.example'));wrongGuild=false;assert.equal(posts,0);
 loseResponse=true;await assert.rejects(bot.deliverCard(entity,channelId,'https://paragon.example'));assert.equal(posts,1);
 // A later retry locates the existing own card, updates its latest status quietly and does not resend.
 const id=await bot.deliverCard({...entity,phase:'pending'},channelId,'https://paragon.example');assert.equal(posts,1);assert.equal(edits,1);assert.equal(stored.get(id).embeds[0].fields[0].value,'Awaiting admin approval');
 await bot.deliverCard({...entity,phase:'approved',review_note:'Confirmed by admin.'},channelId,'https://paragon.example',{messageId:id});assert.equal(posts,1);assert.equal(edits,2);assert.equal(stored.get(id).embeds[0].fields.find(f=>f.name==='Admin Note').value,'Confirmed by admin.');
 const evidence=['png','jpg','webp'].map((extension,i)=>({name:`evidence-proof-${i}.${extension}`,bytes:new Uint8Array([1,2,3])}));
 const reviewed={...entity,phase:'approved',review_note:'Confirmed by admin.'};
 await bot.deliverCard(reviewed,channelId,'https://paragon.example',{messageId:id,evidence:evidence.slice(0,1)});assert.equal(uploads,1);
 await bot.deliverCard(reviewed,channelId,'https://paragon.example',{messageId:id,evidence});assert.equal(uploads,3);assert.equal(stored.get(id).attachments.size,3);assert.equal(stored.get(id).embeds.length,3);
 for(let i=0;i<3;i++)assert.ok(stored.get(id).embeds[i].image.url.endsWith(evidence[i].name));
 await bot.deliverCard(reviewed,channelId,'https://paragon.example',{messageId:id,evidence});assert.equal(uploads,3);assert.equal(stored.get(id).attachments.size,3);
 // Discord returns embedded media without normal attachment records: retain their CDN URLs.
 stored.get(id).embeds=stored.get(id).embeds.map((embed,i)=>({...embed,image:{url:'https://cdn.discordapp.com/attachments/channel/file/'+evidence[i].name}}));stored.get(id).attachments.clear();
 await bot.deliverCard(reviewed,channelId,'https://paragon.example',{messageId:id,evidence});assert.equal(uploads,3);assert.equal(stored.get(id).attachments.size,0);assert.ok(stored.get(id).embeds.every(e=>e.image.url.startsWith('https://cdn.discordapp.com/')));
 // A result sent successfully with a lost response recovers the existing files without uploading them again.
 loseResponse=true;await assert.rejects(bot.deliverCard(reviewed,channelId,'https://paragon.example',{purpose:'result',evidence}));assert.equal(posts,2);assert.equal(uploads,6);
 await bot.deliverCard(reviewed,channelId,'https://paragon.example',{purpose:'result',evidence});assert.equal(posts,2);assert.equal(uploads,6);
 await assert.rejects(bot.deliverCard(reviewed,channelId,'https://paragon.example',{messageId:id,evidence:[{name:'../private.png',bytes:new Uint8Array([1])}]}));
 const editCount=edits;
 stored.get(id).author.id='100000000000000008';await assert.rejects(bot.deliverCard(entity,channelId,'https://paragon.example',{messageId:id}));assert.equal(edits,editCount);
 process.env.DISCORD_NOTIFICATION_CHANNELS='{"Help":"bad"}';await assert.rejects(bot.deliverCard(entity,channelId,'https://paragon.example'));
 console.log('PASS: configured channels only, same-guild check, own-message edits only, lost-response recovery without duplicate posts, recovered card updated to latest state and edits suppress all pings. Three screenshot attachments, partial attachment retention, quiet retries without reuploads, and result recovery verified. All Discord operations mocked.');
}finally{for(const [key,value] of [['DISCORD_NOTIFICATION_CHANNELS',saved.routes],['DISCORD_NOTIFICATION_ROLE_ID',saved.role]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}}

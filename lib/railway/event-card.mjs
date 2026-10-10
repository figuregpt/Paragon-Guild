import {createHash} from 'node:crypto';
import {snowflake} from './discord-routing.mjs';
export const RESULT_PAGE_SIZE=70;
const text=(value,length=80)=>String(value||'').replace(/([\\*_`~|])/g,'\\$1').slice(0,length);
const member=p=>snowflake(p.member_id)?`<@${p.member_id}>`:text(p.name||'Guild Member',50);
const link=(entity,origin)=>{
 const url=new URL('/?view='+(entity.entity_type==='auction'?'auctions&auction=':'events&event=')+encodeURIComponent(entity.id),origin);
 if(url.protocol!=='https:')throw new Error('Invalid announcement origin.');return url;
};
export function eventStatus(event,time=Math.floor(Date.now()/1000)){
 if(event.phase==='approved')return 'Approved · PP awarded';
 if(event.phase==='rejected')return 'Rejected · No PP awarded';
 if(event.phase==='cancelled')return 'Cancelled';
 if(event.phase==='pending')return 'Awaiting admin approval';
 if(event.phase==='confirming')return 'Ended · Confirming attendance';
 if(event.starts>time)return 'Upcoming';
 if(event.duration_minutes&&event.starts+event.duration_minutes*60<=time)return 'Awaiting creator completion';
 return 'Ongoing';
}
function participantFields(people){
 const fields=[];
 for(const [label,subset] of [['PP awarded',people.filter(p=>p.awarded>0)],['No PP awarded',people.filter(p=>!p.awarded)]]){
  let value='';for(const person of subset){const line=member(person)+(person.awarded>0?` · +${person.awarded} PP`:person.decision==='rejected'?' · Rejected':' · Not confirmed');
   if(value.length+line.length+1>1000){fields.push({name:label,value,inline:false});value='';}value+=(value?'\n':'')+line;
  }if(value)fields.push({name:label,value,inline:false});
 }return fields;
}
export function notificationCard(entity,origin,{roleId,purpose='card',part=0,mention=true,time=Math.floor(Date.now()/1000),imageName,evidenceNames=[]}={}){
 if(roleId!==undefined&&!snowflake(roleId))throw new Error('Invalid notification role.');
 const auction=entity.entity_type==='auction',result=purpose==='result',url=link(entity,origin),allPeople=entity.people||[],people=result?allPeople.slice(part*RESULT_PAGE_SIZE,(part+1)*RESULT_PAGE_SIZE):[],users=result?people.map(p=>p.member_id).filter(snowflake):[];
 let title=entity.title||entity.item_name||'Guild Auction',fields=[],description='';
 if(auction){
  const closed=entity.status==='closed',cancelled=entity.status==='cancelled';
  fields=[{name:'Status',value:closed?'Ended':cancelled?'Cancelled':'Bidding open',inline:true},{name:'Item',value:text(entity.item_name||title,100)+(entity.quantity>1?` × ${entity.quantity}`:''),inline:true}];
  if(entity.winner){fields.push({name:closed?'Winner':'Highest Bid',value:(snowflake(entity.winner)?`<@${entity.winner}>`:text(entity.winner_name||'Guild Member'))+` · ${entity.current} PP`,inline:false});}
  else fields.push({name:'Bids',value:'No bids yet',inline:false});
  if(!closed&&!cancelled)fields.push({name:'Minimum / Next Bid',value:`${entity.current?entity.current+entity.increment:entity.minimum} PP · Step ${entity.increment} PP`,inline:true},{name:'Ends',value:`<t:${entity.ends}:F>\n<t:${entity.ends}:R>`,inline:true});
  description=cancelled?'Reserved PP released.':closed?(entity.winner?`${entity.current} PP charged to the winner. Other bidders keep their PP.`:'No bids. No PP charged.'):'Only the winner pays when this auction ends.';
  if(result)title='Auction Result · '+title;
 }else{
  const location=text(entity.location||'To be announced',100)+(entity.game_channel?' · CH-'+entity.game_channel:'');
  fields=[{name:'Status',value:eventStatus(entity,time),inline:false},{name:'Type',value:entity.kind==='PvP'?'Open PvP':entity.kind,inline:true},{name:'Reward',value:entity.pp+' PP per approved member',inline:true},{name:'Location',value:location,inline:false},{name:entity.starts<=time?'Started':'Starts',value:`<t:${entity.starts}:F>\n<t:${entity.starts}:R>`,inline:true}];
  if(entity.duration_minutes&&entity.phase==='open')fields.push({name:'Expected End',value:`<t:${entity.starts+entity.duration_minutes*60}:t> · ${entity.duration_minutes} min`,inline:true});
  fields.push({name:'Hosted by',value:text(entity.creator_name||'Guild Member'),inline:true},{name:'Participants',value:String(entity.participant_count??allPeople.length),inline:true});
  const reviewNote=typeof entity.review_note==='string'?entity.review_note.trim():'';
  if(['approved','rejected'].includes(entity.phase)&&reviewNote)fields.push({name:'Admin Note',value:text(reviewNote,1024),inline:false});
  if(result){title='Event Result · '+title;fields.push(...participantFields(people));description=entity.phase==='cancelled'?'Event cancelled. No PP awarded.':entity.phase==='rejected'?'Admin review complete. No PP awarded.':'Admin review complete. PP added to the approved members’ balances.';}
  else description=entity.description||'';
 }
 if(entity.test)description='TEST ONLY · No real event, bids or PP recorded.\n'+description;
 if(result&&allPeople.length>RESULT_PAGE_SIZE)description+=`\nResults ${part+1} of ${Math.ceil(allPeople.length/RESULT_PAGE_SIZE)}.`;
 const content=mention?[(roleId?`<@&${roleId}>`:''),...users.map(id=>`<@${id}>`)].filter(Boolean).join(' '):undefined;
 const embed={title:(entity.test?'[TEST] ':'')+text(title,entity.test?240:250),url:url.href,color:0xdf3540,description:description.slice(0,1000)||undefined,thumbnail:{url:new URL('/branding/paragon-emblem.png',origin).href},fields,footer:{text:'PARAGON · ARTHION'+(result?' · RESULTS '+(part+1):'')},timestamp:new Date((entity.reviewed||entity.created)*1000).toISOString(),...(auction&&imageName?{image:{url:'attachment://'+imageName}}:{})};
 const proofs=!auction&&['approved','rejected'].includes(entity.phase)?evidenceNames.slice(0,3):[];
 if(proofs.length)embed.image={url:'attachment://'+proofs[0]};
 const embeds=[embed,...proofs.slice(1).map(name=>({url:url.href,image:{url:'attachment://'+name},color:embed.color}))];
 return {content:content||undefined,embeds,components:[{type:1,components:[{type:2,style:5,label:auction?'Open Auction':'Open Event',url:url.href}]}],allowedMentions:{parse:[],roles:mention&&roleId?[roleId]:[],users:mention?users:[],repliedUser:false},nonce:createHash('sha256').update(`paragon:${auction?'auction':'event'}:${entity.id}:${purpose}:${part}`).digest('hex').slice(0,24),enforceNonce:true};
}
export function eventCard(event,origin,options={}){return notificationCard({...event,entity_type:'event',phase:event.phase||'open'},origin,options);}

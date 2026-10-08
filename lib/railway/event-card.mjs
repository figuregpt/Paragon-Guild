import {createHash} from 'node:crypto';
export function eventCard(event,origin){
 const url=new URL('/?view=events&event='+encodeURIComponent(event.id),origin);
 if(url.protocol!=='https:'||!/^\d{17,20}$/.test(event.created_by))throw new Error('Invalid event announcement configuration.');
 const location=(event.location||'To be announced')+(event.game_channel?' · CH-'+event.game_channel:'');
 const fields=[{name:'Type',value:event.kind==='PvP'?'Open PvP':event.kind,inline:true},{name:'Reward',value:event.pp+' PP per approved member',inline:true},{name:'Location',value:location,inline:false},{name:event.kind==='Help'?'Started':'Starts',value:`<t:${event.starts}:F>\n<t:${event.starts}:R>`,inline:true}];
 if(event.duration_minutes)fields.push({name:'Expected End',value:`<t:${event.starts+event.duration_minutes*60}:t> · ${event.duration_minutes} min`,inline:true});
 fields.push({name:'Hosted by',value:event.creator_name.slice(0,80),inline:false});
 return {embeds:[{title:event.title.slice(0,80),url:url.href,color:0xdf3540,...(event.description?{description:event.description.slice(0,500)}:{}),thumbnail:{url:new URL('/branding/paragon-emblem.png',origin).href},fields,footer:{text:'PARAGON · ARTHION'},timestamp:new Date(event.created*1000).toISOString()}],components:[{type:1,components:[{type:2,style:5,label:'Open Event',url:url.href}]}],allowedMentions:{parse:[]},nonce:createHash('sha256').update('paragon-event:'+event.id).digest('hex').slice(0,24),enforceNonce:true};
}

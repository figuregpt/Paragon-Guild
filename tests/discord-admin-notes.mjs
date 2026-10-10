import assert from 'node:assert/strict';
import {eventCard,notificationCard,RESULT_PAGE_SIZE} from '../lib/railway/event-card.mjs';
const time=Math.floor(Date.now()/1000),origin='https://paragon.example',roleId='100000000000000001';
const event={id:'isolated-note-test',created:time,reviewed:time,starts:time-60,title:'Example',creator_name:'Test Creator',pp:1000000,phase:'approved'};
const field=card=>card.embeds[0].fields.find(f=>f.name==='Admin Note');
const note='  Confirmed!\nTürkçe ve Ελληνικά: **literal** `text` @everyone <@100000000000000002>  ';
const escape=s=>s.replace(/([\\*_`~|])/g,'\\$1');
for(const kind of ['Help','Demon Tower','PvE','PvP','Guild War','World Boss','Custom'])for(const phase of ['approved','rejected'])for(const purpose of ['card','result']){
 const card=eventCard({...event,kind,phase,review_note:note},origin,{purpose,roleId,mention:false});
 assert.deepEqual(field(card),{name:'Admin Note',value:escape(note.trim()),inline:false});
 assert.deepEqual(card.allowedMentions,{parse:[],roles:[],users:[],repliedUser:false});assert.equal(card.content,undefined);
 const long='*'.repeat(500),people=Array.from({length:201},(_,n)=>({member_id:String(10000000000000000000n+BigInt(n)),awarded:1000000,decision:'approved'}));
 for(let part=0;part<(purpose==='result'?Math.ceil(people.length/RESULT_PAGE_SIZE):1);part++){
  const embed=eventCard({...event,title:'*'.repeat(100),creator_name:'*'.repeat(80),description:'x'.repeat(2000),location:'*'.repeat(100),kind,phase,review_note:long,people},origin,{purpose,part}).embeds[0];
  assert.equal(field({embeds:[embed]}).value,escape(long));assert.ok(embed.fields.every(f=>f.value.length<=1024));assert.ok(embed.fields.length<=25);
  assert.ok([embed.title,embed.description||'',embed.footer.text,...embed.fields.flatMap(f=>[f.name,f.value])].reduce((a,b)=>a+b.length,0)<=6000);
 }
}
for(const review_note of [undefined,null,'','  \n\t  ',42])assert.equal(field(eventCard({...event,kind:'Help',review_note},origin)),undefined);
for(const phase of ['open','confirming','pending','cancelled'])assert.equal(field(eventCard({...event,kind:'Help',phase,review_note:'Not a completed admin review'},origin)),undefined);
assert.equal(field(notificationCard({...event,entity_type:'auction',status:'closed',item_name:'Test item',review_note:note},origin)),undefined);
console.log('PASS admin notes: all 7 event types, main/result cards and paginated results, approved/rejected reviews, blank/pre-review omission, complete 500-character notes, escaped Markdown, preserved Unicode/newlines, Discord embed limits and unchanged mentions.');

// Screenshot evidence is delivered as message attachments, never duplicated in event embeds.
for(const phase of ['open','confirming','pending','approved','rejected','cancelled'])for(const purpose of ['card','result']){
 const entity={entity_type:'event',id:'proof-test',kind:'Help',title:'Proof test',pp:10,phase,starts:1700000000,created:1700000000};
 const card=notificationCard(entity,'https://paragon.example',{purpose});
 assert.equal(card.embeds.length,1);assert.equal(card.embeds[0].image,undefined);
}
const auction=notificationCard({entity_type:'auction',id:'item-test',status:'open',item_name:'Sword',created:1700000000},'https://paragon.example',{imageName:'item.png'});
assert.equal(auction.embeds[0].image.url,'attachment://item.png');
console.log('PASS: no screenshot images in event embeds; auction item preview preserved.');

import {randomUUID} from 'node:crypto';
// Entirely fictional fixtures. Never read the private guild bank snapshot.
export function seedDemo(database){
 const db=database.connection,t=Math.floor(Date.now()/1000);
 const sql=(query,...args)=>db.prepare(query).run(...args);
 db.exec('BEGIN IMMEDIATE');try{
 const classes=['Shaman','Sura','Ninja','Warrior'],names=['Aether','Kael','Nyx','Ragnar'];
 for(let i=0;i<4;i++){
  const id=i===0?'demo-leader':i===1?'demo-member':'demo-'+i,name=names[i]||'Adventurer '+String(i+1).padStart(2,'0');
  sql('INSERT INTO members(id,name,class,admin,can_host,created) VALUES(?,?,?,?,?,?)',id,name,classes[i%4],i===0?1:0,i===0?1:0,t);
  sql('INSERT INTO ledger(id,member_id,amount,category,label,created) VALUES(?,?,?,?,?,?)','initial:'+id,id,i===0?1240:i===1?980:600,'PvE','Demon Tower / Participation',t-86400);
 }
 for(const [key,name,height,level,classes] of [['poison','Poison Sword',2,75,'Warrior / Ninja / Sura'],['moon','Full Moon Sword',2,30,'Warrior / Ninja / Sura'],['armour','Dragon God Armour',2,61,'Warrior'],['chest','Grim Reaper’s Chest',1,null,'Demon Tower']])sql('INSERT INTO items(id,name,icon,height,level,classes,created) VALUES(?,?,?,?,?,?,?)',key,name,'/metin2/'+key+'.png',height,level,classes,t);
 for(const [item,min,inc] of [['poison',200,20],['armour',130,10],['chest',50,10]]){
  const auction=randomUUID();sql("INSERT INTO auctions(id,item_id,upgrade,source,bonuses,minimum,increment,starts,ends,created_by,created) VALUES(?,?,0,'Demon Tower','',?,?,?,?, 'demo-leader',?)",auction,item,min,inc,t-300,t+7200,t);
  if(item==='poison')for(const [member,amount] of [['demo-leader',200],['demo-3',220]])sql('INSERT INTO bids VALUES(?,?,?,?,?)',randomUUID(),auction,member,amount,t-60);
 }
 for(const [title,type,starts,pp,description] of [['Demon Tower','PvE',t+7200,35,'Gather at the Demon Tower entrance. Join the party and prepare for the raid.'],['Guild War','PvP',t+86400,75,'Join the guild for a practice battle.'],['Demon Tower Training','PvE',t-3600,35,'Leader demo: confirm attendance and award PP for this completed raid.']]){
  const event=randomUUID();sql("INSERT INTO events(id,title,type,starts,pp,description,created_by,created,kind,phase,creation_day,location) VALUES(?,?,?,?,?,?,'demo-leader',?,?,'open',?,?)",event,title,type,starts,pp,description,t,type,new Date((t+10800)*1000).toISOString().slice(0,10),type==='PvP'?'Guild War Area':'Demon Tower');
  for(const member of ['demo-member','demo-2'])sql('INSERT INTO event_members(event_id,member_id,joined,attended,created) VALUES(?,?,1,?,?)',event,member,starts<t?1:0,t);
 }
 for(const member of ['demo-leader','demo-member']){
  const deposit=randomUUID();sql("INSERT INTO deposits(id,member_id,yang,pp,kind,note,created) VALUES(?,?,1000000,40,'donation','Demon Tower supplies',?)",deposit,member,t-3600);
  sql("UPDATE deposits SET status='approved',reviewed_by='demo-leader',reviewed=? WHERE id=?",t,deposit);
 }
 sql("INSERT INTO deposits(id,member_id,yang,pp,kind,note,created) VALUES(?,'demo-member',500000,20,'donation','Leader demo: review this deposit',?)",randomUUID(),t);
 const day=new Date((t+10800)*1000).toISOString().slice(0,10),batch='fictional-demo-contributions';
 sql("INSERT INTO sheet_sync(key,batch,checked) VALUES('guild-contributions',?,?)",batch,t);
 for(const [key,name,total] of [['aether','Aether',1000000],['kael','Kael',1500000]])sql('INSERT INTO sheet_people(batch,name_key,name,yang) VALUES(?,?,?,?)',batch,key,name,total);
 for(const [row,key,name,date,amount,note] of [[1,'aether','Aether','2026-01-01',1000000,'Demo donation'],[2,'kael','Kael','2026-01-01',1000000,'Demo donation'],[3,'kael','Kael',day,500000,'Demo weekly contribution']])sql('INSERT INTO sheet_deposits(batch,row,name_key,name,date,yang,note) VALUES(?,?,?,?,?,?,?)',batch,row,key,name,date,amount,note);
 sql("INSERT INTO settings VALUES('notice','Welcome to the Paragon demo. Join a raid, bid on loot, or switch to Guild Leader to manage auctions, PP and events.')");
 db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}

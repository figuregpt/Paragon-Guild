// Explicitly local-only fixture setup. This is never part of deployment migrations.
import {writeFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';import {randomUUID} from 'node:crypto';
const now=Math.floor(Date.now()/1000),event=randomUUID(),past=randomUUID();
const statements=[`INSERT OR IGNORE INTO members(id,name,class,admin,created) VALUES('preview-admin','Aether','Shaman',1,${now}),('preview-member','Kael','Sura',0,${now}),('preview-warrior','Ragnar','Warrior',0,${now}),('preview-ninja','Nyx','Ninja',0,${now})`,
`INSERT OR IGNORE INTO ledger(id,member_id,amount,category,label,created) VALUES('preview:admin','preview-admin',1240,'PvE','Development preview PP',${now}),('preview:member','preview-member',980,'PvE','Development preview PP',${now})`,
`INSERT OR IGNORE INTO items(id,name,icon,height,level,classes,created) VALUES('poison','Poison Sword','/metin2/poison.png',2,75,'Warrior / Ninja / Sura',${now}),('moon','Full Moon Sword','/metin2/moon.png',2,30,'Warrior / Ninja / Sura',${now}),('armour','Dragon God Armour','/metin2/armour.png',2,61,'Warrior',${now}),('chest','Grim Reaper’s Chest','/metin2/chest.png',1,NULL,'Demon Tower',${now})`,
`INSERT INTO events(id,title,type,starts,pp,description,created_by,created) VALUES('${event}','Demon Tower','PvE',${now+7200},80,'Gather at the Demon Tower entrance. Bring your supplies and join the guild party.','preview-admin',${now}),('${past}','Guild War','PvP',${now-3600},60,'Confirm attendance to award participation points.','preview-admin',${now-86400})`,
`INSERT INTO event_members(event_id,member_id,joined,created) VALUES('${past}','preview-admin',1,${now}),('${past}','preview-member',1,${now})`,
...['poison','armour','chest'].map((item,i)=>`INSERT INTO auctions(id,item_id,upgrade,source,bonuses,minimum,increment,starts,ends,created_by,created) VALUES('${randomUUID()}','${item}',0,'Demon Tower','',${[200,130,50][i]},${[20,10,10][i]},${now},${now+[8200,21000,29000][i]},'preview-admin',${now})`)
];
const file='.sites-runtime/preview-fixtures.sql';writeFileSync(file,statements.join(';\n')+';\n');
const result=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--file',file],{stdio:'inherit'});process.exit(result.status??1);

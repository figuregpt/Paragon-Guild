import {env} from 'cloudflare:workers';
import {all,first,run} from './database';
import {botMemberIdentity,upsertMember,HttpError} from './auth';
import {memberContributionKey} from './contribution-source.mjs';
import {now,type Member} from './domain';

export async function claimHistoricalContribution(member:Member){
 if(env.DEMO_SESSION||await first('SELECT name_key FROM contribution_baseline_claims WHERE member_id=?',member.id))return;
 const keys=(await all<{name_key:string}>('SELECT name_key FROM contribution_baselines')).map(b=>b.name_key);
 if(!memberContributionKey(member,keys,env.DISCORD_CONTRIBUTION_NAMES))return;
 let name=member.name;
 if(env.DISCORD_BOT_TOKEN){
  try{const identity=await botMemberIdentity(member.id,true);await upsertMember(identity);name=identity.name;}
  catch(error){if(error instanceof HttpError&&error.status===403){await run('UPDATE members SET active=0 WHERE id=?',member.id);await run('DELETE FROM sessions WHERE member_id=?',member.id);}return;}
 }
 const key=memberContributionKey({...member,name},keys,env.DISCORD_CONTRIBUTION_NAMES);if(!key)return;
 // A source name and a Discord account can each receive only one opening balance.
 // Ambiguous character names need a human mapping instead of crediting both accounts.
 const matches=(await all<{id:string;name:string}>('SELECT id,name FROM members WHERE active=1')).filter(m=>memberContributionKey(m,keys,env.DISCORD_CONTRIBUTION_NAMES)===key);
 if(matches.length!==1||matches[0].id!==member.id)return;
 await run('INSERT OR IGNORE INTO contribution_baseline_claims(name_key,member_id,created) SELECT name_key,?,? FROM contribution_baselines WHERE name_key=? AND EXISTS(SELECT 1 FROM members WHERE id=? AND active=1) AND NOT EXISTS(SELECT 1 FROM contribution_baseline_claims WHERE member_id=?)',member.id,now(),key,member.id,member.id);
}

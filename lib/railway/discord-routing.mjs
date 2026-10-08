const snowflake=value=>typeof value==='string'&&/^\d{17,20}$/.test(value);
const kinds=['Help','Demon Tower','PvE','PvP','Guild War','World Boss','Custom','Auction'];
export function notificationChannels(config){
 if(!config.DISCORD_NOTIFICATION_CHANNELS)return snowflake(config.DISCORD_EVENT_CHANNEL_ID)?Object.fromEntries(kinds.filter(k=>k!=='Auction').map(k=>[k,config.DISCORD_EVENT_CHANNEL_ID])):{};
 let parsed;try{parsed=JSON.parse(config.DISCORD_NOTIFICATION_CHANNELS);}catch{throw new Error('Invalid Discord notification routing.');}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||Object.entries(parsed).some(([key,value])=>!kinds.includes(key)||!snowflake(value)))throw new Error('Invalid Discord notification routing.');
 return parsed;
}
export function notificationRole(config){
 const role=config.DISCORD_NOTIFICATION_ROLE_ID||config.DISCORD_MEMBER_ROLE_IDS?.split(',')[0]?.trim();
 if(!snowflake(role))throw new Error('A valid Member notification role is required.');return role;
}
export function notificationChannel(config,entity){return notificationChannels(config)[entity.entity_type==='auction'?'Auction':entity.kind];}
export {snowflake};

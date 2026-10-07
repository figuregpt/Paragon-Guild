export class DiscordRoleError extends Error {
 status:number;
 constructor(status:number,message:string){super(message);this.status=status;}
}
const snowflake=(value:unknown):value is string=>typeof value==='string'&&/^\d{17,20}$/.test(value);
export function parseClassRoles(raw:string|undefined,classes:readonly string[]):Record<string,string[]> {
 let value:unknown;try{value=JSON.parse(raw||'{}');}catch{throw new DiscordRoleError(503,'Class role settings are invalid.');}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new DiscordRoleError(503,'Class role settings are invalid.');
 const result:Record<string,string[]>={},assigned=new Set<string>();
 for(const [name,ids] of Object.entries(value)){
  const list=Array.isArray(ids)?ids:[ids];
  if(!classes.includes(name)||!list.length||!list.every(snowflake))throw new DiscordRoleError(503,'Class role settings are invalid.');
  result[name]=[...new Set(list)];
  for(const id of result[name]){if(assigned.has(id))throw new DiscordRoleError(503,'A class role cannot represent multiple classes.');assigned.add(id);}
 }
 if(!Object.keys(result).length)throw new DiscordRoleError(503,'Class role settings are invalid.');
 return result;
}
export function parseRoleList(raw?:string):string[]{
 const list=raw?.split(',').map(s=>s.trim()).filter(Boolean)||[];
 if(!list.every(snowflake))throw new DiscordRoleError(503,'Guild role settings are invalid.');
 return [...new Set(list)];
}
export function resolveDiscordRoles(memberRoles:unknown,map:Record<string,string[]>,required:string[],admins:string[],allowUnassigned=false){
 if(!Array.isArray(memberRoles)||!memberRoles.every(snowflake))throw new DiscordRoleError(403,'Discord membership roles could not be verified.');
 if(required.length&&!required.some(id=>memberRoles.includes(id)))throw new DiscordRoleError(403,'Your Discord account does not have a guild member role.');
 const classes=Object.keys(map).filter(name=>map[name].some(id=>memberRoles.includes(id)));
 if(classes.length!==1&&!allowUnassigned)throw new DiscordRoleError(403,'Ask a guild administrator to assign exactly one Arthion class in Discord.');
 return {class:classes.length===1?classes[0]:'Unassigned',admin:admins.some(id=>memberRoles.includes(id))?1:0};
}

export function matchesDiscordAccess(memberRoles:readonly string[],userId:string,roleIds:string[],userIds:string[]){return roleIds.some(role=>memberRoles.includes(role))||userIds.includes(userId);}

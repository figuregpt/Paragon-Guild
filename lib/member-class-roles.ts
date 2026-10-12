import {parseClassRoles} from './discord-roles';
import {CLASSES} from './domain';
export type MemberClassRole={id:string;family:string;name:string};
// Verified class-role labels. Used only as a cosmetic fallback if OAuth supplies IDs alone.
export const CLASS_ROLE_NAMES:Record<string,string>={
 '1480604321627373619':'Warrior - Mental','1480604146569842750':'Warrior - Aura (Body)',
 '1480605021983997983':'Ninja - Dagger','1480604825891766292':'Ninja - Archer',
 '1480604554541269002':'Sura - Weapon','1480604668651634873':'Sura - BM',
 '1480603704099864769':'Shaman - Healer','1480603972715942141':'Shaman - Dragon',
};
export function memberClassRoles(roles:unknown,rawMap:string|undefined,names?:Record<string,string>):MemberClassRole[]{
 if(!Array.isArray(roles))return [];
 const map=parseClassRoles(rawMap,CLASSES);
 return Object.entries(map).flatMap(([family,ids])=>ids.filter(id=>roles.includes(id)).map(id=>({id,family,name:(names?.[id]||CLASS_ROLE_NAMES[id]||family).slice(0,100)})));
}
export const memberRoleLabel=(member:{class:string;class_roles?:MemberClassRole[]},translate:(name:string)=>string)=>member.class_roles?.length?member.class_roles.map(r=>translate(r.name)).join(' / '):translate(member.class);

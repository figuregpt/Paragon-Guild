import {localeTag} from './i18n';
// Browser consumers format stored UTC timestamps in the device's current zone.
export const localTimeZone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone;
export const localTime=(seconds:number)=>new Intl.DateTimeFormat(localeTag(),{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(seconds*1000));
export const localDatePart=(seconds:number,part:'day'|'month')=>new Intl.DateTimeFormat(localeTag(),{[part]:part==='day'?'2-digit':'short'}).format(new Date(seconds*1000));
export function localInputTimestamp(value:string){
 const d=new Date(value);
 if(!Number.isFinite(d.getTime()))throw new Error('Choose a valid event date and time.');
 const pad=(n:number)=>String(n).padStart(2,'0');
 const actual=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
 if(actual!==value.slice(0,16))throw new Error('That local time does not exist in your time zone. Choose another time.');
 return Math.floor(d.getTime()/1000);
}

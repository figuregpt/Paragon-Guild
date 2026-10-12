'use client';
import {useId,useState} from 'react';
import {useLanguage} from './language-provider';
import {t,localeTag} from '@/lib/i18n';
import {memberRoleLabel} from '@/lib/member-class-roles';
import type {PublicMember} from '@/lib/member-bonuses';
const normalize=(value:string)=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('en-GB');
export function matchingMembers(members:PublicMember[],query:string){const term=normalize(query.trim());return members.filter(m=>normalize(m.name).includes(term)).sort((a,b)=>Number(normalize(b.name).startsWith(term))-Number(normalize(a.name).startsWith(term))||a.name.localeCompare(b.name,localeTag(),{sensitivity:'base'}));}
export default function MemberSuggestions({members,value,onChange,onSelect,name,disabled=false,selectedIds=[]}:{members:PublicMember[];value:string;onChange:(value:string)=>void;onSelect:(member:PublicMember)=>void;name:string;disabled?:boolean;selectedIds?:string[]}){
 useLanguage();
 const id=useId(),[focused,setFocused]=useState(false),[active,setActive]=useState(-1);
 const suggestions=value.trim()?matchingMembers(members,value).slice(0,8):[];
 const open=focused&&Boolean(value.trim())&&!disabled;
 function select(member:PublicMember){onSelect(member);setFocused(false);setActive(-1);}
 return <div className="pg-member-search"><label className="pg-field"><span>{t('Find a Member')}</span><input role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-activedescendant={open&&active>=0&&suggestions[active]?id+'-'+active:undefined} type="text" name={name} autoComplete="off" spellCheck={false} disabled={disabled} value={value} placeholder={t('Character name…')} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onChange={e=>{onChange(e.target.value);setFocused(true);setActive(-1);}} onKeyDown={e=>{
  if(e.key==='Escape'){e.preventDefault();setFocused(false);setActive(-1);}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setFocused(true);if(suggestions.length)setActive(current=>e.key==='ArrowDown'?(current+1)%suggestions.length:current<0?suggestions.length-1:(current+suggestions.length-1)%suggestions.length);}
  else if(e.key==='Enter'&&open){e.preventDefault();if(suggestions[active<0?0:active])select(suggestions[active<0?0:active]);}
 }}/></label>
 {open&&<div className="pg-member-suggestions"><ul id={id} role="listbox" aria-label={t('Member Suggestions')}>{suggestions.map((member,index)=><li key={member.id} id={id+'-'+index} role="option" aria-selected={active===index} className={active===index?'pg-suggestion-active':''} onMouseDown={e=>e.preventDefault()}><button type="button" tabIndex={-1} disabled={disabled} onClick={()=>select(member)}><span><strong translate="no">{member.name}</strong><small>{memberRoleLabel(member,t)}</small></span>{selectedIds.includes(member.id)&&<span className="pg-suggestion-selected">{t('Selected')}</span>}</button></li>)}</ul>{!suggestions.length&&<p role="status">{t('No matching members.')}</p>}</div>}
 </div>;
}

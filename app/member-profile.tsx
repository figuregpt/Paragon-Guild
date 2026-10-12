'use client';
import Image from 'next/image';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useLanguage} from './language-provider';
import {t,localeTag} from '@/lib/i18n';
import {memberRoleLabel} from '@/lib/member-class-roles';
import {localTime} from '@/lib/local-time';
import {MEMBER_BONUSES,BONUS_CATEGORIES,type MemberProfile as Profile,type PublicMember,type BonusCategory} from '@/lib/member-bonuses';
export default function MemberProfile({memberId,onSaved,identity}:{memberId:string;onSaved?:()=>void;identity?:PublicMember}){
 const {language}=useLanguage();
 const [profile,setProfile]=useState<Profile|null>(null),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false),[selectedBonus,setSelectedBonus]=useState('all'),[values,setValues]=useState<Record<string,string>>({}),[loading,setLoading]=useState(true),[dirty,setDirty]=useState(false);
 const form=useRef<HTMLFormElement>(null);
 useEffect(()=>{if(editing){form.current?.scrollIntoView({block:'nearest',behavior:'instant'});const picker=form.current?.elements.namedItem('bonusSelection');if(picker instanceof HTMLSelectElement)picker.focus({preventScroll:true});}},[editing]);
 const read=useCallback(async(signal?:AbortSignal)=>{const r=await fetch('/api/members/profile?id='+encodeURIComponent(memberId),{cache:'no-store',signal});const j=await r.json() as Profile&{error?:string};if(!r.ok)throw new Error(j.error);return j as Profile;},[memberId]);
 useEffect(()=>{const controller=new AbortController();read(controller.signal).then(setProfile).catch(e=>{if(e.name!=='AbortError'){setError(true);setMessage(e.message);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[read]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function edit(){setValues(Object.fromEntries(MEMBER_BONUSES.map(b=>[b.id,String(profile?.bonuses[b.id]??'')])));setEditing(true);setSelectedBonus(MEMBER_BONUSES[0].id);setMessage('');}
 function discard(){setEditing(false);setDirty(false);setMessage('');}
 async function save(ev:React.FormEvent){ev.preventDefault();if(!profile||busy)return;setBusy(true);setMessage('');setError(false);try{
  const bonuses=Object.fromEntries(MEMBER_BONUSES.map(b=>[b.id,Number(values[b.id]||0)]));
  const r=await fetch('/api/members/bonuses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:profile.revision,bonuses})}),j=await r.json() as {error?:string};if(!r.ok)throw new Error(j.error);
  setProfile(await read());setEditing(false);setDirty(false);setMessage('Bonuses saved.');onSaved?.();
 }catch(e){setError(true);setMessage(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 const filtered=MEMBER_BONUSES.filter(b=>(!editing||selectedBonus==='all'||b.id===selectedBonus)&&(editing||(profile?.bonuses[b.id]??0)>0));
 const selectedIndex=MEMBER_BONUSES.findIndex(b=>b.id===selectedBonus);
 const format=(n:number)=>new Intl.NumberFormat(localeTag(),{maximumFractionDigits:2}).format(n);
 const categories=Object.keys(BONUS_CATEGORIES) as BonusCategory[];
 if(loading)return <section className="pg-members-surface"><p className="pg-empty" role="status">{t('Loading profile…')}</p></section>;
 if(!profile)return <section className="pg-members-surface"><p className="pg-message pg-error" role="alert">{t(message)}</p><button className="pg-button" onClick={()=>void read().then(setProfile).catch(e=>setMessage(e.message))}>{t('Retry')}</button></section>;
 const memberIdentity=identity||profile.member;
 return <section className="pg-members-surface pg-member-profile" aria-label={t('Member Profile')} data-dirty={dirty} data-editing={editing}>
 <header className="pg-member-profile-head"><div className="pg-member-identity"><Image unoptimized src={['Warrior','Ninja','Shaman','Sura'].includes(memberIdentity.class)?'/metin2/'+memberIdentity.class.toLowerCase()+'.png':'/branding/paragon-emblem.png'} width={72} height={90} alt=""/><div><h3 translate="no">{memberIdentity.name}</h3><span>{memberRoleLabel(memberIdentity,t)}</span><p>{memberIdentity.group_name||t('No PvP Group')}</p></div></div>{profile.editable&&!editing&&<button className="pg-button pg-red" onClick={edit}>{t('Edit My Bonuses')}</button>}</header>
 <div className="pg-bonus-intro"><h4>{t('Total Bonuses')}</h4><p>{editing?t('Enter your combined bonuses from all equipment. Max / item is a reference, not a limit on your total.'):t('Equipment totals entered by the player.')}</p>{profile.updated&&<span>{t('Updated {date}',{date:localTime(profile.updated)})}</span>}</div>
 {message&&<p className={'pg-message'+(error?' pg-error':'')} role={error?'alert':'status'}>{t(message)}{error&&message.includes('another tab')&&<button className="pg-button" onClick={()=>void read().then(fresh=>{setProfile(fresh);setValues(Object.fromEntries(MEMBER_BONUSES.map(b=>[b.id,String(fresh.bonuses[b.id]??'')])));setDirty(false);setMessage('');})}>{t('Reload Profile')}</button>}</p>}
 <form ref={form} onSubmit={save}>
 {editing&&<div className="pg-bonus-filters"><label className="pg-field"><span>{t('Select a Bonus')}</span><select name="bonusSelection" disabled={busy} value={selectedBonus} onChange={e=>setSelectedBonus(e.target.value)}><option value="all">{t('All Bonuses')}</option>{MEMBER_BONUSES.map(b=><option key={b.id} value={b.id}>{b.names[language]}</option>)}</select></label></div>}
 {filtered.length?<div className="pg-bonus-sections">{categories.map(c=>{const rows=filtered.filter(b=>b.category===c);return rows.length>0&&<fieldset className="pg-bonus-section" key={c}><legend>{BONUS_CATEGORIES[c][language]}</legend>{rows.map(b=><div className="pg-bonus-row" key={b.id}><label htmlFor={editing?'bonus-'+b.id:undefined}><span>{b.names[language]}</span>{editing&&b.unit!=='boolean'&&<small>{b.max===null?t('No fixed item maximum'):t('Max / item: {value}',{value:format(b.max)+(b.unit==='percent'?'%':'')})}</small>}</label>{editing?<div className="pg-bonus-input">{b.unit==='boolean'?<select id={'bonus-'+b.id} name={b.id} disabled={busy} value={values[b.id]||'0'} onChange={e=>{setValues({...values,[b.id]:e.target.value});setDirty(true);}}><option value="0">{t('No')}</option><option value="1">{t('Yes')}</option></select>:<><input aria-describedby={b.unit==='percent'?'bonus-unit-'+b.id:undefined} id={'bonus-'+b.id} name={b.id} type="number" min={0} max={1000000} step={0.01} inputMode="decimal" autoComplete="off" placeholder="0" disabled={busy} value={values[b.id]||''} onChange={e=>{setValues({...values,[b.id]:e.target.value});setDirty(true);}}/>{b.unit==='percent'&&<span id={'bonus-unit-'+b.id}>%</span>}</>}</div>:<strong className="pg-bonus-value">{b.unit==='boolean'?t('Yes'):format(profile.bonuses[b.id])+(b.unit==='percent'?'%':'')}</strong>}</div>)}</fieldset>;})}</div>:<p className="pg-empty">{t('No bonuses added yet.')}</p>}
 {editing&&selectedIndex>=0&&<div className="pg-bonus-navigation"><button className="pg-button" type="button" disabled={busy||selectedIndex===0} onClick={()=>setSelectedBonus(MEMBER_BONUSES[selectedIndex-1].id)}>{t('Previous Bonus')}</button><span>{selectedIndex+1} / {MEMBER_BONUSES.length}</span><button className="pg-button" type="button" disabled={busy||selectedIndex===MEMBER_BONUSES.length-1} onClick={()=>setSelectedBonus(MEMBER_BONUSES[selectedIndex+1].id)}>{t('Next Bonus')}</button></div>}
 {editing&&<footer className="pg-bonus-save"><span aria-live="polite">{t('{count} bonuses entered',{count:Object.values(values).filter(v=>Number(v)>0).length})}</span><div><button className="pg-button" type="button" disabled={busy} onClick={discard}>{t('Cancel')}</button><button className="pg-button pg-red" type="submit" disabled={busy}>{busy?t('Saving…'):t('Save Bonuses')}</button></div></footer>}
 </form></section>;
}

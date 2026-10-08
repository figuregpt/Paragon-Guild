'use client';
import {useEffect,useState} from 'react';
import {useLanguage} from './language-provider';
import {t,localeTag} from '@/lib/i18n';
import type {DailyCm as Roll} from '@/lib/daily-cm';

export default function DailyCm({initial}:{initial?:Roll}){
 useLanguage();
 const [roll,setRoll]=useState(initial),[refreshing,setRefreshing]=useState(false);
 useEffect(()=>{
  if(!roll)return;
  let active=true,pending=false,timer:ReturnType<typeof setTimeout>;
  const delay=Math.max(0,roll.resetsAt-roll.generatedAt),deadline=performance.now()+delay;
  async function refresh(){
   if(!active||pending)return;
   pending=true;setRefreshing(true);
   try{
    const response=await fetch('/api/daily-cm',{cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Daily CM unavailable');
    const next:Roll=await response.json();
    if(!Number.isInteger(next.cents)||next.cents<0||next.cents>10000||!Number.isFinite(next.resetsAt)||next.resetsAt<=next.generatedAt||next.resetsAt<=roll!.resetsAt)throw new Error('Invalid daily CM');
    if(active){setRoll(next);setRefreshing(false);}
   }catch{if(active)timer=setTimeout(refresh,15000);}
   finally{pending=false;}
  }
  timer=setTimeout(refresh,delay);
  const resume=()=>{if(document.visibilityState==='visible'&&performance.now()>=deadline){clearTimeout(timer);void refresh();}};
  document.addEventListener('visibilitychange',resume);
  return()=>{active=false;clearTimeout(timer);document.removeEventListener('visibilitychange',resume);};
 },[roll]);
 return <p className="pg-pp-meme" title={t('Random daily size, unrelated to PP. Resets at 01:00 Türkiye time.')}>
  {t('PP size: ')}<span aria-live="polite">{!roll||refreshing?t('Refreshing…'):new Intl.NumberFormat(localeTag(),{minimumFractionDigits:2,maximumFractionDigits:2}).format(roll.cents/100)+t(' cm')}</span> <span aria-hidden="true">😏</span>
  <small className="pg-cm-reset">{t('Random · resets at 01:00 TR')}</small>
 </p>;
}

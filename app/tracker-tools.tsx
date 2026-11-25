'use client';

import {useEffect, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {bossGuide, findGuideBoss} from '@/lib/boss-guide';
import {t} from '@/lib/i18n';
import {useLanguage} from './language-provider';
import {useBossTracking} from './boss-tracker-provider';
import BossTracker from './boss-tracker';
import './guide-categories.css';

const maps=[...new Set(bossGuide.map(boss=>boss.mapName))];
function readChannel() {
  const match=typeof window!=='undefined'&&/^#tracker-channel-([1-6])$/.exec(location.hash);
  return match?Number(match[1]):null;
}
function readBoss() {
  if(typeof window==='undefined')return null;
  return findGuideBoss(new URLSearchParams(location.search).get('boss'))?.id??null;
}

export default function TrackerTools({pushEnabled,onEnableNotifications}:{pushEnabled:boolean;onEnableNotifications:()=>void}) {
  useLanguage();
  const {state}=useBossTracking();
  const [selected,setSelected]=useState(readBoss);
  const [focusChannel,setFocusChannel]=useState(readChannel);
  useEffect(()=>{
    if(focusChannel===null||!state)return;
    document.getElementById('tracker-channel-'+focusChannel)?.focus();
    setFocusChannel(null);
  },[focusChannel,state]);
  useEffect(()=>{
    const sync=()=>{setSelected(readBoss());setFocusChannel(readChannel());};
    window.addEventListener('popstate',sync);
    return ()=>window.removeEventListener('popstate',sync);
  },[]);
  useEffect(()=>{
    if(selected||!state)return;
    const recent=state.timers.reduce<typeof state.timers[number]|undefined>((last,timer)=>
      findGuideBoss(timer.boss_id)&&(!last||last.killed<timer.killed)?timer:last,undefined);
    setSelected(recent?.boss_id??bossGuide[0].id);
  },[selected,state]);
  function chooseBoss(id:string) {
    const target='/?'+new URLSearchParams({view:'tools',boss:id});
    if(location.pathname+location.search+location.hash!==target)history.pushState(null,'',target);
    setSelected(id);
    setFocusChannel(null);
  }
  const chosen=findGuideBoss(selected)??bossGuide[0];
  return <div className="gg-guide gt-tools">
    <header className="gg-intro"><h2>{t('Tools')}</h2></header>
    <section className="gt-picker" aria-label={t('My Boss Tracker')}>
      <label><span>{t('Map')}</span><select name="trackerMap" value={chosen.mapName} onChange={event=>chooseBoss(bossGuide.find(boss=>boss.mapName===event.target.value)!.id)}>
        {maps.map(map=><option key={map} value={map}>{t(map)}</option>)}
      </select></label>
      <label><span>{t('Boss')}</span><select id="tools-boss" name="trackerBoss" value={chosen.id} onChange={event=>chooseBoss(event.target.value)}>
        {bossGuide.filter(boss=>boss.mapName===chosen.mapName).map(boss=><option key={boss.id} value={boss.id}>{boss.name}</option>)}
      </select></label>
      <a className="gt-guide-link" href={'/?view=guide&boss='+chosen.id}>{t('Boss details')}<ChevronRight size={15} aria-hidden="true"/></a>
    </section>
    <BossTracker key={chosen.id} bossId={chosen.id} bossName={chosen.name} pushEnabled={pushEnabled} onEnableNotifications={onEnableNotifications}/>
  </div>;
}

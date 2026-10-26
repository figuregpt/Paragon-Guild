'use client';
import {useEffect,useState,type MouseEvent} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,ChevronDown,ImageOff,MapPin,PackageOpen,Search} from 'lucide-react';
import {useLanguage} from './language-provider';
import {t,translate} from '@/lib/i18n';
import {bossGuide,bossFromParams,findGuideBoss,type BossGuideEntry} from '@/lib/boss-guide';
import BossMap from './guide-boss-map';
import GuideDews from './guide-dews';
import GuideUpgrades from './guide-upgrades';
import {ChestContents} from './guide-chests';
import './game-guide.css';
import './boss-guide.css';

type GuideSection='bosses'|'dews'|'upgrades';
const guideSection=(params:URLSearchParams):GuideSection=>params.get('guide')==='dews'?'dews':params.get('guide')==='upgrades'?'upgrades':'bosses';
const normalized=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
function BossArt({boss}:{boss:BossGuideEntry}){
 return <div className="gb-boss-art">{boss.art.image?<img src={boss.art.image} width={220} height={180} alt={boss.name} loading="lazy"/>:<span><ImageOff size={28} aria-hidden="true"/>{t('Boss image pending')}</span>}</div>;
}
function BossDetail({boss,onBack,onSelect}:{boss:BossGuideEntry;onBack:()=>void;onSelect:(id:string)=>void}){
 useLanguage();const [mapOpen,setMapOpen]=useState(()=>typeof window==='undefined'||window.innerWidth>900);
 return <div className="gb-boss-detail"><button type="button" className="gb-back" onClick={onBack}><ArrowLeft size={16} aria-hidden="true"/>{t('All bosses')}</button><header className="gb-detail-heading"><BossArt boss={boss}/><div><span className="gg-kicker">ARTHION / {t('Game Guide')}</span><h2 translate="no">{boss.name}</h2><p><MapPin size={15} aria-hidden="true"/>{t(boss.mapName)}{!boss.mapConfirmed&&<small>{t('Base map reference')}</small>}</p></div></header>
  <div className="gb-detail-columns"><aside className="gb-detail-location"><details open={mapOpen} onToggle={event=>setMapOpen(event.currentTarget.open)} className="gb-map-disclosure"><summary><span><MapPin size={16} aria-hidden="true"/>{t('Map & Spawn Points')}</span><small>{boss.spawn?.points.length?t('{count} points',{count:boss.spawn.points.length}):t('Points pending')}</small><ChevronDown size={15} aria-hidden="true"/></summary>{boss.spawn?<BossMap key={boss.id} boss={boss.spawn}/>:<figure className="gb-base-map"><img src={boss.mapImage} width={256} height={256} alt={t(boss.mapName)}/><figcaption>{t('The Arthion spawn points for this boss have not been supplied yet.')}</figcaption></figure>}</details><section className="gb-direct-drops" aria-labelledby="gb-direct-title"><h3 id="gb-direct-title">{t('Boss Drops')}</h3><p>{t('Direct boss drops have not been added yet.')}</p><span>{t('Shown separately from chest contents.')}</span></section></aside>
   <div className="gb-detail-loot">{boss.chest?<ChestContents key={boss.chest.id} chest={boss.chest} onViewSpawns={onSelect} embedded/>:<section className="gb-no-chest"><PackageOpen size={25} aria-hidden="true"/><h3>{t('Chest Drops')}</h3><p>{t('Chest contents for this boss have not been supplied yet.')}</p></section>}</div>
  </div>
 </div>;
}
export default function GameGuide(){
 useLanguage();const [selected,setSelected]=useState<string|null>(()=>typeof window==='undefined'?null:bossFromParams(new URLSearchParams(window.location.search))?.id??null),[section,setSection]=useState<GuideSection>(()=>guideSection(new URLSearchParams(typeof window==='undefined'?'':window.location.search))),[query,setQuery]=useState(''),[map,setMap]=useState('all');
 const chosen=findGuideBoss(selected),maps=[...new Set(bossGuide.map(boss=>boss.mapName))];
 useEffect(()=>{const update=()=>{const params=new URLSearchParams(location.search);setSelected(bossFromParams(params)?.id??null);setSection(guideSection(params));};window.addEventListener('popstate',update);return()=>window.removeEventListener('popstate',update);},[]);
 function navigate(id:string|null,nextSection:GuideSection='bosses'){setSelected(id);setSection(nextSection);const params=new URLSearchParams({view:'guide'});if(id)params.set('boss',id);if(nextSection!=='bosses')params.set('guide',nextSection);history.pushState(null,'','/?'+params);window.scrollTo({top:0,behavior:'instant'});}
 function openBoss(event:MouseEvent<HTMLAnchorElement>,id:string){if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(id);}
 const search=normalized(query.trim()),matches=bossGuide.filter(boss=>(map==='all'||boss.mapName===map)&&normalized([boss.name,t(boss.mapName),translate(boss.mapName,'en'),translate(boss.mapName,'tr'),translate(boss.mapName,'el'),...(boss.chest?.aliases??[])].join(' ')).includes(search));
 if(chosen&&section==='bosses')return <div className="gg-guide"><BossDetail key={chosen.id} boss={chosen} onBack={()=>navigate(null)} onSelect={id=>navigate(id)}/></div>;
 if(section==='dews')return <div className="gg-guide"><GuideDews onBack={()=>navigate(null)}/></div>;
 if(section==='upgrades')return <div className="gg-guide"><GuideUpgrades onBack={()=>navigate(null)}/></div>;
 return <div className="gg-guide"><header className="gg-intro gb-directory-intro"><div><span className="gg-kicker">ARTHION / {t('Guild knowledge')}</span><h2>{t('Game Guide')}</h2><p>{t('Choose a boss to see its map, drops and chest contents together.')}</p></div><span className="gg-guide-count">{t('{count} bosses',{count:bossGuide.length})}</span></header>
  <div className="gb-guide-links"><Link className="gb-dew-link" href="/?view=guide&guide=dews" onClick={event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(null,'dews');}}><span className="gb-dew-icons" aria-hidden="true"><img src="/guide/dews/red-dew.png" width={32} height={32} alt=""/><img src="/guide/dews/blue-dew.png" width={32} height={32} alt=""/><img src="/guide/dews/green-dew.png" width={32} height={32} alt=""/></span><span><strong>{t('Dews & Potions')}</strong><small>{t('{count} recipes · ingredients and Yang costs',{count:12})}</small></span><ArrowRight size={17} aria-hidden="true"/></Link>
  <Link className="gb-dew-link gb-upgrade-link" href="/?view=guide&guide=upgrades" onClick={event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(null,'upgrades');}}><span className="gb-dew-icons" aria-hidden="true"><img src="/guide/loot/battle-sword.png" width={32} height={64} alt=""/><img src="/guide/upgrades/icons/golden-earrings.png" width={32} height={32} alt=""/></span><span><strong>{t('Item Upgrades')}</strong><small>{t('{count} item types · +5–+9 materials',{count:8})}</small></span><ArrowRight size={17} aria-hidden="true"/></Link></div>
  <div className="gb-directory-tools"><label className="gg-search"><Search size={17} aria-hidden="true"/><input type="search" name="bossSearch" value={query} onChange={event=>setQuery(event.target.value)} placeholder={t('Find a boss or map…')} aria-label={t('Find a boss or map')} autoComplete="off"/></label><label className="gb-map-filter"><span>{t('Map')}</span><select name="guideMapFilter" value={map} onChange={event=>setMap(event.target.value)} aria-label={t('Filter by map')}><option value="all">{t('All maps')}</option>{maps.map(map=><option key={map} value={map}>{t(map)}</option>)}</select></label></div>
  <p className="gb-directory-count" role="status">{t('{count} bosses shown',{count:matches.length})}</p>
  {matches.length?<div className="gb-boss-grid">{matches.map(boss=><a className="gb-boss-card" key={boss.id} href={'/?view=guide&boss='+boss.id} onClick={event=>openBoss(event,boss.id)}><BossArt boss={boss}/><div className="gb-boss-card-copy"><span><MapPin size={12} aria-hidden="true"/>{t(boss.mapName)}</span><h3 translate="no">{boss.name}</h3><div><small>{boss.chest?t('Chest loot available'):boss.spawn?.points.length?t('{count} spawn points',{count:boss.spawn.points.length}):t('Locations pending')}</small><ArrowRight size={16} aria-hidden="true"/></div></div></a>)}</div>:<div className="gg-no-results"><p>{t('No bosses found.')}</p><button className="pg-button" type="button" onClick={()=>{setQuery('');setMap('all');}}>{t('Clear filters')}</button></div>}

 </div>;
}

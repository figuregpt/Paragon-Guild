'use client';
import {useEffect,useState,type MouseEvent} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,ChevronDown,ImageOff,MapPin,PackageOpen,Search} from 'lucide-react';
import {useLanguage} from './language-provider';
import {t,translate} from '@/lib/i18n';
import {bossGuide,bossFromParams,findGuideBoss,type BossKind,type BossGuideEntry} from '@/lib/boss-guide';
import BossMap from './guide-boss-map';
import BossTracker from './boss-tracker';
import GuideDews from './guide-dews';
import GuideUpgrades from './guide-upgrades';
import {ChestContents} from './guide-chests';
import './game-guide.css';
import './boss-guide.css';

type GuideSection='bosses'|'dews'|'upgrades';
const guideSection=(params:URLSearchParams):GuideSection=>params.get('guide')==='dews'?'dews':params.get('guide')==='upgrades'?'upgrades':'bosses';
const directoryParams=()=>{const params=new URLSearchParams(typeof window==='undefined'?'':location.search);return guideSection(params)==='bosses'?params:new URLSearchParams();};
const directoryKind=(value:string|null):BossKind|'all'=>value==='Boss'||value==='Miniboss'?value:'all';
const normalized=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
function BossArt({boss}:{boss:BossGuideEntry}){
 return <div className="gb-boss-art">{boss.art.image?<img src={boss.art.image} width={220} height={180} alt={boss.name} loading="lazy"/>:<span><ImageOff size={28} aria-hidden="true"/>{t('Boss image pending')}</span>}</div>;
}
function BossDetail({boss,onBack,onSelect,pushEnabled,onEnableNotifications}:{boss:BossGuideEntry;onBack:()=>void;onSelect:(id:string)=>void;pushEnabled:boolean;onEnableNotifications:()=>void}){
 useLanguage();const [mapOpen,setMapOpen]=useState(()=>typeof window==='undefined'||window.innerWidth>900);
 return <div className="gb-boss-detail"><button type="button" className="gb-back" onClick={onBack}><ArrowLeft size={16} aria-hidden="true"/>{t('All bosses')}</button><header className="gb-detail-heading"><BossArt boss={boss}/><div><span className="gg-kicker">ARTHION / {t('Game Guide')}</span><h2 translate="no">{boss.name}</h2><p><MapPin size={15} aria-hidden="true"/>{t(boss.mapName)}<span className={'gb-kind-badge gb-kind-'+boss.kind.toLowerCase()}>{t(boss.kind)}</span>{!boss.mapConfirmed&&<small>{t('Base map reference')}</small>}</p></div></header>
  <BossTracker key={boss.id} bossId={boss.id} bossName={boss.name} pushEnabled={pushEnabled} onEnableNotifications={onEnableNotifications}/>
  <div className="gb-detail-columns"><aside className="gb-detail-location"><details open={mapOpen} onToggle={event=>setMapOpen(event.currentTarget.open)} className="gb-map-disclosure"><summary><span><MapPin size={16} aria-hidden="true"/>{t('Map & Spawn Points')}</span><small>{boss.spawn?.points.length?t('{count} points',{count:boss.spawn.points.length}):t('Points pending')}</small><ChevronDown size={15} aria-hidden="true"/></summary>{boss.spawn?<BossMap key={boss.id} boss={boss.spawn}/>:<figure className="gb-base-map"><img src={boss.mapImage} width={256} height={256} alt={t(boss.mapName)}/><figcaption>{t('The Arthion spawn points for this boss have not been supplied yet.')}</figcaption></figure>}</details><section className="gb-direct-drops" aria-labelledby="gb-direct-title"><h3 id="gb-direct-title">{t('Boss Drops')}</h3><p>{t('Direct boss drops have not been added yet.')}</p><span>{t('Shown separately from chest contents.')}</span></section></aside>
   <div className="gb-detail-loot">{boss.chest?<ChestContents key={boss.chest.id} chest={boss.chest} onViewSpawns={onSelect} embedded/>:<section className="gb-no-chest"><PackageOpen size={25} aria-hidden="true"/><h3>{t('Chest Drops')}</h3><p>{t('Chest contents for this boss have not been supplied yet.')}</p></section>}</div>
  </div>
 </div>;
}
export default function GameGuide({pushEnabled,onEnableNotifications}:{pushEnabled:boolean;onEnableNotifications:()=>void}){
 useLanguage();const [selected,setSelected]=useState<string|null>(()=>typeof window==='undefined'?null:bossFromParams(new URLSearchParams(window.location.search))?.id??null),[section,setSection]=useState<GuideSection>(()=>guideSection(new URLSearchParams(typeof window==='undefined'?'':window.location.search))),[query,setQuery]=useState(()=>directoryParams().get('q')??''),[map,setMap]=useState(()=>directoryParams().get('map')??'all'),[kind,setKind]=useState<BossKind|'all'>(()=>directoryKind(directoryParams().get('type')));
 const chosen=findGuideBoss(selected),maps=[...new Set(bossGuide.map(boss=>boss.mapName))];
 useEffect(()=>{const update=()=>{const params=new URLSearchParams(location.search);setSelected(bossFromParams(params)?.id??null);setSection(guideSection(params));const filters=guideSection(params)==='bosses'?params:new URLSearchParams();setQuery(filters.get('q')??'');setMap(filters.get('map')??'all');setKind(directoryKind(filters.get('type')));};window.addEventListener('popstate',update);return()=>window.removeEventListener('popstate',update);},[]);
 function navigate(id:string|null,nextSection:GuideSection='bosses'){setSelected(id);setSection(nextSection);const params=new URLSearchParams({view:'guide'});if(id)params.set('boss',id);if(nextSection!=='bosses')params.set('guide',nextSection);if(!id&&nextSection==='bosses'){if(query.trim())params.set('q',query.trim());if(map!=='all')params.set('map',map);if(kind!=='all')params.set('type',kind);}history.pushState(null,'','/?'+params);window.scrollTo({top:0,behavior:'instant'});}
 function filters(nextQuery=query,nextMap=map,nextKind=kind){setQuery(nextQuery);setMap(nextMap);setKind(nextKind);const params=new URLSearchParams({view:'guide'});if(nextQuery.trim())params.set('q',nextQuery.trim());if(nextMap!=='all')params.set('map',nextMap);if(nextKind!=='all')params.set('type',nextKind);history.replaceState(null,'','/?'+params);}
 function openBoss(event:MouseEvent<HTMLAnchorElement>,id:string){if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(id);}
 const search=normalized(query.trim()),matches=bossGuide.filter(boss=>(map==='all'||boss.mapName===map)&&(kind==='all'||boss.kind===kind)&&normalized([boss.name,t(boss.kind),translate(boss.kind,'en'),translate(boss.kind,'tr'),translate(boss.kind,'el'),t(boss.mapName),translate(boss.mapName,'en'),translate(boss.mapName,'tr'),translate(boss.mapName,'el'),...(boss.chest?.aliases??[])].join(' ')).includes(search));
 if(chosen&&section==='bosses')return <div className="gg-guide"><BossDetail key={chosen.id} boss={chosen} pushEnabled={pushEnabled} onEnableNotifications={onEnableNotifications} onBack={()=>navigate(null)} onSelect={id=>navigate(id)}/></div>;
 if(section==='dews')return <div className="gg-guide"><GuideDews onBack={()=>navigate(null)}/></div>;
 if(section==='upgrades')return <div className="gg-guide"><GuideUpgrades onBack={()=>navigate(null)}/></div>;
 return <div className="gg-guide"><header className="gg-intro gb-directory-intro"><div><span className="gg-kicker">ARTHION / {t('Guild knowledge')}</span><h2>{t('Game Guide')}</h2><p>{t('Choose a boss to see its map, drops and chest contents together.')}</p></div><span className="gg-guide-count">{t('{count} bosses',{count:bossGuide.length})}</span></header>
  <div className="gb-guide-links"><Link className="gb-dew-link" href="/?view=guide&guide=dews" onClick={event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(null,'dews');}}><span className="gb-dew-icons" aria-hidden="true"><img src="/guide/dews/red-dew.png" width={32} height={32} alt=""/><img src="/guide/dews/blue-dew.png" width={32} height={32} alt=""/><img src="/guide/dews/green-dew.png" width={32} height={32} alt=""/></span><span><strong>{t('Dews & Potions')}</strong><small>{t('{count} recipes · ingredients and Yang costs',{count:12})}</small></span><ArrowRight size={17} aria-hidden="true"/></Link>
  <Link className="gb-dew-link gb-upgrade-link" href="/?view=guide&guide=upgrades" onClick={event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(null,'upgrades');}}><span className="gb-dew-icons" aria-hidden="true"><img src="/guide/loot/battle-sword.png" width={32} height={64} alt=""/><img src="/guide/upgrades/icons/golden-earrings.png" width={32} height={32} alt=""/></span><span><strong>{t('Item Upgrades')}</strong><small>{t('{count} item types · +5–+9 materials',{count:8})}</small></span><ArrowRight size={17} aria-hidden="true"/></Link></div>
  <div className="gb-directory-tools"><label className="gg-search"><Search size={17} aria-hidden="true"/><input type="search" name="bossSearch" value={query} onChange={event=>filters(event.target.value)} placeholder={t('Find a boss or map…')} aria-label={t('Find a boss or map')} autoComplete="off"/></label><label className="gb-map-filter"><span>{t('Map')}</span><select name="guideMapFilter" value={map} onChange={event=>filters(query,event.target.value)} aria-label={t('Filter by map')}><option value="all">{t('All maps')}</option>{maps.map(map=><option key={map} value={map}>{t(map)}</option>)}</select></label><label className="gb-map-filter"><span>{t('Boss type')}</span><select name="guideKindFilter" value={kind} onChange={event=>filters(query,map,event.target.value as BossKind|'all')}><option value="all">{t('All types')}</option><option value="Boss">{t('Boss')}</option><option value="Miniboss">{t('Miniboss')}</option></select></label></div>
  <p className="gb-directory-count" role="status">{t('{count} bosses shown',{count:matches.length})}</p>
  {matches.length?<div className="gb-map-groups">{maps.map(mapName=>{
   const entries=matches.filter(boss=>boss.mapName===mapName);if(!entries.length)return null;
   const types=(['Boss','Miniboss'] as const).filter(type=>entries.some(boss=>boss.kind===type));
   return <details className="gb-map-group" key={mapName+':'+map+':'+kind+':'+search}>
    <summary><img src={entries[0].mapImage} width={44} height={44} alt=""/><span className="gb-map-group-title"><h3>{t(mapName)}</h3><span>{types.map(type=><span key={type}>{t(type)} · {entries.filter(boss=>boss.kind===type).length}</span>)}</span></span><ChevronDown size={18} aria-hidden="true"/></summary>
    <div className="gb-map-types" data-types={types.length}>{types.map(type=><section className="gb-type-group" key={type} aria-label={t(mapName)+' · '+t(type)}><header><h4>{t(type)}</h4><span>{entries.filter(boss=>boss.kind===type).length}</span></header><div className="gb-boss-grid">{entries.filter(boss=>boss.kind===type).map(boss=><a className="gb-boss-card" key={boss.id} href={'/?view=guide&boss='+boss.id} onClick={event=>openBoss(event,boss.id)}><BossArt boss={boss}/><div className="gb-boss-card-copy"><span className={'gb-kind-badge gb-kind-'+boss.kind.toLowerCase()}>{t(boss.kind)}</span><h5 translate="no">{boss.name}</h5><div><small>{boss.chest?t('Chest loot available'):boss.spawn?.points.length?t('{count} spawn points',{count:boss.spawn.points.length}):t('Locations pending')}</small><ArrowRight size={16} aria-hidden="true"/></div></div></a>)}</div></section>)}</div>
   </details>;
  })}</div>:<div className="gg-no-results"><p>{t('No bosses found.')}</p><button className="pg-button" type="button" onClick={()=>filters('','all','all')}>{t('Clear filters')}</button></div>}


 </div>;
}

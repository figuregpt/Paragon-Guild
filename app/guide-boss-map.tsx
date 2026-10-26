'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronRight,Maximize2} from 'lucide-react';
import {useLanguage} from './language-provider';
import {t} from '@/lib/i18n';
import {guideMaps,type GuideBoss} from '@/lib/game-guide';
import './game-guide.css';

export default function BossMap({boss}:{boss:GuideBoss}){
 useLanguage();
 const map=guideMaps.find(map=>map.id===boss.map)!;
 const [selected,setSelected]=useState<number|null>(null),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 const [expanded,setExpanded]=useState(false),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(expanded)dialog.current?.showModal();else dialog.current?.close();},[expanded]);
 function pick(index:number){setSelected(index);}
 const terrain=<div className="gg-map-scroll" tabIndex={0} role="region" aria-label={t('Spawn map for {boss}',{boss:boss.name})}>
  <div className={'gg-terrain'+(map.id==='ghost-forest'?' gg-arthion-terrain':'')}>
   <img key={attempt} src={map.image} alt={t(map.name)} width={map.id==='ghost-forest'?290:256} height={map.id==='ghost-forest'?302:256} draggable={false} onError={()=>setFailed(true)}/>
   <div className="gg-map-pins">{boss.points.map((point,index)=><button type="button" key={index} style={{left:point.x+'%',top:point.y+'%'}} className="gg-spawn-pin" aria-label={t('{boss} · Spawn {number}',{boss:boss.name,number:index+1})} aria-pressed={selected===index} onClick={()=>pick(index)}><span>{index+1}</span></button>)}</div>
  </div>
 </div>;
 // Mount one map at a time so focusable pins stay unique in the expanded dialog.
 const mapBody=<>{failed?<div className="gg-map-error" role="alert"><p>{t('The map could not load. Try again.')}</p><button type="button" className="pg-button" onClick={()=>{setFailed(false);setAttempt(n=>n+1);}}>{t('Retry Map')}</button></div>:terrain}</>;
 return <section className="gg-map-panel" aria-labelledby="gg-boss-title">
  <div className="gg-map-heading"><div><span className="gg-kicker">{t(map.name)} <ChevronRight size={12} aria-hidden="true"/> {t('Boss Spawns')}</span><h3 id="gg-boss-title">{boss.name}</h3></div><button className="pg-button" type="button" onClick={()=>setExpanded(true)} aria-label={t('Expand map')}><Maximize2 size={16} aria-hidden="true"/><span>{t('Expand map')}</span></button></div>
  {!expanded&&mapBody}
  <dialog className="gg-expanded" ref={dialog} aria-labelledby="gg-expanded-title" onCancel={()=>setExpanded(false)} onClose={()=>setExpanded(false)}><div className="gg-expanded-heading"><h3 id="gg-expanded-title">{boss.name} · {t(map.name)}</h3><button type="button" className="pg-button" onClick={()=>setExpanded(false)}>{t('Close')}</button></div>{expanded&&mapBody}</dialog>
 </section>;
}


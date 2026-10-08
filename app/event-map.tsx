'use client';
import {useState,type MouseEvent,type KeyboardEvent} from 'react';
import {useLanguage} from './language-provider';
import {t,localeTag} from '@/lib/i18n';
import {mapLabel} from '@/lib/event-locations';
import {eventMapAssets,eventMapAsset,mapPoint,MAP_POSITION_MAX,type MapAsset,type MapPin} from '@/lib/event-maps';

function MapImage({asset,pin,onChange}:{asset:MapAsset;pin:MapPin|null;onChange?:(pin:MapPin|null)=>void}){
 useLanguage();
 const [loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 const title=mapLabel(asset.location)+(asset.variant?' · '+t(asset.variant):'');
 const position=pin?t('Map position: X {x}%, Y {y}%',{x:new Intl.NumberFormat(localeTag(),{maximumFractionDigits:2}).format(pin.x/100),y:new Intl.NumberFormat(localeTag(),{maximumFractionDigits:2}).format(pin.y/100)}):t('No marker selected.');
 function click(event:MouseEvent<HTMLButtonElement>){
  if(!onChange||!loaded||failed)return;
  const box=event.currentTarget.getBoundingClientRect();
  const point=event.detail===0?pin??{x:MAP_POSITION_MAX/2,y:MAP_POSITION_MAX/2}:mapPoint((event.clientX-box.left)/box.width*MAP_POSITION_MAX,(event.clientY-box.top)/box.height*MAP_POSITION_MAX);
  onChange({asset:asset.id,x:point.x,y:point.y});
 }
 function key(event:KeyboardEvent<HTMLButtonElement>){
  if(!onChange||!loaded||failed)return;
  if(['Delete','Backspace'].includes(event.key)){event.preventDefault();onChange(null);return;}
  const direction=({ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]} as Record<string,number[]>)[event.key];
  if(!direction)return;event.preventDefault();const point=pin??{x:MAP_POSITION_MAX/2,y:MAP_POSITION_MAX/2},step=event.shiftKey?500:100;
  onChange({asset:asset.id,...mapPoint(point.x+direction[0]*step,point.y+direction[1]*step)});
 }
 const content=<><img key={attempt} src={asset.src} width={asset.width} height={asset.height} alt={title} draggable={false} onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)}/>{pin&&<span className="pg-map-marker" style={{left:pin.x/100+'%',top:pin.y/100+'%'}} aria-hidden="true"/>}</>;
 return <figure className="pg-map-figure">
  {failed?<div className="pg-map-failure" role="alert"><p>{t('The map could not load. Try again.')}</p><button type="button" className="pg-button" onClick={()=>{setFailed(false);setLoaded(false);setAttempt(attempt+1);}}>{t('Retry Map')}</button></div>:onChange?<button className="pg-map-canvas" type="button" aria-label={t('Mark the meeting point on {map}',{map:title})} aria-describedby="pg-map-instructions pg-map-position" onClick={click} onKeyDown={key} disabled={!loaded}>{content}</button>:<div className="pg-map-canvas pg-map-static" role="img" aria-label={title+' · '+position}>{content}</div>}
  {!loaded&&!failed&&<p className="pg-dim" role="status">{t('Loading map…')}</p>}
  <figcaption>{onChange&&<p id="pg-map-instructions">{t('Tap or click the meeting spot. Use arrow keys to move the marker.')}</p>}<div className="pg-map-caption"><span id={onChange?'pg-map-position':undefined} role="status">{pin?position:t('No marker selected.')}</span>{onChange&&pin&&<button className="pg-text-link" type="button" onClick={()=>onChange(null)}>{t('Remove Marker')}</button>}</div><a href={asset.source} target="_blank" rel="noopener noreferrer" className="pg-map-credit">{t('Map source: Metin2 Wiki')}</a></figcaption>
 </figure>;
}

export function EventMapPicker({location,pin,onChange}:{location:string;pin:MapPin|null;onChange:(pin:MapPin|null)=>void}){
 useLanguage();const assets=eventMapAssets(location),[open,setOpen]=useState(false),[assetId,setAssetId]=useState(assets[0]?.id||'');
 if(!assets.length)return location==='Castle Gate'?<p className="pg-dim pg-span">{t('Castle Gate appears in several areas. Choose the actual map to mark a meeting point.')}</p>:null;
 const asset=assets.find(a=>a.id===assetId)||assets[0];
 return <details className="pg-map-picker pg-span" onToggle={event=>setOpen(event.currentTarget.open)}>
  <summary>{t('Mark Meeting Point (optional)')}{pin&&<span className="pg-green">{t('Marked')}</span>}</summary>
  {open&&<div className="pg-map-picker-body">{assets.length>1&&<label className="pg-field"><span>{t('Battle Map')}</span><select name="mapVariant" value={asset.id} onChange={event=>{setAssetId(event.target.value);onChange(null);}}>{assets.map(a=><option key={a.id} value={a.id}>{t(a.variant||a.location)}</option>)}</select></label>}<MapImage key={asset.id} asset={asset} pin={pin} onChange={onChange}/></div>}
 </details>;
}
export function EventMapView({pin,collapsed=false}:{pin:MapPin;collapsed?:boolean}){
 useLanguage();const asset=eventMapAsset(pin.asset);if(!asset)return null;
 return <details className="pg-event-map" open={!collapsed}><summary><h4>{t('Meeting Point')}</h4></summary><MapImage asset={asset} pin={pin}/></details>;
}

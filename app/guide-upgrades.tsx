'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Hammer,Search} from 'lucide-react';
import {useLanguage} from './language-provider';
import {t,translate,localeTag} from '@/lib/i18n';
import {lootItems} from '@/lib/guide-loot';
import {upgradeCategories,upgradeItems,upgradeLevels,upgradeMaterials,upgradeSelection,type UpgradeItem,type UpgradeLevel,type UpgradeRequirement} from '@/lib/guide-upgrades';
import {LootIcon} from './guide-chests';
import './guide-upgrades.css';

const categoryArtwork:Record<string,string[]>={
 helmets:['ghost-mask-sallet','steel-hood','sunlight-hat'],
 shields:['falcon-shield','tiger-shield','dragon-scale-shield'],
 armours:['dragon-god-armour','spirit-plate-armour','baroness-dress'],
 weapons:['battle-sword','devil-wing-chakram','sun-fan'],
};
const normalize=(text:string)=>text.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
function EquipmentArt({item}:{item:UpgradeItem}){
 return <span className={'gu-equipment-art'+(item.generic?' gu-class-art':'')} aria-hidden="true">{item.icon?<LootIcon icon={item.icon}/>:categoryArtwork[item.category]?.map(id=><span className="gu-class-item" key={id}><LootIcon icon={lootItems[id].icon}/></span>)}</span>;
}
function readListState(){
 const params=new URLSearchParams(typeof window==='undefined'?'':location.search),selection=upgradeSelection(params);
 return {category:selection.item.category,query:params.get('q')??'',focusItem:params.get('item')===selection.item.id?selection.item.id:null,focusStage:selection.stage};
}
type MaterialDetail={item:UpgradeItem;stage:UpgradeLevel;entry:UpgradeRequirement};
export default function GuideUpgrades({onBack}:{onBack:()=>void}){
 const {language}=useLanguage(),number=new Intl.NumberFormat(localeTag(language));
 const [state,setState]=useState(readListState),[detail,setDetail]=useState<MaterialDetail|null>(null),dialog=useRef<HTMLDialogElement>(null);
 const needle=normalize(state.query.trim()),items=upgradeItems.filter(item=>item.category===state.category&&normalize([item.name,t(item.name),translate(item.name,'tr'),translate(item.name,'el'),String(item.level),item.variant??''].join(' ')).includes(needle));
 const material=detail?upgradeMaterials[detail.entry.item]:null;
 useEffect(()=>{const sync=()=>{setState(readListState());setDetail(null);};window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[]);
 useEffect(()=>{if(detail)dialog.current?.showModal();else dialog.current?.close();},[detail]);
 function update(category=state.category,query=state.query){
  setState({...state,category,query,focusItem:null});
  const params=new URLSearchParams({view:'guide',guide:'upgrades',category});
  if(query.trim())params.set('q',query);
  history.replaceState(null,'','/?'+params);
 }
 function bonusValue(value:number|null,unit:string){return value===null?t('Value not provided'):(value>=0?'+':'')+number.format(value)+(unit==='percent'?'%':'');}
 return <div className="gu-guide"><button type="button" className="gb-back" onClick={onBack}><ArrowLeft size={16} aria-hidden="true"/>{t('All bosses')}</button>
  <header className="gu-heading"><Hammer size={27} aria-hidden="true"/><div><span className="gg-kicker">ARTHION / {t('Game Guide')}</span><h2>{t('Item Upgrades')}</h2><p>{t('Compare every item and its +5–+9 materials in one list.')}</p></div></header>
  <div className="gu-list-controls"><label className="gu-category"><span>{t('Equipment type')}</span><select name="upgradeCategory" value={state.category} onChange={event=>update(event.target.value as typeof state.category,'')}>{upgradeCategories.map(category=><option key={category.id} value={category.id}>{t(category.name)}</option>)}</select></label><label className="gu-search"><span>{t('Find an item')}</span><span><Search size={16} aria-hidden="true"/><input type="search" name="upgradeSearch" value={state.query} onChange={event=>update(state.category,event.target.value)} placeholder={t('Name or level…')} autoComplete="off"/></span></label></div>
  <div className="gu-list-meta"><span role="status">{t('{count} items shown',{count:items.length})}</span><p><span>—</span> {t('No materials listed')}<span>?</span> {t('Not confirmed')}</p></div>
  <div className="gu-equipment-list">{items.map(item=>{
   const rowCount=Math.max(1,...upgradeLevels.map(level=>item.stages[level]?.length??0));
   return <article key={item.id} id={item.id} className={'gu-item-card'+(state.focusItem===item.id?' gu-focused-item':'')} aria-labelledby={'gu-title-'+item.id}>
    <header className="gu-item-header"><EquipmentArt item={item}/><div className="gu-item-heading"><span>{t('Level {level}',{level:item.level})}{item.variant?' · '+item.variant:''}</span><h3 id={'gu-title-'+item.id}>{t(item.name)}</h3>{language!=='en'&&<small translate="no">{item.name}</small>}</div><div className="gu-card-bonuses"><span>{t('Bonus at +9')}</span>{item.bonuses?<dl>{item.bonuses.map((bonus,index)=><div key={bonus.label+index}><dt>{t(bonus.label)}</dt><dd>{bonusValue(bonus.value,bonus.unit)}</dd></div>)}</dl>:<p>{t('Value not provided')}</p>}</div></header>
    <table className="gu-upgrade-table"><caption className="gu-sr-only">{t(item.name)} · {t('Level {level}',{level:item.level})} · {t('Upgrade materials')}</caption><colgroup><col className="gu-row-label"/>{upgradeLevels.map(level=><col key={level}/>)}</colgroup><thead><tr><th scope="col">{t('Upgrade')}</th>{upgradeLevels.map(level=><th key={level} scope="col" className={state.focusItem===item.id&&state.focusStage===level?'gu-focused-stage':undefined}>+{level}</th>)}</tr></thead><tbody>{Array.from({length:rowCount},(_,row)=><tr key={row}><th scope="row">{t('Material {number}',{number:row+1})}</th>{upgradeLevels.map(level=>{
     const entries=item.stages[level];
     if(entries===null||entries.length===0)return row===0?<td key={level} rowSpan={rowCount} className="gu-matrix-empty" title={entries===null?t('Requirements not yet confirmed.'):t('No materials listed for this stage.')} aria-label={entries===null?t('Requirements not yet confirmed.'):t('No materials listed for this stage.')}><span>{entries===null?'?':'—'}</span></td>:null;
     const entry=entries[row];
     if(!entry)return <td key={level} className="gu-matrix-empty"><span aria-hidden="true">—</span><span className="gu-sr-only">{t('No additional material')}</span></td>;
     const material=upgradeMaterials[entry.item],label=t(material.name)+' · ×'+(entry.quantity??'?')+' · +'+level;
     return <td key={level} className={state.focusItem===item.id&&state.focusStage===level?'gu-focused-stage':undefined}><button type="button" className="gu-matrix-material" title={label} aria-label={label} aria-haspopup="dialog" onClick={()=>setDetail({item,stage:level,entry})}><LootIcon icon={material.icon}/><span className={entry.quantity===null?'gu-unconfirmed':undefined}>×{entry.quantity===null?'?':number.format(entry.quantity)}</span></button></td>;
    })}</tr>)}</tbody></table>
   </article>;
  })}</div>
  {!items.length&&<div className="gu-no-results"><p>{t('No items match these filters.')}</p><button type="button" className="pg-button" onClick={()=>update(state.category,'')}>{t('Clear search')}</button></div>}
  <p className="gu-reference-note">{t('Yang costs and success rates are not provided in this reference.')}</p>
  <dialog className="gg-item-detail gu-material-dialog" ref={dialog} aria-labelledby="gu-detail-title" onCancel={()=>setDetail(null)} onClose={()=>setDetail(null)}>{detail&&material&&<><header><h3 id="gu-detail-title">{t(material.name)}</h3><button type="button" className="pg-button" onClick={()=>setDetail(null)}>{t('Close')}</button></header><div className="gu-detail-body"><span className="gu-detail-art"><LootIcon icon={material.icon}/></span>{language!=='en'&&<p translate="no">{material.name}</p>}<dl><div><dt>{t('Equipment')}</dt><dd>{t(detail.item.name)} · {t('Level {level}',{level:detail.item.level})}{detail.item.variant?' · '+detail.item.variant:''}</dd></div><div><dt>{t('Upgrade')}</dt><dd>+{detail.stage-1} → +{detail.stage}</dd></div><div><dt>{t('Quantity')}</dt><dd>{detail.entry.quantity===null?t('Quantity not confirmed'):'×'+number.format(detail.entry.quantity)}</dd></div></dl>{detail.entry.quantity===null&&<p className="gu-detail-warning">{t('The source marks this quantity with question marks.')}</p>}</div></>}</dialog>
 </div>;
}

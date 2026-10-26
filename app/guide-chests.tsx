'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowLeft,ArrowRight,Check,ChevronRight,HelpCircle,PackageOpen,Search,LayoutGrid,List} from 'lucide-react';
import {useLanguage} from './language-provider';
import {t,translate} from '@/lib/i18n';
import {guideBoss} from '@/lib/game-guide';
import {guideChests,guideChest,lootItems,unconfirmedLoot,type LootIcon as Icon,type LootCategory,type LootItem,type GuideChest,type ChestEntry} from '@/lib/guide-loot';
import './guide-chests.css';

export function LootIcon({icon}:{icon:Icon}){
 if(icon.sheetWidth){
  const scale=40/Math.max(icon.width!,icon.height!);
  return <span aria-hidden="true" className="gg-loot-sprite" style={{width:icon.width!*scale,height:icon.height!*scale,backgroundImage:`url("${icon.src}")`,backgroundSize:`${icon.sheetWidth*scale}px ${icon.sheetHeight!*scale}px`,backgroundPosition:`${-icon.x!*scale}px ${-icon.y!*scale}px`} as CSSProperties}/>;
 }
 return <img src={icon.src} width={40} height={76} alt="" loading="lazy"/>;
}
const categories:LootCategory[]=['Weapons','Armours','Accessories','Materials','Utility','Unconfirmed'];
const normalize=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
const quantities=(entry:ChestEntry)=>entry.quantities??(entry.quantity!==undefined?[entry.quantity]:[]);
const itemLabel=(item:LootItem)=>item.status==='unconfirmed'?t('Item #{number}',{number:String(item.questionNumber).padStart(2,'0')}):t(item.name);

function ItemReview({open,onClose}:{open:boolean;onClose:()=>void}){
 useLanguage();const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(open)ref.current?.showModal();else ref.current?.close();},[open]);
 return <dialog ref={ref} className="gg-item-review" aria-labelledby="gg-item-review-title" onCancel={onClose} onClose={onClose}><header><div><h3 id="gg-item-review-title">{t('Item names to confirm')}</h3><p>{t('Numbers stay the same in every chest.')}</p></div><button type="button" className="pg-button" onClick={onClose}>{t('Close')}</button></header><div className="gg-review-grid">{unconfirmedLoot.map(item=><div key={item.id}><span className="gg-review-number">{String(item.questionNumber).padStart(2,'0')}</span><div className="gg-review-icon"><LootIcon icon={item.icon}/></div><span>{t(item.name)}</span></div>)}</div></dialog>;
}

export function ChestContents({chest,onViewSpawns,embedded=false}:{chest:GuideChest;onViewSpawns:(id:string)=>void;embedded?:boolean}){
 useLanguage();const [layout,setLayout]=useState<'compact'|'detailed'>(()=>{try{return localStorage.getItem('paragon-loot-layout')==='detailed'?'detailed':'compact';}catch{return 'compact';}});
 function changeLayout(value:'compact'|'detailed'){setLayout(value);try{localStorage.setItem('paragon-loot-layout',value);}catch{}}
 const [filtersOpen,setFiltersOpen]=useState(false);
 const [query,setQuery]=useState(''),[category,setCategory]=useState<LootCategory|'All'>('All'),[review,setReview]=useState(false),[detail,setDetail]=useState<string|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),item=detail?lootItems[detail]:null;
 useEffect(()=>{if(detail)dialog.current?.showModal();else dialog.current?.close();},[detail]);
 const filter=normalize(query.trim()),entries=chest.entries.filter(entry=>{const item=lootItems[entry.item];return(category==='All'||item.category===category)&&normalize([item.name,translate(item.name,'tr'),translate(item.name,'el'),...(item.aliases??[]),itemLabel(item)].join(' ')).includes(filter);});
 const pending=chest.entries.filter(entry=>lootItems[entry.item].status==='unconfirmed').length;
 const boss=chest.bossId?guideBoss(chest.bossId):null;
 return <section className="gg-chest-content" aria-labelledby="gg-chest-title"><header className="gg-chest-heading"><div className="gg-chest-art"><LootIcon icon={chest.icon}/></div><div><span className="gg-kicker">{t('Chest Drops')}</span><h3 id="gg-chest-title">{t(chest.name)}</h3><p>{t('{count} listed items',{count:chest.entries.length})}</p></div></header>
  
  <details className="gg-loot-filters" open={filtersOpen} onToggle={event=>setFiltersOpen(event.currentTarget.open)}><summary><Search size={14} aria-hidden="true"/>{t('Search & filter items')}</summary><div className="gg-loot-tools"><label className="gg-search"><Search size={16} aria-hidden="true"/><input type="search" name="lootSearch" value={query} onChange={event=>setQuery(event.target.value)} aria-label={t('Find an item in this chest')} placeholder={t('Find an item…')} autoComplete="off"/></label><label className="gg-loot-category"><span>{t('Category')}</span><select name="lootCategory" aria-label={t('Loot category')} value={category} onChange={event=>setCategory(event.target.value as LootCategory|'All')}><option value="All">{t('All items')}</option>{categories.filter(category=>chest.entries.some(entry=>lootItems[entry.item].category===category)).map(category=><option key={category} value={category}>{t(category)}</option>)}</select></label></div></details>
  <div className="gg-loot-layout-tools"><span role="status">{t('{count} items shown',{count:entries.length})}</span><div className="gg-loot-layout-switch" aria-label={t('Item display')}><button type="button" aria-pressed={layout==='compact'} onClick={()=>changeLayout('compact')}><LayoutGrid size={15} aria-hidden="true"/>{t('Compact')}</button><button type="button" aria-pressed={layout==='detailed'} onClick={()=>changeLayout('detailed')}><List size={15} aria-hidden="true"/>{t('Detailed')}</button></div></div>{pending>0&&<div className="gg-loot-review-note"><HelpCircle size={16} aria-hidden="true"/><p>{t('{count} item names need confirmation. Their original icons are preserved.',{count:pending})}</p><button type="button" onClick={()=>setReview(true)}>{t('See numbered items')}<ArrowRight size={14} aria-hidden="true"/></button></div>}
  {chest.referenceEntryCount>chest.entries.length&&<p className="gg-loot-result-count">{t('Different quantities of the same item are grouped together.')}</p>}
  {entries.length?<div className="gg-loot-grid" data-layout={layout}>{entries.map(entry=>{const item=lootItems[entry.item];return <button type="button" key={entry.item+':'+(entry.quantity??'unspecified')} title={itemLabel(item)+(quantities(entry).length?' · '+quantities(entry).map(n=>'×'+n).join(' / '):'')} style={layout==='compact'?{gridRow:'span '+(item.slots??1)}:undefined} className={'gg-loot-card'+(item.status==='unconfirmed'?' gg-loot-unconfirmed':'')} onClick={()=>setDetail(item.id)}><span className="gg-loot-icon"><LootIcon icon={item.icon}/>{quantities(entry).length>0&&<span className="gg-loot-quantity">{quantities(entry).map(n=>'×'+n).join(' / ')}</span>}</span><span><strong>{itemLabel(item)}</strong><small>{t(item.category)}</small>{item.status==='unconfirmed'&&<span className="gg-needs-name">{t('Name pending')}</span>}{item.englishNamePending&&<span className="gg-needs-name">{t('English name to verify')}</span>}</span></button>;})}</div>:<div className="gg-loot-empty"><PackageOpen size={24} aria-hidden="true"/><p>{t('No items match these filters.')}</p><button type="button" className="pg-button" onClick={()=>{setQuery('');setCategory('All');}}>{t('Clear filters')}</button></div>}
  <p className="gg-loot-disclaimer">{t('Possible contents from the supplied Arthion notebook. Drop chances and equipment upgrade levels are not shown in these references.')}</p><footer className="gg-loot-footer"><span><Check size={15} aria-hidden="true"/>{t('Chest contents only. Direct boss drops are separate.')}</span>{boss&&!embedded&&<button type="button" className="pg-button" onClick={()=>onViewSpawns(boss.id)}><MapLink/>{t('View spawn map')}</button>}</footer>
  <ItemReview open={review} onClose={()=>setReview(false)}/>
  <dialog ref={dialog} className="gg-item-detail" aria-labelledby="gg-item-detail-title" onCancel={()=>setDetail(null)} onClose={()=>setDetail(null)}>{item&&<><header><h3 id="gg-item-detail-title">{itemLabel(item)}</h3><button type="button" className="pg-button" onClick={()=>setDetail(null)}>{t('Close')}</button></header><div className="gg-detail-body"><div className="gg-detail-art"><LootIcon icon={item.icon}/></div><span className="gg-kicker">{t(item.category)}</span>{item.status==='unconfirmed'?<><p>{t('The item is visible in the reference, but its Arthion name has not been confirmed.')}</p><p>{t(item.name)}</p></>:<p translate="no">{item.name}</p>}{item.englishNamePending&&<p className="gg-reference-note">{t('The Turkish name is confirmed. The exact English client name is still being verified.')}</p>}{chest.entries.find(entry=>entry.item===item.id)?.summonsBoss&&<p>{t('Summons {boss}.',{boss:chest.entries.find(entry=>entry.item===item.id)!.summonsBoss!})}</p>}<dl><div><dt>{t('Found in')}</dt><dd>{t(chest.name)}</dd></div><div><dt>{t('Visible quantity')}</dt><dd>{quantities(chest.entries.find(entry=>entry.item===item.id)!).join(' / ')||t('Not specified')}</dd></div><div><dt>{t('Drop chance')}</dt><dd>{t('Not specified')}</dd></div></dl></div></>}</dialog>
 </section>;
}
function MapLink(){return <ArrowLeft size={15} aria-hidden="true"/>;}

export default function GuideChests({initialChest,onViewSpawns}:{initialChest?:string;onViewSpawns:(id:string)=>void}){
 useLanguage();const [selected,setSelected]=useState(()=>guideChest(typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('chest'))?.id??initialChest??guideChests[0].id),[query,setQuery]=useState('');
 const chest=guideChest(selected)??guideChests[0],needle=normalize(query.trim()),matches=guideChests.filter(chest=>normalize(chest.name+' '+t(chest.name)+' '+chest.aliases.join(' ')).includes(needle));
 function select(id:string){setSelected(id);const params=new URLSearchParams(location.search);params.set('view','guide');params.set('guide','chest-drops');params.set('chest',id);history.replaceState(null,'','/?'+params);}
 return <div className="gg-chests-explorer"><aside className="gg-chest-browser"><label className="gg-search"><Search size={16} aria-hidden="true"/><input type="search" name="chestSearch" aria-label={t('Find a chest')} placeholder={t('Find a chest…')} value={query} onChange={event=>setQuery(event.target.value)} autoComplete="off"/></label><div className="gg-chest-list" aria-label={t('Boss chests')}>{matches.map(chest=><button type="button" key={chest.id} aria-pressed={chest.id===selected} onClick={()=>select(chest.id)}><span className="gg-chest-list-icon"><LootIcon icon={chest.icon}/></span><span><strong>{t(chest.name)}</strong><small>{t('{count} listed items',{count:chest.entries.length})}</small></span><ChevronRight size={14} aria-hidden="true"/></button>)}{!matches.length&&<div className="gg-no-results"><p>{t('No chests found.')}</p><button type="button" className="pg-button" onClick={()=>setQuery('')}>{t('Clear search')}</button></div>}</div><p className="gg-browser-note">{t('Six unique chests. Repeated screenshots are kept as one record.')}</p></aside><ChestContents key={chest.id} chest={chest} onViewSpawns={onViewSpawns}/></div>;
}

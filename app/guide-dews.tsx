'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {ArrowLeft,ChevronRight,FlaskConical,LayoutGrid,List} from 'lucide-react';
import {useLanguage} from './language-provider';
import {t,localeTag} from '@/lib/i18n';
import {dewItems,dewRecipes,type DewRecipe} from '@/lib/guide-dews';
import {LootIcon} from './guide-chests';
import './guide-dews.css';

function RecipeCard({recipe,onSelect}:{recipe:DewRecipe;onSelect?:()=>void}){
 const {language}=useLanguage(),number=new Intl.NumberFormat(localeTag(language)),titleId=useId(),output=dewItems[recipe.output];
 const heading=<><span className="gd-output-art"><LootIcon icon={output.icon}/></span><div><span className="gd-recipe-number">{t('Recipe {number}',{number:String(recipe.referenceOrder).padStart(2,'0')})}</span><h3 id={titleId}>{t(output.name)}</h3><p>{t('Makes {count}',{count:recipe.quantity})}</p></div>{onSelect&&<ChevronRight size={15} aria-hidden="true"/>}</>;
 return <article className="gd-recipe" aria-labelledby={titleId} data-recipe={recipe.id}>
  <header>{onSelect?<button type="button" className="gd-recipe-open" onClick={onSelect} aria-label={t('View recipe')+': '+t(output.name)}>{heading}</button>:<div className="gd-recipe-heading">{heading}</div>}</header>
  <div className="gd-ingredients"><h4>{t('Ingredients')}</h4><ul>{recipe.ingredients.map(entry=>{const item=dewItems[entry.item];return <li key={entry.item} title={t(item.name)+' ×'+number.format(entry.quantity)}><span className="gd-ingredient-art"><LootIcon icon={item.icon}/></span><span className="gd-ingredient-name">{t(item.name)}</span><strong>×{number.format(entry.quantity)}</strong></li>;})}</ul></div>
  <footer><span>{t('Crafting cost')}</span><strong>{number.format(recipe.yang)} <small>Yang</small></strong></footer>
 </article>;
}
export default function GuideDews({onBack}:{onBack:()=>void}){
 useLanguage();
 const [layout,setLayout]=useState<'compact'|'detailed'>(()=>{try{return localStorage.getItem('paragon-dew-layout')==='detailed'?'detailed':'compact';}catch{return 'compact';}});
 const [selected,setSelected]=useState<DewRecipe|null>(null),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(selected)dialog.current?.showModal();else dialog.current?.close();},[selected]);
 function changeLayout(value:'compact'|'detailed'){setLayout(value);try{localStorage.setItem('paragon-dew-layout',value);}catch{}}
 return <div className="gd-guide"><button type="button" className="gb-back" onClick={onBack}><ArrowLeft size={16} aria-hidden="true"/>{t('All bosses')}</button>
  <header className="gd-heading"><FlaskConical size={28} aria-hidden="true"/><div><span className="gg-kicker">ARTHION / {t('Game Guide')}</span><h2>{t('Dews & Potions')}</h2><p>{t('Every recipe makes {count} items.',{count:10})}</p></div><span className="gd-total">{t('{count} recipes · ingredients and Yang costs',{count:dewRecipes.length})}</span></header>
  <div className="gd-layout-tools"><span>{t('All recipes')}</span><div className="gg-loot-layout-switch" aria-label={t('Item display')}><button type="button" aria-pressed={layout==='compact'} onClick={()=>changeLayout('compact')}><LayoutGrid size={15} aria-hidden="true"/>{t('Compact')}</button><button type="button" aria-pressed={layout==='detailed'} onClick={()=>changeLayout('detailed')}><List size={15} aria-hidden="true"/>{t('Detailed')}</button></div></div>
  <div className="gd-recipes" data-layout={layout}>{dewRecipes.map(recipe=><RecipeCard key={recipe.id} recipe={recipe} onSelect={()=>setSelected(recipe)}/>)}</div>
  <p className="gd-source-note">{t('Recipes from the supplied Arthion crafting screen.')}</p>
  <dialog className="gg-item-detail gd-recipe-dialog" ref={dialog} aria-labelledby="gd-detail-title" onCancel={()=>setSelected(null)} onClose={()=>setSelected(null)}><header><h3 id="gd-detail-title">{t('Recipe details')}</h3><button type="button" className="pg-button" onClick={()=>setSelected(null)}>{t('Close')}</button></header>{selected&&<RecipeCard recipe={selected}/>}</dialog>
 </div>;
}

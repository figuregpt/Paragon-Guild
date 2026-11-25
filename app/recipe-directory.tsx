'use client';

import {useEffect, useState, type MouseEvent} from 'react';
import {ChevronRight} from 'lucide-react';
import {t} from '@/lib/i18n';
import {dewItems, dewRecipes} from '@/lib/guide-dews';
import {useLanguage} from './language-provider';
import {LootIcon} from './guide-chests';
import GuideDews from './guide-dews';
import GuideUpgrades from './guide-upgrades';
import './guide-categories.css';

const rootHref='/?view=recipes';
const dewsHref=rootHref+'&guide=dews';
const upgradesHref=rootHref+'&guide=upgrades';
const featuredRecipes=dewRecipes.filter(recipe=>recipe.id==='red-dew'||recipe.id==='blue-dew').sort((a,b)=>b.referenceOrder-a.referenceOrder);
const featuredEquipment=[
  {category:'earrings',name:'Earrings',image:'/guide/upgrades/icons/silver-earrings.png'},
  {category:'shields',name:'Shields',image:'/guide/loot/falcon-shield.png'},
];

function readRoute() {
  return new URLSearchParams(typeof window==='undefined'?'':window.location.search);
}

export default function RecipeDirectory() {
  useLanguage();
  const [route,setRoute]=useState(readRoute);
  useEffect(()=>{
    const sync=()=>setRoute(readRoute());
    window.addEventListener('popstate',sync);
    return ()=>window.removeEventListener('popstate',sync);
  },[]);

  function navigate(href:string) {
    history.pushState(null,'',href);
    setRoute(readRoute());
    window.scrollTo({top:0,behavior:'instant'});
  }

  function openLink(event:MouseEvent<HTMLAnchorElement>) {
    if(event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();
    navigate(event.currentTarget.getAttribute('href')!);
  }

  const back=()=>navigate(rootHref);
  if(route.get('guide')==='dews')return <div className="gg-guide"><GuideDews recipeId={route.get('recipe')} onBack={back}/></div>;
  if(route.get('guide')==='upgrades')return <div className="gg-guide"><GuideUpgrades onBack={back}/></div>;

  return <div className="gg-guide gr-directory">
    <header className="gg-intro"><h2>{t('Recipes')}</h2></header>
    <section aria-labelledby="gr-dews">
      <header className="gr-section-heading"><h3 id="gr-dews">{t('Dews & Potions')}</h3><a href={dewsHref} onClick={openLink}>{t('All recipes')} <ChevronRight size={16} aria-hidden="true"/></a></header>
      <div className="gr-options">{featuredRecipes.map(recipe=>{
        const item=dewItems[recipe.output];
        return <a key={recipe.id} className="gr-option" href={dewsHref+'&recipe='+recipe.id} onClick={openLink}>
          <span className="gr-art"><LootIcon icon={item.icon}/></span>
          <span><strong>{t(item.name)}</strong><small>{recipe.effect?t(recipe.effect.name):t('Ingredients')}</small></span>
          <ChevronRight size={16} aria-hidden="true"/>
        </a>;
      })}</div>
    </section>
    <section aria-labelledby="gr-upgrades">
      <header className="gr-section-heading"><h3 id="gr-upgrades">{t('Item Upgrades')}</h3><a href={upgradesHref} onClick={openLink}>{t('All equipment types')} <ChevronRight size={16} aria-hidden="true"/></a></header>
      <div className="gr-options">{featuredEquipment.map(item=><a key={item.category} className="gr-option" href={upgradesHref+'&category='+item.category} onClick={openLink}>
        <span className="gr-art"><img src={item.image} width={32} height={32} alt=""/></span>
        <span><strong>{t(item.name)}</strong><small>+5–+9 · {t('Upgrade materials')}</small></span>
        <ChevronRight size={16} aria-hidden="true"/>
      </a>)}</div>
    </section>
  </div>;
}

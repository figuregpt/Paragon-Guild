'use client';

import {useEffect, useState, type MouseEvent} from 'react';
import {ChevronRight, FlaskConical, Hammer} from 'lucide-react';
import {t} from '@/lib/i18n';
import {dewRecipes} from '@/lib/guide-dews';
import {upgradeCategories} from '@/lib/guide-upgrades';
import {useLanguage} from './language-provider';
import GuideDews from './guide-dews';
import GuideUpgrades from './guide-upgrades';
import './guide-categories.css';

const rootHref='/?view=recipes';
const dewsHref=rootHref+'&guide=dews';
const upgradesHref=rootHref+'&guide=upgrades';

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
    <header className="gg-intro"><h2 id="gr-title">{t('Recipes')}</h2></header>
    <nav className="gr-options" aria-labelledby="gr-title">
      <a className="gr-option" href={dewsHref} onClick={openLink}>
        <span className="gr-art"><FlaskConical size={24} aria-hidden="true"/></span>
        <span className="gr-label"><strong>{t('Dews & Potions')}</strong><small>{t('{count} recipes · ingredients and Yang costs', {count: dewRecipes.length})}</small></span>
        <ChevronRight size={18} aria-hidden="true"/>
      </a>
      <a className="gr-option" href={upgradesHref} onClick={openLink}>
        <span className="gr-art"><Hammer size={24} aria-hidden="true"/></span>
        <span className="gr-label"><strong>{t('Item Upgrades')}</strong><small>{t('{count} item types · +5–+9 materials', {count: upgradeCategories.length})}</small></span>
        <ChevronRight size={18} aria-hidden="true"/>
      </a>
    </nav>
  </div>;
}

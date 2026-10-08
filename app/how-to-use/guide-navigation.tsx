'use client';
import {useEffect} from 'react';
export default function GuideNavigation({topics}:{topics:{id:string;title:string}[]}){
 useEffect(()=>{
  function openHash(){const topic=document.getElementById(location.hash.slice(1));if(topic instanceof HTMLDetailsElement&&topic.classList.contains('pg-guide-topic')){topic.open=true;requestAnimationFrame(()=>topic.scrollIntoView({block:'start'}));}}
  openHash();window.addEventListener('hashchange',openHash);return()=>window.removeEventListener('hashchange',openHash);
 },[]);
 return <nav className="pg-guide-contents" aria-label="Quick guide links">{topics.slice(0,3).map(t=><a key={t.id} href={'#'+t.id} onClick={()=>{const el=document.getElementById(t.id);if(el instanceof HTMLDetailsElement)el.open=true;}}>{t.title}</a>)}</nav>;
}

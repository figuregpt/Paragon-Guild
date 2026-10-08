'use client';
import {useLanguage} from '@/app/language-provider';
import {t} from '@/lib/i18n';
import {useEffect,useRef,useState,type MouseEvent} from 'react';
import {getGuideTopics} from './guide-content';
type Selection={id:string;step:number}|null;
export default function GuideNavigation(){
 const {language}=useLanguage();
 const topics=getGuideTopics();
 // Hash routing uses stable IDs/counts, independent of translated display copy.
 const topology=useRef(topics.map(topic=>({id:topic.id,count:topic.steps.length})));
 const [selection,setSelection]=useState<Selection>(null),heading=useRef<HTMLHeadingElement>(null),indexHeading=useRef<HTMLHeadingElement>(null),panel=useRef<HTMLElement>(null),interacted=useRef(false);
 const topic=topics.find(t=>t.id===selection?.id),stepIndex=selection?.step??0,step=topic?.steps[stepIndex],activeTopicId=topic?.id;
 useEffect(()=>{
  function readHash(){const [id,number]=location.hash.slice(1).split('/'),t=topology.current.find(t=>t.id===id),n=Number(number);setSelection(t?{id:t.id,step:Number.isInteger(n)&&n>0?Math.min(t.count-1,n-1):0}:null);}
  readHash();window.addEventListener('hashchange',readHash);window.addEventListener('popstate',readHash);
  return()=>{window.removeEventListener('hashchange',readHash);window.removeEventListener('popstate',readHash);};
 },[]);
 // Scroll only when opening/closing a guide. Step changes keep the current control and viewport.
 useEffect(()=>{
  if(activeTopicId){interacted.current=true;heading.current?.focus({preventScroll:true});panel.current?.scrollIntoView({block:'start',behavior:'instant'});}
  else if(interacted.current){indexHeading.current?.focus({preventScroll:true});indexHeading.current?.scrollIntoView({block:'start',behavior:'instant'});}
 },[activeTopicId]);
 function navigate(next:Selection,hash:string){
  if(location.hash!==hash)history.pushState(null,'',location.pathname+location.search+hash);
  setSelection(next);
 }
 function choose(event:MouseEvent<HTMLAnchorElement>,next:Selection,hash:string){
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();navigate(next,hash);
 }
 function move(index:number){if(topic)navigate({id:topic.id,step:index},'#'+topic.id+'/'+(index+1));}
 return <div className={'pg-guide-workspace'+(topic?' pg-guide-selected':'')}>
 <nav className="pg-guide-index" aria-labelledby="pg-guide-index-title"><h2 id="pg-guide-index-title" ref={indexHeading} tabIndex={-1}>{t("What would you like to do?")}</h2><div className="pg-guide-topic-list">{topics.map(t=><a key={t.id} href={'#'+t.id} onClick={event=>choose(event,{id:t.id,step:0},'#'+t.id)} aria-current={topic?.id===t.id?'page':undefined}><span><strong>{t.title}</strong><small>{t.subtitle}</small></span><span className="pg-guide-topic-arrow" aria-hidden="true">→</span></a>)}</div></nav>
 {topic&&step&&<section className="pg-guide-viewer" ref={panel} aria-label={topic.title}>
 <header className="pg-guide-viewer-header"><a href="#" className="pg-guide-back" onClick={event=>choose(event,null,'')}>{t("← All Guides")}</a><span>{topic.title}</span></header>
 <div className="pg-guide-progress">
 <p className="pg-guide-count" role="status"><span>{t('Step {current} of {total}',{current:stepIndex+1,total:topic.steps.length})}</span><span className="pg-guide-announcement">: {step.title}</span></p>
 <div className="pg-guide-controls" role="group" aria-label={t("Guide step controls")}><button type="button" className="pg-button" disabled={stepIndex===0} onClick={()=>move(stepIndex-1)}>{t("Back")}</button><button type="button" className="pg-button pg-red" onClick={()=>stepIndex<topic.steps.length-1?move(stepIndex+1):navigate(null,'')}>{stepIndex<topic.steps.length-1?t("Next Step →"):t("Done")}</button></div>
 </div>
 <div className="pg-guide-step-layout">
 <div className="pg-guide-instruction">
 <h2 ref={heading} tabIndex={-1}>{step.title}</h2>
 {step.path&&<p className="pg-guide-path">{step.path}</p>}
 <div className="pg-guide-copy">{step.body}</div>
 {step.note&&<p className="pg-guide-note">{step.note}</p>}
 {step.extra&&<div className="pg-guide-additional">{step.extra}</div>}
 </div>
 <figure className="pg-guide-screen"><a href={'/guide/'+(language==='en'?'':language+'/')+step.image+'.png'} target="_blank" rel="noopener noreferrer" aria-label={t("Enlarge: ")+step.alt+t(" (opens in a new tab)")}><img src={'/guide/'+(language==='en'?'':language+'/')+step.image+'.png'} width={step.width*2} height={step.height*2} alt={step.alt} decoding="async"/></a><figcaption>{t("Example screen · Tap to enlarge")}</figcaption></figure>
 </div></section>}
 </div>;
}

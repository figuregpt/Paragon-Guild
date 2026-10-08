'use client';
import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import {isLanguage, LANGUAGE_STORAGE_KEY, type Language} from '@/lib/i18n';

const LanguageContext = createContext<{language:Language; changeLanguage:(language:Language)=>void}>({language:'en', changeLanguage:()=>{}});
export default function LanguageProvider({children}:{children:ReactNode}) {
 const [language,setLanguage] = useState<Language>('en');
 function apply(next:Language) {
  document.documentElement.lang = next;
  setLanguage(next);
  document.title=(location.pathname==='/how-to-use'?({en:'How to Use',tr:'Nasıl Kullanılır?',el:'Οδηγός Χρήσης'})[next]+' — Paragon':'Paragon · '+({en:'Arthion Guild App',tr:'Arthion Lonca Uygulaması',el:'Εφαρμογή Συντεχνίας Arthion'})[next]);
  navigator.serviceWorker?.ready.then(reg => reg.active?.postMessage({type:'PARAGON_LANGUAGE', language:next})).catch(()=>{});
 }
 function changeLanguage(next:Language) {
  if(!isLanguage(next)) return;
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY,next); } catch {}
  apply(next);
 }
 useEffect(()=>{
  let saved:string|null=null;
  try { saved=localStorage.getItem(LANGUAGE_STORAGE_KEY); } catch {}
  const preferred=navigator.languages.map(value=>value.split('-')[0]).find(isLanguage);
  // Read device preferences after hydration so the server and first client render agree.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  apply(isLanguage(saved)?saved:preferred??'en');
  const updateWorker=()=>navigator.serviceWorker?.controller?.postMessage({type:'PARAGON_LANGUAGE',language:document.documentElement.lang});
  navigator.serviceWorker?.addEventListener?.('controllerchange',updateWorker);
  const sync=(event:StorageEvent)=>{if(event.key===LANGUAGE_STORAGE_KEY&&isLanguage(event.newValue))apply(event.newValue);};
  window.addEventListener('storage',sync);
  return()=>{window.removeEventListener('storage',sync);navigator.serviceWorker?.removeEventListener?.('controllerchange',updateWorker);};
 },[]);
 return <LanguageContext.Provider value={{language,changeLanguage}}>{children}</LanguageContext.Provider>;
}
export function useLanguage(){return useContext(LanguageContext);}
export function LanguageSelect(){
 const {language,changeLanguage}=useLanguage();
 const label=({en:'Language',tr:'Dil',el:'Γλώσσα'} as const)[language];
 return <label className="pg-language"><span>{label}</span><select name="language" aria-label={label} value={language} onChange={event=>changeLanguage(event.target.value as Language)}><option value="en" lang="en">English</option><option value="tr" lang="tr">Türkçe</option><option value="el" lang="el">Ελληνικά</option></select></label>;
}

'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {Bell,X} from 'lucide-react';
import {useLanguage} from './language-provider';
import {t} from '@/lib/i18n';
import {findGuideBoss} from '@/lib/boss-guide';
import {BossChime} from '@/lib/boss-sound';
import type {BossTimerState} from '@/lib/boss-timers';
import './boss-tracker.css';
type Tracking={state:BossTimerState|null;clock:number;error:string;saving:Set<string>;message:string;refresh:()=>Promise<void>;record:(bossId:string,channel:number,action:'kill'|'clear')=>Promise<boolean>;soundOn:boolean;audioReady:boolean;toggleSound:()=>void;testSound:()=>Promise<void>};
const Context=createContext<Tracking|null>(null);
export function useBossTracking(){const value=useContext(Context);if(!value)throw new Error('Boss tracker provider is missing.');return value;}
export function BossTrackerProvider({memberId,children}:{memberId?:string;children:ReactNode}){
 const {language}=useLanguage(),[state,setState]=useState<BossTimerState|null>(null),[clock,setClock]=useState(0),[error,setError]=useState(''),[saving,setSaving]=useState<Set<string>>(new Set()),[message,setMessage]=useState(''),[toast,setToast]=useState<{text:string;bossId:string}|null>(null),[soundOn,setSoundOn]=useState(true),[audioReady,setAudioReady]=useState(false);
 const offset=useRef(0),writes=useRef(new Set<string>()),readVersion=useRef(0),alive=useRef(false),seen=useRef(new Set<string>()),initialized=useRef(false),chime=useRef<BossChime|null>(null),muted=useRef(false);
 const storageKey='paragon-boss-sound:'+memberId;
 const refresh=useCallback(async()=>{
  if(!memberId||writes.current.size)return;
  const version=++readVersion.current;
  try{const response=await fetch('/api/boss-timers',{cache:'no-store'}),value=await response.json() as BossTimerState&{error?:string};if(!response.ok)throw new Error(value.error||'Could not load your boss timers.');if(!alive.current||version!==readVersion.current)return;offset.current=value.serverTime-Date.now()/1000;setState(value);setClock(value.serverTime);if(!initialized.current){for(const timer of value.timers)if(timer.respawns<=value.serverTime)seen.current.add(timer.revision);initialized.current=true;}}
  catch(e){if(alive.current&&version===readVersion.current)setError(e instanceof Error?e.message:'Could not load your boss timers.');}
 },[memberId]);
 useEffect(()=>{
  if(!memberId)return;alive.current=true;try{const enabled=localStorage.getItem(storageKey)!=='off';setSoundOn(enabled);muted.current=!enabled;}catch{}
  const storage=(event:StorageEvent)=>{if(event.key===storageKey){const enabled=event.newValue!=='off';setSoundOn(enabled);muted.current=!enabled;}};
  void refresh();const poll=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},15000),tick=setInterval(()=>setClock(Math.floor(Date.now()/1000+offset.current)),1000);const visible=()=>{if(document.visibilityState==='visible')void refresh();};window.addEventListener('storage',storage);window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
  return()=>{alive.current=false;++readVersion.current;clearInterval(poll);clearInterval(tick);window.removeEventListener('storage',storage);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);chime.current?.close();};
 },[memberId,storageKey,refresh]);
 async function prepareSound(){if(muted.current)return;chime.current??=new BossChime();const ready=await chime.current.prepare();if(alive.current)setAudioReady(ready);}
 async function testSound(){await prepareSound();if(!muted.current)chime.current?.play();}
 function toggleSound(){const enabled=!soundOn;setSoundOn(enabled);muted.current=!enabled;try{localStorage.setItem(storageKey,enabled?'on':'off');}catch{}if(enabled)void prepareSound();}
 useEffect(()=>{
  if(!state||!clock)return;const ready=state.timers.filter(timer=>timer.respawns<=clock&&!seen.current.has(timer.revision));if(!ready.length)return;
  for(const timer of ready)seen.current.add(timer.revision);
  setToast({text:ready.map(timer=>t('{boss} · CH{channel} is ready again.',{boss:findGuideBoss(timer.boss_id)?.name??timer.boss_id,channel:timer.game_channel})).join(' '),bossId:ready[0].boss_id});
  if(!muted.current&&chime.current?.ready){let unheard=ready;const key='paragon-boss-heard:'+memberId;try{const prior=JSON.parse(localStorage.getItem(key)||'[]') as string[];unheard=ready.filter(timer=>!prior.includes(timer.revision));if(unheard.length)localStorage.setItem(key,JSON.stringify([...prior,...unheard.map(timer=>timer.revision)].slice(-100)));}catch{}if(unheard.length)chime.current.play();}
 },[state,clock,memberId,language]);
 async function record(bossId:string,channel:number,action:'kill'|'clear'){
  const key=bossId+':'+channel;if(!state||writes.current.has(key))return false;
  if(action==='kill')void prepareSound();
  const current=state.timers.find(timer=>timer.boss_id===bossId&&timer.game_channel===channel);
  writes.current.add(key);++readVersion.current;setSaving(new Set(writes.current));setError('');
  try{const response=await fetch('/api/boss-timers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bossId,channel,action,requestId:crypto.randomUUID(),expectedRevision:current?.revision??null})}),value=await response.json();if(!response.ok)throw new Error(value.error||'The timer could not be saved. Try again.');if(!alive.current)return false;offset.current=value.serverTime-Date.now()/1000;setClock(value.serverTime);setState(previous=>previous?{...previous,serverTime:value.serverTime,timers:[...previous.timers.filter(timer=>timer.boss_id!==bossId||timer.game_channel!==channel),...(value.timer?[value.timer]:[])]}:previous);setMessage(action==='kill'?t('CH{channel} recorded. Respawn in 40 minutes.',{channel}):t('CH{channel} timer cleared.',{channel}));return true;}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'The timer could not be saved. Try again.');return false;}
  finally{writes.current.delete(key);if(alive.current){setSaving(new Set(writes.current));void refresh();}}
 }
 return <Context.Provider value={{state,clock,error,saving,message,refresh,record,soundOn,audioReady,toggleSound,testSound}}>{children}{toast&&<div className="bt-toast" role="status"><Bell size={18} aria-hidden="true"/><a href={'/?view=guide&boss='+toast.bossId}>{toast.text}</a><button type="button" aria-label={t('Close')} onClick={()=>setToast(null)}><X size={17} aria-hidden="true"/></button></div>}</Context.Provider>;
}

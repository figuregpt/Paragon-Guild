'use client';
import {useEffect,useRef,useState} from 'react';
import {Bell,Check,Clock3,LockKeyhole,Volume2,VolumeX} from 'lucide-react';
import {useLanguage} from './language-provider';
import {t,localeTag} from '@/lib/i18n';
import {BOSS_CHANNELS,BOSS_MAX_DURATION_SECONDS,countdown,remainingSeconds,type BossTimer,type BossTimerAction} from '@/lib/boss-timers';
import {useBossTracking} from './boss-tracker-provider';
import './boss-tracker.css';

export default function BossTracker({bossId,bossName,pushEnabled,onEnableNotifications}:{bossId:string;bossName:string;pushEnabled:boolean;onEnableNotifications:()=>void}){
 const {language}=useLanguage(),{state,clock,error,saving,message,refresh,record,soundOn,audioReady,toggleSound,testSound}=useBossTracking();
 const [selected,setSelected]=useState<BossTimer|null>(null),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(selected)dialog.current?.showModal();else dialog.current?.close();},[selected]);
 const busy=(channel:number)=>saving.has(bossId+':'+channel);
 async function save(channel:number,action:BossTimerAction){if(await record(bossId,channel,action))setSelected(null);}
 useEffect(()=>{void refresh();},[pushEnabled,refresh]);
 const date=new Intl.DateTimeFormat(localeTag(language),{dateStyle:'medium',timeStyle:'short'});
 return <section className="bt-tracker" aria-labelledby="boss-tracker-title">
  <header className="bt-heading"><div><h3 id="boss-tracker-title"><Clock3 size={18} aria-hidden="true"/>{t('My Boss Tracker')}</h3><p>{t('Killed this boss? Tap its channel to start 40 minutes.')}</p></div><span className="bt-private"><LockKeyhole size={13} aria-hidden="true"/>{t('Only you can see these timers')}</span></header>
  {error&&<div className="bt-error" role="alert">{t(error)} <button type="button" onClick={()=>{void refresh();}}>{t('Try again')}</button></div>}
  <div className="bt-channels" aria-busy={!state}>{BOSS_CHANNELS.map(channel=>{
   const timer=state?.timers.find(timer=>timer.boss_id===bossId&&timer.game_channel===channel),remaining=timer?remainingSeconds(timer,clock):0,running=Boolean(timer&&remaining>0),ready=Boolean(timer&&!running),status=running?'Respawning':ready?'Ready to hunt':'Not tracked';
   return <div key={channel} className={'bt-channel-tile'+(running?' bt-running':ready?' bt-ready':'')}><button type="button" className="bt-channel" disabled={!state||busy(channel)} aria-label={t('CH{channel} · {status}',{channel,status:t(status)})+(running?' · '+countdown(remaining):'')} aria-haspopup={running?'dialog':undefined} onClick={()=>running?setSelected(timer!):void save(channel,'kill')}>
    <span className="bt-channel-head"><strong>CH{channel}</strong>{ready?<Check size={15} aria-hidden="true"/>:<span className="bt-dot"/>}</span><span className="bt-countdown" aria-hidden="true">{busy(channel)?'…':running?countdown(remaining):ready?t('Ready'):state?t('Mark kill'):'—'}</span><span className="bt-channel-status">{t(status)}</span>
    <span className="bt-last">{timer?<><span>{t('Last killed')}</span><time dateTime={new Date(timer.killed*1000).toISOString()}>{date.format(timer.killed*1000)}</time></>:<span>{t('Tap after your kill')}</span>}</span>
    {running&&<span className="bt-progress" aria-hidden="true"><span style={{width:Math.min(100,remaining/Math.max(1,timer!.respawns-timer!.killed)*100)+'%'}}/></span>}
   </button>{running&&<div className="bt-adjust" aria-label={t('Adjust CH{channel}',{channel})}><button type="button" disabled={busy(channel)} aria-label={t('Subtract 10 minutes from CH{channel}',{channel})} onClick={()=>void save(channel,'subtract10')}>{t('−10 min')}</button><button type="button" disabled={busy(channel)||timer!.respawns>=timer!.killed+BOSS_MAX_DURATION_SECONDS} aria-label={t('Add 10 minutes to CH{channel}',{channel})} onClick={()=>void save(channel,'add10')}>{t('+10 min')}</button><button type="button" disabled={busy(channel)} aria-label={t('Subtract 1 minute from CH{channel}',{channel})} onClick={()=>void save(channel,'subtract1')}>{t('−1 min')}</button><button type="button" disabled={busy(channel)||timer!.respawns>=timer!.killed+BOSS_MAX_DURATION_SECONDS} aria-label={t('Add 1 minute to CH{channel}',{channel})} onClick={()=>void save(channel,'add1')}>{t('+1 min')}</button></div>}</div>;
  })}</div>
  <div className="bt-feedback"><p className="bt-notice" role="status">{message}</p><div className="bt-sound"><button type="button" className="pg-button" aria-pressed={soundOn} onClick={toggleSound}>{soundOn?<Volume2 size={15} aria-hidden="true"/>:<VolumeX size={15} aria-hidden="true"/>}{t(soundOn?'Sound on':'Sound off')}</button>{soundOn&&<button className="pg-button" type="button" onClick={()=>void testSound()}>{t('Test sound')}</button>}<span>{t(soundOn&&!audioReady?'Sound starts after your first channel tap.':'Saved for your account on this device.')}</span></div></div>
  <div className="bt-notifications"><Bell size={16} aria-hidden="true"/><p>{pushEnabled?t('Device notifications are on. We will notify you when any tracked channel is ready.'):t('Enable device notifications to receive respawn alerts, even when the site is closed.')}</p>{!pushEnabled&&<button className="pg-button" type="button" disabled={!state?.pushReady} onClick={onEnableNotifications}>{t('Enable Device Notifications')}</button>}</div>
  <dialog className="bt-dialog" ref={dialog} aria-labelledby="bt-dialog-title" onCancel={()=>setSelected(null)} onClose={()=>setSelected(null)}>{selected&&<><header><h3 id="bt-dialog-title">CH{selected.game_channel} · {t('Timer already running')}</h3><button className="pg-button" type="button" onClick={()=>setSelected(null)}>{t('Close')}</button></header><p>{t('Killed it again? Restart this channel from 40 minutes, or clear an accidental mark.')}</p><div className="bt-dialog-actions"><button className="pg-button" disabled={busy(selected.game_channel)} type="button" onClick={()=>void save(selected.game_channel,'clear')}>{t('Clear timer')}</button><button className="pg-button pg-red" disabled={busy(selected.game_channel)} type="button" onClick={()=>void save(selected.game_channel,'kill')}>{t('Restart 40 minutes')}</button></div></>}</dialog>
 </section>;
}

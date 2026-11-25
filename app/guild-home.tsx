'use client';

import {useLanguage} from '@/app/language-provider';
import {t,localeTag} from '@/lib/i18n';
import {EventSummary} from './guild-events';
import {ContributionStatus} from './guild-contributions';
import type {GuildData} from '@/lib/domain';
import {localTime} from '@/lib/local-time';

export default function GuildHome({data}:{data:GuildData}) {
 useLanguage();
 const {contribution,settings}=data;
 const completed=Boolean(contribution?.checked && contribution.weekly_yang>=settings.weekly);
 const formatYang=new Intl.NumberFormat(localeTag());
 const current=data.events.filter(event=>event.phase==='open'||event.kind==='Legacy'&&event.status==='upcoming');
 const now=Date.now()/1000;
 const auctions=data.auctions.filter(auction=>auction.status==='active'&&auction.ends>now);

 return <div className="pg-home">
  <section className="pg-window pg-home-events">
   <div className="pg-title">
    <h3>{t('Ongoing & Upcoming Events')}</h3>
    <a className="pg-text-link" href="/?view=events">{t('View All Events')}</a>
   </div>
   <EventSummary events={current.slice(0,5)} showMap/>
   <div className="pg-home-foot"><a className="pg-button" href="/?view=events&create=1">{t('Create Event')}</a></div>
  </section>

  <div className="pg-home-aside">
   <section className="pg-window pg-home-auction-panel">
    <div className="pg-title">
     <h3>{t('Ongoing & Upcoming Auctions')}</h3>
     <a className="pg-text-link" href="/?view=auctions">{t('View All Auctions')}</a>
    </div>
    {auctions.length?<ul className="pg-home-auctions">{auctions.slice(0,4).map(auction=>{
     const upcoming=auction.starts>now;
     return <li key={auction.id}><a href={'/?view=auctions&auction='+auction.id}>
      <img className={auction.icon.startsWith('/api/images/')?'pg-home-screenshot':undefined} src={auction.icon} width={32} height={64} alt="" loading="lazy"/>
      <div><strong>{auction.name}{auction.height===2?'+'+auction.upgrade:''}</strong>
       <span>{upcoming?t('Starts'):t('Ends')} {localTime(upcoming?auction.starts:auction.ends)}</span>
       <span>{auction.winner_name?t('Highest bidder: ')+auction.winner_name:t('No bids yet')}</span>
      </div>
      <b>{auction.current||auction.minimum} PP</b>
     </a></li>;
    })}</ul>:<p className="pg-empty">{t('No ongoing or upcoming auctions.')}</p>}
   </section>

   {contribution&&<section className={'pg-window pg-weekly-quest'+(completed?' pg-quest-completed':'')}>
    <div className="pg-title">
     <h3>{t('Weekly Quests')}</h3>
     <span className={completed?'pg-green':'pg-dim'}>{completed?t('Completed'):contribution.checked?t('Not Completed'):t('Syncing')}</span>
    </div>
    <div className="pg-quest-body">
     <div><h4>{t('Guild Bank Contribution')}</h4>
      <p>{t('{amount} Yang to GuildBanker at the Ch-3 Blacksmith.',{amount:formatYang.format(settings.weekly)})}</p>
      <span>{settings.rate} PP {t('after the transfer appears in the Deposit Log')}{t(' · Resets every Monday')}</span>
     </div>
     <div className="pg-quest-progress">
      {Boolean(contribution.checked)&&<strong>{formatYang.format(contribution.weekly_yang)} / {formatYang.format(settings.weekly)} Yang</strong>}
      <progress max={settings.weekly} value={contribution.checked?Math.min(contribution.weekly_yang,settings.weekly):undefined} aria-label={t('Weekly contribution progress')}/>
     </div>
    </div>
    <ContributionStatus data={data}/>
   </section>}

   {settings.notice&&<section className="pg-window">
    <div className="pg-title"><h3>{t('Guild Notice')}</h3></div>
    <div className="pg-guild-notice">{settings.notice==='Welcome to Paragon. Join guild events and earn Participation Points.'?t(settings.notice):settings.notice}</div>
   </section>}
  </div>
 </div>;
}

import type {Metadata} from 'next';
import GuildFooter from '../guild-footer';
import GuideNavigation from './guide-navigation';
import {guideTopics} from './guide-content';
import './guide.css';
export const metadata:Metadata={title:'How to Use — Paragon',description:'Simple visual steps for Paragon: phone setup, notifications, events, PP and auctions.'};
export const dynamic='force-static';
export default function HowToUse(){return <div id="paragon-design"><div className="pg-stage"><div className="pg-app pg-guide-app">
<a className="pg-skip" href="#main-content">Skip to content</a>
<header className="pg-masthead"><a className="pg-brand pg-guide-brand" href="/" aria-label="Paragon home"><img className="pg-crest" src="/branding/paragon-emblem.png" width={80} height={80} alt=""/><div><strong className="pg-guide-brand-name" translate="no">PARAGON</strong><span>ARTHION GUILD</span></div></a><a className="pg-button" href="/">Open Paragon</a></header>
<main className="pg-guide-main" id="main-content">
<header className="pg-guide-heading"><h1>How to Use</h1><p>One step at a time.</p></header>
<p className="pg-guide-entry"><b>First visit?</b> Sign in with Discord. You need the guild’s <b>Member</b> role.</p>
<GuideNavigation topics={guideTopics}/>
<noscript><p className="pg-guide-note">Enable JavaScript to follow the visual guides. Open Paragon and sign in with Discord to use the app.</p></noscript>
</main><GuildFooter standalone guide/></div></div></div>;}

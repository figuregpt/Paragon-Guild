'use client';
/* Full navigation returns through the server's current Discord membership gate. */
/* eslint-disable @next/next/no-html-link-for-pages */
import {useLanguage,LanguageSelect} from '@/app/language-provider';
import {t} from '@/lib/i18n';
import GuildFooter from '../guild-footer';
import GuideNavigation from './guide-navigation';
export default function GuidePage(){
 useLanguage();return <div id="paragon-design"><div className="pg-stage"><div className="pg-app pg-guide-app">
<a className="pg-skip" href="#main-content">{t("Skip to content")}</a>
<header className="pg-masthead"><a className="pg-brand pg-guide-brand" href="/" aria-label={t("Paragon home")}><img className="pg-crest" src="/branding/paragon-emblem.png" width={80} height={80} alt=""/><div><strong className="pg-guide-brand-name" translate="no">PARAGON</strong><span>{t("ARTHION GUILD")}</span></div></a><div className="pg-masthead-tools"><LanguageSelect/><a className="pg-button" href="/">{t("Open Paragon")}</a></div></header>
<main className="pg-guide-main" id="main-content">
<header className="pg-guide-heading"><h1>{t("How to Use")}</h1><p>{t("One step at a time.")}</p></header>
<p className="pg-guide-entry"><b>{t('First visit?')}</b> {t('Sign in with Discord. Your account needs the guild’s Member role.')}</p>
<GuideNavigation/>
<noscript><p className="pg-guide-note">{t("Enable JavaScript to follow the visual guides. Open Paragon and sign in with Discord to use the app.")}</p></noscript>
</main><GuildFooter standalone guide/></div></div></div>;}

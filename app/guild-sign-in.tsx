'use client';
import {useLanguage,LanguageSelect} from '@/app/language-provider';
import {t} from '@/lib/i18n';
import GuildFooter from './guild-footer';

export default function GuildSignIn({ready,message}:{ready:boolean;message?:string}){
 useLanguage();
 return <div id="paragon-design"><div className="pg-stage"><div className="pg-app pg-entry-app">
  <a className="pg-skip" href="#main-content">{t("Skip to content")}</a>
  <header className="pg-masthead"><div className="pg-brand">
   <img className="pg-crest" src="/branding/paragon-emblem.png" width="80" height="80" alt={t("Paragon guild emblem")}/>
   <div><h1>PARAGON</h1><span>{t("ARTHION GUILD")}</span></div>
  </div><LanguageSelect/></header>
  <main id="main-content" className="pg-login">
   <div className="pg-login-brand"><img src="/branding/paragon-emblem.png" width="380" height="380" alt={t("Paragon guild emblem")}/></div>
   <section className="pg-window"><div className="pg-title"><h3>{t("Sign In")}</h3></div><div className="pg-form">
    {message&&<p role="alert">{t(message)}</p>}
    <p className="pg-dim">{t("Guild members only.")}</p>
    {ready?<a className="pg-button pg-red" href="/auth/discord">{t("Sign in with Discord")}</a>:<><button className="pg-button pg-red" disabled>{t("Sign in with Discord")}</button><p className="pg-dim">{t("Discord sign-in is currently unavailable.")}</p></>}
   </div></section>
  </main>
  <GuildFooter standalone/>
 </div></div></div>;
}

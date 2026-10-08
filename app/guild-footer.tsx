'use client';
import {useLanguage} from '@/app/language-provider';
import {t} from '@/lib/i18n';
import type {ReactNode} from 'react';

export default function GuildFooter({context,standalone=false,guide=false,children}:{context?:string;standalone?:boolean;guide?:boolean;children?:ReactNode}){
 useLanguage();
 return <footer className={'pg-footer'+(standalone?' pg-footer-standalone':'')}>
  <span>{t("PARAGON / ARTHION GUILD APP")}</span>
  <div className="pg-footer-links"><a href="/how-to-use" aria-current={guide?'page':undefined}>{t("How to Use")}</a><span>{context&&<>{t(context)} · </>}{t('Made by {name} with love',{name:'YIGO'})}</span></div>
  {children}
 </footer>;
}

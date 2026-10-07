import type {ReactNode} from 'react';

export default function GuildFooter({context,standalone=false,guide=false,children}:{context?:string;standalone?:boolean;guide?:boolean;children?:ReactNode}){
 return <footer className={'pg-footer'+(standalone?' pg-footer-standalone':'')}>
  <span>PARAGON / ARTHION GUILD APP</span>
  <div className="pg-footer-links"><a href="/how-to-use" aria-current={guide?'page':undefined}>How to Use</a><span>{context&&<>{context} · </>}Made by <span translate="no">YIGO</span> with love</span></div>
  {children}
 </footer>;
}

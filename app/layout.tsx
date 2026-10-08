import type {Metadata,Viewport} from 'next';
import LanguageProvider from './language-provider';
import './paragon.css';
import './globals.css';
export const metadata:Metadata={title:'Paragon — Arthion Guild App',description:'Paragon: loot auctions, Participation Points and guild events.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/branding/paragon-emblem.png'},appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'Paragon'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#0b0d11'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><LanguageProvider>{children}</LanguageProvider></body></html>;}

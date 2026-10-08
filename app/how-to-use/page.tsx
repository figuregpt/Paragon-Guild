import type {Metadata} from 'next';
import GuidePage from './guide-page';
import './guide.css';
export const metadata:Metadata={title:'How to Use — Paragon',description:'Simple visual steps for Paragon: phone setup, notifications, events, PP and auctions.'};
export default function HowToUse(){return <GuidePage/>;}

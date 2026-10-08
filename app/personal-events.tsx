'use client';
import {useLanguage} from '@/app/language-provider';
import {t} from '@/lib/i18n';
import {useState} from 'react';
import {EventSummary} from './guild-events';
import type {GuildData} from '@/lib/domain';
export default function PersonalEvents({data}:{data:GuildData}){
 useLanguage();const [filter,setFilter]=useState('Created');const events=data.my_events.filter(e=>filter==='Created'?e.created_by===data.member.id:filter==='Joined'?Boolean(e.joined):Boolean(e.attended)&&e.status==='completed');return <section className="pg-window"><div className="pg-title"><h3>{t("My Events")}</h3></div><div className="pg-subtabs" aria-label={t("My event history")}>{['Created','Joined','Attended'].map(value=><button className="pg-button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{t(value)}</button>)}</div><EventSummary events={events} empty={t(filter==='Created'?'No created events yet.':filter==='Joined'?'No joined events yet.':'No attended events yet.')}/></section>;}

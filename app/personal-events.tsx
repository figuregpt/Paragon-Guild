'use client';
import {useState} from 'react';
import {EventSummary} from './guild-events';
import type {GuildData} from '@/lib/domain';
export default function PersonalEvents({data}:{data:GuildData}){const [filter,setFilter]=useState('Created');const events=data.my_events.filter(e=>filter==='Created'?e.created_by===data.member.id:filter==='Joined'?Boolean(e.joined):Boolean(e.attended)&&e.status==='completed');return <section className="pg-window"><div className="pg-title"><h3>My Events</h3></div><div className="pg-subtabs" aria-label="My event history">{['Created','Joined','Attended'].map(value=><button className="pg-button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value}</button>)}</div><EventSummary events={events} empty={'No '+filter.toLowerCase()+' events yet.'}/></section>;}

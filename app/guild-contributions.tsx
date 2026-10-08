'use client';
import {useLanguage} from '@/app/language-provider';
import {t,localeTag} from '@/lib/i18n';
import type {GuildData} from '@/lib/domain';
import {localTime} from '@/lib/local-time';
const fmt=(n:number)=>new Intl.NumberFormat(localeTag()).format(n);
export function ContributionStatus({data}:{data:GuildData}){
 useLanguage();
 const source=data.contribution;if(!source)return null;
 return <p className="pg-contribution-sync" role={source.error||source.stale?'status':undefined}>{!source.checked?t("Waiting for the first spreadsheet sync."):source.error||source.stale?t("Updates are delayed. Showing the last verified spreadsheet data."):t("Synced from the guild Deposit Log · Checks every 5 minutes.")}{Boolean(source.checked)&&<span>{t("Last checked: ")}{localTime(source.checked)}</span>}</p>;
}
export default function GuildContributions({data}:{data:GuildData}){
 useLanguage();
 const source=data.contribution;if(!source)return null;
 return <section className="pg-window"><div className="pg-title"><h3>{t("Guild Bank Contributions")}</h3><span className="pg-dim">Yang</span></div><div className="pg-summary pg-contribution-summary"><div><span>{t("Total Deposited")}</span><strong>{source.checked?fmt(source.total_yang):'—'}</strong></div><div><span>{t("This Week")}</span><strong>{source.checked?fmt(source.weekly_yang):'—'}</strong></div></div><ContributionStatus data={data}/><details className="pg-contribution-log"><summary>{t("Deposit History ")}<span>{t("Highest amounts first")}</span></summary>{source.entries.length?<ul>{source.entries.map(d=><li key={d.row}><div><time dateTime={d.date}>{new Intl.DateTimeFormat(localeTag(),{dateStyle:'medium'}).format(new Date(d.date+'T12:00:00'))}</time>{d.note&&<span>{d.note}</span>}</div><strong>{fmt(d.yang)} Yang</strong></li>)}</ul>:<p className="pg-empty">{source.checked?t("No deposits recorded for your character yet."):t("Deposit history will appear after the first sync.")}</p>}</details></section>;
}

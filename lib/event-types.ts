import {t} from './i18n';
export const EVENT_KINDS=['Help','Demon Tower','PvE','PvP','Guild War','World Boss','Custom'] as const;
export type EventKind=typeof EVENT_KINDS[number];
export const EVENT_REWARDS={Help:10,'Demon Tower':10,PvE:35,PvP:100,'Guild War':100,'World Boss':75} as const;
export const MAX_EVENT_PP=1_000_000;
export function eventKindLabel(kind:string){return t(kind==='PvP'?'Open PvP':kind);}

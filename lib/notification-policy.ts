export type NotificationEvent={kind:string;created:number;starts:number;event_status:string;event_phase:string;event_kind:string;duration_minutes:number|null;active:number;new_events:number};
export function shouldDeliverNotification(n:NotificationEvent,time:number):boolean{
 if(!n.active||n.event_status!=='upcoming'||!['open','legacy'].includes(n.event_phase))return false;
 if(n.kind==='reminder')return n.starts>time;
 if(!n.new_events||n.created<time-86400)return false;
 // Help starts immediately; it remains announceable while its chosen duration is running.
 if(n.event_kind==='Help')return n.starts+(n.duration_minutes||60)*60>time;
 return n.starts>=time;
}

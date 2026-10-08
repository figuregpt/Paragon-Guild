export type Member={id:string;name:string;class:string;avatar:string|null;admin:number;balance:number;reserved:number;new_events:number;can_host:number};
export type Event={id:string;title:string;type:'PvE'|'PvP';kind:string;phase:string;created_by:string;creator_name:string;attended:number;review_note:string;starts:number;duration_minutes:number|null;location:string;game_channel:number|null;map_asset?:string|null;map_x?:number|null;map_y?:number|null;pp:number;description:string;status:string;joined:number;reminder:number|null;signups:number};
export type Item={id:string;name:string;icon:string;height:number;level:number|null;classes:string};
export type Auction=Item&{id:string;item_id:string;upgrade:number;quantity:number;source:string;bonuses:string;minimum:number;increment:number;current:number;winner:string|null;winner_name:string|null;ends:number;starts:number;status:string};
export type Ledger={id:string;amount:number;category:string;label:string;created:number};
export type Deposit={id:string;member_id:string;member_name?:string;yang:number;pp:number;kind:string;week:string|null;note:string;status:string;created:number};
export type Contribution={total_yang:number;weekly_yang:number;checked:number;stale:boolean;error:boolean;entries:{row:number;date:string;yang:number;note:string}[]};
export type GuildData={contribution:Contribution|null;member:Member;events:Event[];my_events:Event[];week:string;eventPolicy:{helpDailyLimit:number;dayZone:string;organizerConfigured:boolean};auctions:Auction[];ledger:Ledger[];deposits:Deposit[];settings:{weekly:number;rate:number;notice:string};pending:Deposit[];participants:{event_id:string;member_id:string;name:string;joined:number;attended:number}[];pushReady:boolean;vapidPublicKey:string|null;schedulerReady:boolean;localPreview:boolean;demo?:boolean};
export const CLASSES=['Warrior','Ninja','Sura','Shaman','Lycan'] as const;
export const now=()=>Math.floor(Date.now()/1000);
export const id=()=>crypto.randomUUID();
export function weekKey(time=Date.now()){const d=new Date(time+3*3600000);const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-day+1);return d.toISOString().slice(0,10);}
export function depositPoints(yang:number,unit:number,rate:number){return Math.floor(yang/unit*rate);}

export type BankEntry={id:string;kind:string;status:string;name:string;amount:number;date:string;description:string;loan_id:string|null};
export type GuildLoan={id:string;borrower:string;principal:number;repaid:number;description:string;issued:string;due:string|null};
export type BankData={source:{title:string;url:string;imported:number;issues:string[]}|null;people:{id:string;name:string;class:string;total_yang:number;active:number}[];entries:BankEntry[];loans:GuildLoan[];summary:{deposited:number;cash:number;planned:number;available:number;outstanding:number}};

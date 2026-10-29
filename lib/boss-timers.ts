export const BOSS_RESPAWN_SECONDS=40*60;
export const BOSS_ADJUSTMENT_SECONDS=10*60;
export const BOSS_MAX_DURATION_SECONDS=24*60*60;
export type BossTimerAction='kill'|'clear'|'subtract10'|'add10'|'subtract1'|'add1';
export const BOSS_CHANNELS=[1,2,3,4,5,6] as const;
export type BossTimer={boss_id:string;game_channel:number;killed:number;respawns:number;revision:string};
export type BossTimerState={timers:BossTimer[];serverTime:number;pushReady:boolean;subscribed:boolean};
export function remainingSeconds(timer:BossTimer,time:number){return Math.max(0,timer.respawns-time);}
export function countdown(seconds:number){const value=Math.max(0,Math.ceil(seconds));return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');}

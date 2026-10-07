import {env} from 'cloudflare:workers';
export const database=()=>{if(!env.DB)throw new Error('Database is not available.');return env.DB;};
export const all=async<T=Record<string,unknown>>(sql:string,...args:unknown[])=> (await database().prepare(sql).bind(...args).all<T>()).results;
export const first=async<T=Record<string,unknown>>(sql:string,...args:unknown[])=>database().prepare(sql).bind(...args).first<T>();
export const run=(sql:string,...args:unknown[])=>database().prepare(sql).bind(...args).run();

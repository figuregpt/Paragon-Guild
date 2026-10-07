'use client';
import {useEffect,useState} from 'react';
import {localTime} from '@/lib/local-time';
type Bid={id:string;name:string;amount:number;created:number};
export default function AuctionBids({auctionId,current}:{auctionId:string;current:number}){
 const [open,setOpen]=useState(false),[page,setPage]=useState(0),[result,setResult]=useState<{bids:Bid[];total:number}|null>(null),[error,setError]=useState('');
 useEffect(()=>{setPage(0);},[current]);
 useEffect(()=>{if(!open)return;const abort=new AbortController();setError('');setResult(null);fetch(`/api/auction-bids?id=${encodeURIComponent(auctionId)}&page=${page}`,{signal:abort.signal,cache:'no-store'}).then(async r=>{const d:any=await r.json();if(!r.ok)throw Error(d.error);setResult(d);}).catch(e=>{if(e.name!=='AbortError')setError('Could not load bids. Close and reopen the history to try again.');});return()=>abort.abort();},[auctionId,page,current,open]);
 return <details className="pg-bid-history" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>Bid History</summary>{error?<p className="pg-error" role="alert">{error}</p>:!result?<p className="pg-dim" role="status">Loading bids…</p>:<>{result.bids.length?<div className="pg-bid-list" tabIndex={0} role="region" aria-label="Guild bid history">{result.bids.map(b=><div className="pg-bid-row" key={b.id}><span>{b.name}</span><strong>{b.amount.toLocaleString('en-GB')} PP</strong><time dateTime={new Date(b.created*1000).toISOString()}>{localTime(b.created)}</time></div>)}</div>:<p className="pg-dim">No bids have been placed.</p>}{result.total>20&&<div className="pg-bid-pages"><button className="pg-button" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Newer</button><span>{page*20+1}–{Math.min((page+1)*20,result.total)} / {result.total}</span><button className="pg-button" disabled={(page+1)*20>=result.total} onClick={()=>setPage(p=>p+1)}>Older</button></div>}</>}</details>;
}

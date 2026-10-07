'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';

export default function AuctionCreate({onCreated}:{onCreated:()=>Promise<void>}){
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState(''),[dirty,setDirty]=useState(false);
 const requestId=useRef(''),errorRef=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 async function create(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(pending)return;const form=event.currentTarget;
  if(!file){setError('Upload an item screenshot.');return;}
  if(!requestId.current)requestId.current=crypto.randomUUID();
  const body=new FormData(form);body.set('id',requestId.current);
  setPending(true);setError('');
  try{const response=await fetch('/api/admin/auction',{method:'POST',body});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'The auction could not be created.');form.reset();setFile(null);setDirty(false);requestId.current='';await onCreated();}
  catch(error){setError(error instanceof Error?error.message:'Please try again.');requestAnimationFrame(()=>errorRef.current?.focus());}
  finally{setPending(false);}
 }
 return <form className="pg-form pg-auction-create" onSubmit={create} onChange={()=>setDirty(true)} aria-busy={pending}>
  {error&&<p className="pg-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
  <fieldset disabled={pending} className="pg-auction-fields">
   <div className="pg-auction-upload">
    <label className="pg-field pg-file" htmlFor="pg-auction-image"><span>Item Screenshot</span></label><input id="pg-auction-image" name="screenshot" type="file" required accept="image/png,image/jpeg,image/webp" aria-describedby="pg-auction-image-help" onChange={event=>{const next=event.target.files?.[0];requestId.current='';if(next&&(!['image/png','image/jpeg','image/webp'].includes(next.type)||next.size>8000000)){event.target.value='';setFile(null);setError('Choose a PNG, JPEG or WebP screenshot smaller than 8 MB.');return;}setFile(next||null);setError('');}}/><small id="pg-auction-image-help">PNG, JPEG or WebP · Up to 8 MB</small>
    {preview&&<div className="pg-auction-preview"><img src={preview} width={640} height={480} alt="Selected item screenshot"/><span>{file?.name}</span></div>}
   </div>
   <div className="pg-auction-inputs">
    <label className="pg-field pg-span"><span>Item Name</span><input name="name" required maxLength={80} autoComplete="off" placeholder="Poison Sword +9…" onChange={()=>{requestId.current='';}}/></label>
    <label className="pg-field"><span>Quantity</span><input name="quantity" type="number" min={1} max={200} defaultValue={1} required inputMode="numeric" autoComplete="off" onChange={()=>{requestId.current='';}}/></label>
    <label className="pg-field"><span>Loot Source (optional)</span><input name="source" maxLength={80} autoComplete="off" placeholder="Demon Tower…" onChange={()=>{requestId.current='';}}/></label>
    <label className="pg-field"><span>Minimum Bid (PP)</span><input name="minimum" type="number" min={1} max={1000000} defaultValue={100} required inputMode="numeric" autoComplete="off" onChange={()=>{requestId.current='';}}/></label>
    <label className="pg-field"><span>Bid Increment (PP)</span><input name="increment" type="number" min={1} max={1000000} defaultValue={10} required inputMode="numeric" autoComplete="off" onChange={()=>{requestId.current='';}}/></label>
    <label className="pg-field"><span>Duration (hours)</span><input name="hours" type="number" min={1} max={168} defaultValue={24} required inputMode="numeric" autoComplete="off" onChange={()=>{requestId.current='';}}/></label>
    <label className="pg-field pg-span"><span>Item Details (optional)</span><textarea name="bonuses" rows={2} maxLength={300} autoComplete="off" placeholder="Bonuses or additional details…" onChange={()=>{requestId.current='';}}/></label>
   </div>
  </fieldset>
  <div className="pg-auction-create-actions"><button className="pg-button pg-red" type="submit" disabled={pending}>{pending?'Starting…':'Start Auction'}</button></div>
 </form>;
}

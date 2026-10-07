import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {HttpError} from './auth';
import {database,first} from './database';
import {id,now,type Member} from './domain';

async function uploadForm(request:Request){
 if(!request.headers.get('content-type')?.startsWith('multipart/form-data'))throw new HttpError(400,'Enter an item name and upload its screenshot.');
 if(Number(request.headers.get('content-length')||0)>8500000)throw new HttpError(413,'Choose a screenshot smaller than 8 MB.');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Upload an item screenshot.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8500000){await reader.cancel();throw new HttpError(413,'Choose a screenshot smaller than 8 MB.');}chunks.push(value);}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
 try{return await new Response(data,{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();}catch{throw new HttpError(400,'Upload the item screenshot again.');}
}

export async function createScreenshotAuction(request:Request,member:Member){
 if(!member.admin)throw new HttpError(403,'Administrator access is required.');
 const form=await uploadForm(request);
 const text=(key:string)=>form.get(key)??'';
 const number=(key:string)=>Number(form.get(key));
 const integer=(min:number,max:number)=>z.number().int().min(min).max(max);
 const b=z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(80),quantity:integer(1,200),source:z.string().trim().max(80),bonuses:z.string().trim().max(300),minimum:integer(1,1000000),increment:integer(1,1000000),hours:integer(1,168)}).parse({id:text('id'),name:text('name'),quantity:number('quantity'),source:text('source'),bonuses:text('bonuses'),minimum:number('minimum'),increment:number('increment'),hours:number('hours')});
 const file=form.get('screenshot');
 if(!(file instanceof File)||!file.size||file.size>8000000)throw new HttpError(400,'Upload an item screenshot smaller than 8 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());let type='',extension='';
 if(bytes.length>32&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)){type='image/png';extension='png';}
 else if(bytes.length>32&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255){type='image/jpeg';extension='jpg';}
 else if(bytes.length>32&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'){type='image/webp';extension='webp';}
 if(!type||file.type!==type)throw new HttpError(400,'Upload a PNG, JPEG or WebP item screenshot.');
 if(!env.BUCKET)throw new HttpError(503,'Screenshot storage is unavailable.');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const filename=b.id+'-'+digest+'.'+extension,icon='/api/images/'+filename,source=b.source||'Guild Loot';
 const find=()=>first<any>('SELECT a.*,i.name,i.icon FROM auctions a JOIN items i ON i.id=a.item_id WHERE a.id=?',b.id);
 const matches=(old:any)=>old.created_by===member.id&&old.name===b.name&&old.icon===icon&&old.quantity===b.quantity&&old.source===source&&old.bonuses===b.bonuses&&old.minimum===b.minimum&&old.increment===b.increment&&old.ends-old.starts===b.hours*3600;
 const old=await find();if(old){if(!matches(old))throw new HttpError(409,'This request ID was already used for a different auction.');return;}
 await env.BUCKET.put('icons/'+filename,bytes,{httpMetadata:{contentType:type}});
 const created=now();
 try{
  await database().batch([
   database().prepare('INSERT INTO items(id,name,icon,height,level,classes,created) VALUES(?,?,?,1,NULL,?,?)').bind(b.id,b.name,icon,'',created),
   database().prepare('INSERT INTO auctions(id,item_id,upgrade,quantity,source,bonuses,minimum,increment,starts,ends,created_by,created) VALUES(?,?,0,?,?,?,?,?,?,?,?,?)').bind(b.id,b.id,b.quantity,source,b.bonuses,b.minimum,b.increment,created,created+b.hours*3600,member.id,created),
   database().prepare('INSERT INTO audit(id,member_id,action,target,created) VALUES(?,?,?,?,?)').bind(id(),member.id,'auction-created',b.id,created)
  ]);
 }catch(error){
  // A concurrent identical retry may already have committed this same screenshot.
  const existing=await find();if(existing&&matches(existing))return;
  if(!existing||existing.icon!==icon)await env.BUCKET.delete('icons/'+filename);
  if(existing)throw new HttpError(409,'This request ID was already used for a different auction.');
  throw error;
 }
}

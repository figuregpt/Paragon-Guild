export const nameKey=value=>String(value).normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
export function csvRows(text){
 if(text.length>1000000)throw new Error('Sheet response is too large');
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else if(quoted||!field)quoted=!quoted;else throw new Error('Invalid CSV quoting');}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';}else field+=c;}
 if(quoted)throw new Error('Incomplete CSV response');if(field||row.length){row.push(field);if(row.some(v=>v.trim()))rows.push(row);}if(rows.length>5000)throw new Error('Too many sheet rows');return rows;
}
function yang(value,zero=false){const raw=String(value).trim().replace(/\s*Yang$/i,'');if(!/^(\d{1,3}(,\d{3})*|\d+)$/.test(raw))throw new Error('Invalid Yang amount');const amount=Number(raw.replace(/,/g,''));if(!Number.isSafeInteger(amount)||amount<(zero?0:1)||amount>1000000000000)throw new Error('Invalid Yang amount');return amount;}
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw new Error('Invalid deposit date');return value;}
export function parseContributionSheets(depositCsv,totalCsv){
 const raw=csvRows(depositCsv),totals=csvRows(totalCsv);const di=raw.findIndex(r=>r.includes('Date')&&r.includes('Member Name')&&r.includes('Yang Deposited')),ti=totals.findIndex(r=>r.includes('Member Name')&&r.includes('Class')&&r.includes('Yang Deposited'));
 if(di<0||ti<0)throw new Error('Sheet column headings changed');
 const dh=raw[di],th=totals[ti],people=new Map(),deposits=[];
 for(let i=di+1;i<raw.length;i++){const r=raw[i],date=String(r[dh.indexOf('Date')]||'').trim(),name=String(r[dh.indexOf('Member Name')]||'').trim(),value=String(r[dh.indexOf('Yang Deposited')]||'').trim();if(!date&&!name&&!value)continue;if(!name||name.length>80||!date||!value)throw new Error('Incomplete deposit row');const note=String(r[dh.indexOf('Notes')]||'').slice(0,300);deposits.push({row:i+1,date:validDate(date),name,name_key:nameKey(name),yang:yang(value),note});}
 for(const r of totals.slice(ti+1)){const name=String(r[th.indexOf('Member Name')]||'').trim(),value=String(r[th.indexOf('Yang Deposited')]||'').trim();if(!name&&!value)continue;if(!name||name.length>80||!value)throw new Error('Incomplete member total');const key=nameKey(name);if(people.has(key))throw new Error('Duplicate member names in Totals');people.set(key,{name,name_key:key,yang:yang(value,true)});}
 const sums=new Map();for(const d of deposits)sums.set(d.name_key,(sums.get(d.name_key)||0)+d.yang);
 for(const p of people.values())if(p.yang!==(sums.get(p.name_key)||0))throw new Error('Totals and Deposit Log do not reconcile');
 for(const d of deposits)if(!people.has(d.name_key))people.set(d.name_key,{name:d.name,name_key:d.name_key,yang:sums.get(d.name_key)});
 if(!deposits.length||!people.size||people.size>500)throw new Error('Empty or invalid sheet data');
 return {people:[...people.values()].sort((a,b)=>a.name_key.localeCompare(b.name_key)),deposits};
}

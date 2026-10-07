const CACHE='paragon-static-v5';
const STATIC=['/offline.html','/branding/paragon-emblem.png','/favicon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/'))return;
 if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.match('/offline.html')));return;}
 if(url.pathname.startsWith('/metin2/')||url.pathname.startsWith('/assets/')||url.pathname.startsWith('/branding/'))event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}return res;})));
});
function notificationUrl(value){try{const url=new URL(value,self.location.origin);if(url.origin===self.location.origin&&url.pathname==='/'&&['events','profile'].includes(url.searchParams.get('view')))return url.pathname+url.search;}catch{}return '/?view=events';}
self.addEventListener('push',event=>{let p={title:'Paragon',body:'A guild event is coming up.',url:'/?view=events'};try{p={...p,...event.data.json()};}catch{}if(Number.isFinite(p.eventStarts)&&p.eventStarts>0&&typeof p.eventTitle==='string'){p.body=p.eventTitle+' · '+new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(p.eventStarts*1000));}if(Number.isInteger(p.gameChannel)&&p.gameChannel>=1&&p.gameChannel<=6)p.body+=' · CH-'+p.gameChannel;event.waitUntil(self.registration.showNotification(p.title,{body:p.body,icon:'/branding/paragon-emblem.png',badge:'/branding/paragon-emblem.png',tag:p.tag,data:{url:notificationUrl(p.url)}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();const target=notificationUrl(event.notification.data?.url);event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{for(const client of clients){if(new URL(client.url).origin===self.location.origin){await client.navigate(target);return client.focus();}}return self.clients.openWindow(target);}));});

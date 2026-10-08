const CACHE='paragon-static-v6';
const PREFS='paragon-preferences-v1';
const LANGUAGE_URL=new URL('/__paragon_language',self.location.origin).href;
const STATIC=['/offline-language.js','/offline.html','/branding/paragon-emblem.png','/favicon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k!==PREFS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/'))return;
 if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.match('/offline.html')));return;}
 if(url.pathname.startsWith('/metin2/')||url.pathname.startsWith('/assets/')||url.pathname.startsWith('/branding/'))event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}return res;})));
});
function notificationUrl(value){try{const url=new URL(value,self.location.origin);if(url.origin===self.location.origin&&url.pathname==='/'&&['events','profile'].includes(url.searchParams.get('view')))return url.pathname+url.search;}catch{}return '/?view=events';}
const notificationCopy={
 en:{reminder:'Paragon — Event Reminder',event:'Paragon — New Event',test:'Paragon — Test Notification',enabled:'Notifications are enabled on this device.',fallback:'A guild event is coming up.'},
 tr:{reminder:'Paragon · Event Hatırlatıcısı',event:'Paragon · Yeni Event',test:'Paragon · Test Bildirimi',enabled:'Bu cihazda bildirimler açık.',fallback:'Bir lonca eventi yaklaşıyor.'},
 el:{reminder:'Paragon · Υπενθύμιση Εκδήλωσης',event:'Paragon · Νέα Εκδήλωση',test:'Paragon · Δοκιμαστική Ειδοποίηση',enabled:'Οι ειδοποιήσεις είναι ενεργές σε αυτή τη συσκευή.',fallback:'Πλησιάζει εκδήλωση συντεχνίας.'}
};
self.addEventListener('message',event=>{if(event.data?.type==='PARAGON_LANGUAGE'&&['en','tr','el'].includes(event.data.language)){event.waitUntil(caches.open(PREFS).then(cache=>cache.put(LANGUAGE_URL,new Response(event.data.language))));}});
self.addEventListener('push',event=>{event.waitUntil((async()=>{
 let language='en';try{const stored=await(await caches.open(PREFS)).match(LANGUAGE_URL),value=stored&&await stored.text();if(['en','tr','el'].includes(value))language=value;}catch{}
 const copy=notificationCopy[language],locale=({en:'en-GB',tr:'tr-TR',el:'el-GR'})[language];
 let p={title:'Paragon',body:copy.fallback,url:'/?view=events'};try{p={...p,...event.data.json()};}catch{}
 if(p.title==='Paragon — Event Reminder')p.title=copy.reminder;
 if(p.title==='Paragon — New Event')p.title=copy.event;
 if(p.title==='Paragon — Test Notification')p.title=copy.test;
 if(p.body==='Notifications are enabled on this device.')p.body=copy.enabled;
 if(Number.isFinite(p.eventStarts)&&p.eventStarts>0&&typeof p.eventTitle==='string'){p.body=p.eventTitle+' · '+new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(p.eventStarts*1000));}
 if(Number.isInteger(p.gameChannel)&&p.gameChannel>=1&&p.gameChannel<=6)p.body+=' · CH-'+p.gameChannel;
 await self.registration.showNotification(p.title,{body:p.body,icon:'/branding/paragon-emblem.png',badge:'/branding/paragon-emblem.png',tag:p.tag,data:{url:notificationUrl(p.url)}});
})());});
self.addEventListener('notificationclick',event=>{event.notification.close();const target=notificationUrl(event.notification.data?.url);event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{for(const client of clients){if(new URL(client.url).origin===self.location.origin){await client.navigate(target);return client.focus();}}return self.clients.openWindow(target);}));});

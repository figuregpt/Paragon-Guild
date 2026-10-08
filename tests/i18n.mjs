import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),messages=JSON.parse(readFileSync(new URL('lib/translations.json',root),'utf8'));
const values=key=>[...key.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
for(const [key,entry] of Object.entries(messages))for(const language of ['tr','el']){
 assert.ok(entry[language]?.trim(),key+' missing '+language);
 assert.deepEqual(values(entry[language]),values(key),key+' placeholder mismatch '+language);
 const tags=entry[language].match(/<[^>]+>/g)||[];
 assert.ok(tags.every(tag=>['<b>','</b>'].includes(tag)),key+' unexpected markup');
 assert.equal(tags.filter(t=>t==='<b>').length,tags.filter(t=>t==='</b>').length,key+' unbalanced bold');
}
const files=readdirSync(new URL('app',root)).filter(n=>n.endsWith('.tsx')).map(n=>'app/'+n).concat(['app/how-to-use/guide-content.tsx','app/how-to-use/guide-navigation.tsx','app/how-to-use/guide-page.tsx']);
for(const file of files){const source=readFileSync(new URL(file,root),'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function visit(n){if(ts.isCallExpression(n)&&['t','rich'].includes(n.expression.getText(ast))&&ts.isStringLiteral(n.arguments[0])){const key=n.arguments[0].text.trim();assert.ok(Object.hasOwn(messages,key),file+': untranslated key '+key);}if(ts.isJsxAttribute(n)&&['value','key','name','href','className','id'].includes(n.name.getText(ast))&&n.initializer)assert.doesNotMatch(n.initializer.getText(ast),/^\{t\(/,file+': translated protocol attribute');ts.forEachChild(n,visit);}visit(ast);}
const source=readFileSync(new URL('lib/i18n.ts',root),'utf8').replace("import messages from './translations.json';",'const messages='+JSON.stringify(messages)+';');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {translate,isLanguage,localeTag,ledgerLabel}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
assert.equal(translate('Reserved','tr'),'Ayrılan');assert.equal(translate('Reserved','el'),'Δεσμευμένα');assert.equal(translate(' Reserved: ','tr'),' Ayrılan: ');
assert.equal(translate('Step {current} of {total}','el',{current:2,total:5}),'Βήμα 2 από 5');
assert.equal(translate('25 PP added to MyPlayer.','tr'),'MyPlayer için 25 PP eklendi.');
assert.equal(translate('A user-written event title','el'),'A user-written event title');
assert.equal(translate('constructor','tr'),'constructor');assert.equal(isLanguage('gr'),false);assert.equal(isLanguage('el'),true);assert.equal(localeTag('tr'),'tr-TR');
assert.equal(translate('Step {current} of {total}','en',{current:2,total:5}),'Step 2 of 5');
// Generated ledger suffixes are translated while authored titles/reasons remain intact.
for(const language of ['en','tr','el']){
 globalThis.document={documentElement:{lang:language}};
 assert.equal(ledgerLabel({id:'event:abc',category:'Help',label:'My Event / Creator'}),'My Event / '+translate('Creator',language));
 assert.equal(ledgerLabel({id:'auction:abc',category:'Auctions',label:'My Sword auction won'}),'My Sword / '+translate('Auction Won',language));
 assert.equal(ledgerLabel({id:'adjust:abc',category:'Adjustment',label:'Player-authored reason'}),'Player-authored reason');
 assert.equal(ledgerLabel({id:'deposit:abc',category:'Deposits',label:'Weekly Deposit / 500000 Yang'}),translate('Weekly Deposit',language)+' / '+new Intl.NumberFormat(localeTag(language)).format(500000)+' Yang');
}
delete globalThis.document;
// Execute the offline screen in each language, including invalid persisted preferences.
for(const language of ['en','tr','el','constructor']){
 const elements={copy:{},button:{},image:{}},document={documentElement:{},getElementById:id=>id==='offline-copy'?elements.copy:elements.button,querySelector:()=>elements.image};
 vm.runInNewContext(readFileSync(new URL('public/offline-language.js',root),'utf8'),{document,localStorage:{getItem:()=>language},navigator:{languages:['en-GB']}});
 assert.equal(document.documentElement.lang,language==='constructor'?'en':language);
 assert.ok(elements.copy.textContent?.length>10);assert.ok(elements.button.textContent);assert.ok(elements.image.alt);
}
// Execute the real worker with persistent preference storage: no push provider is contacted.
const handlers={},shown=[],store=new Map(),cache={put:async(url,response)=>store.set(String(url),await response.text()),match:async url=>store.has(String(url))?new Response(store.get(String(url))):undefined};
const context={URL,Intl,Date,Number,Response,console,caches:{open:async()=>cache},self:{location:{origin:'https://paragon.example'},addEventListener:(key,fn)=>handlers[key]=fn,registration:{showNotification:async(title,options)=>shown.push({title,...options})}}};
vm.runInNewContext(readFileSync(new URL('public/sw.js',root),'utf8'),context);
for(const language of ['tr','el','en']){
 let wait;handlers.message({data:{type:'PARAGON_LANGUAGE',language},waitUntil:p=>wait=p});await wait;
 handlers.push({data:{json:()=>({title:'Paragon — Test Notification',body:'Notifications are enabled on this device.',url:'/?view=profile'})},waitUntil:p=>wait=p});await wait;
 assert.equal(shown.at(-1).body,translate('Notifications are enabled on this device.',language));
 handlers.push({data:{json:()=>({title:'Paragon — Event Reminder',eventTitle:'User title stays as written',eventStarts:1700000000,gameChannel:4,url:'/?view=events&event=123'})},waitUntil:p=>wait=p});await wait;
 assert.match(shown.at(-1).body,/^User title stays as written/);assert.match(shown.at(-1).body,/CH-4/);assert.equal(shown.at(-1).data.url,'/?view=events&event=123');
}
const before=store.size;handlers.message({data:{type:'PARAGON_LANGUAGE',language:'invalid'},waitUntil:()=>assert.fail('invalid language was stored')});assert.equal(store.size,before);
console.log('PASS translations: '+Object.keys(messages).length+' keys in TR/EL, complete static UI/guide coverage, matching placeholders, safe markup, unchanged identifiers, language validation, templated errors and persisted/localized service-worker notifications.');

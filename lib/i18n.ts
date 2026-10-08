import messages from './translations.json';

export const LANGUAGES = ['en', 'tr', 'el'] as const;
export type Language = typeof LANGUAGES[number];
export const LANGUAGE_STORAGE_KEY = 'paragon-language';
export function isLanguage(value: unknown): value is Language {
 return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
export function currentLanguage(): Language {
 const value = typeof document === 'undefined' ? 'en' : document.documentElement.lang;
 return isLanguage(value) ? value : 'en';
}
export function localeTag(language = currentLanguage()) {
 return ({en:'en-GB', tr:'tr-TR', el:'el-GR'} as const)[language];
}
type Variables = Record<string, string | number>;
const templates = Object.keys(messages).filter(key=>/\{\w+\}/.test(key)).map(key=>{
 const names:string[]=[];
 const pattern=key.split(/(\{\w+\})/).map(part=>{
  if(/^\{\w+\}$/.test(part)){names.push(part.slice(1,-1));return '(.+?)';}
  return part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 }).join('');
 return {key,names,pattern:new RegExp('^'+pattern+'$')};
});
export function translate(text: string, language: Language, values?: Variables): string {
 const space = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
 const key = space[2];
 const dictionary=messages as Record<string, {tr:string; el:string}>;
 const entry = Object.hasOwn(dictionary,key)?dictionary[key]:undefined;
 if(!entry&&!values){
  for(const template of templates){
   const match=key.match(template.pattern);
   if(match)return space[1]+translate(template.key,language,Object.fromEntries(template.names.map((name,index)=>[name,match[index+1]])))+space[3];
  }
 }
 let translated = language === 'en' ? key : entry?.[language] ?? key;
 if (values) translated = translated.replace(/\{(\w+)\}/g, (token, name) => String(values[name] ?? token));
 return space[1] + translated + space[3];
}
/** Only application-owned copy is passed here. Player names and authored content stay untouched. */
export function t(text: string | null | undefined, values?: Variables): string {
 return translate(text ?? '', currentLanguage(), values);
}

/** Localize generated ledger labels without translating player-authored titles or admin reasons. */
export function ledgerLabel(row:{id:string;category:string;label:string}){
 if(row.id.startsWith('event:'))return row.label.replace(/ \/ (Creator|Participation)$/,(_,role)=>' / '+t(role));
 if(row.id.startsWith('auction:'))return row.label.replace(/ auction won$/,' / '+t('Auction Won'));
 if(row.category==='Deposits'){
  if(row.label==='Weekly Contribution / Guild Bank')return t(row.label);
  const match=row.label.match(/^(Historical Contributions|Weekly Deposit|Guild Donation) \/ (\d+) Yang$/);
  if(match)return t(match[1])+' / '+new Intl.NumberFormat(localeTag()).format(Number(match[2]))+' Yang';
 }
 return row.label;
}

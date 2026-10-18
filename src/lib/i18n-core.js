let english={};let french={};let patterns=[];
export function installEnglish(dictionary){english=dictionary;french=Object.fromEntries(Object.entries(english).map(([fr,en])=>[en,fr]));patterns=buildPatterns();}
export function normalLanguage(value){return typeof value==='string'&&value.toLowerCase().split(/[-_]/)[0]==='en'?'en':'fr';}
export function chooseLanguage({url,saved,languages=[]}={}){if(url==='fr'||url==='en')return url;if(saved==='fr'||saved==='en')return saved;for(const language of languages){if(/^(fr|en)(-|$)/i.test(language))return normalLanguage(language);}return 'fr';}
let language='fr';const listeners=new Set();
export function getLanguage(){return language;}
export function subscribeLanguage(callback){listeners.add(callback);return()=>listeners.delete(callback);}
export function setLanguage(value){const next=normalLanguage(value);if(next===language)return;language=next;for(const listener of listeners)listener();}
export function localeFor(value=language){return normalLanguage(value)==='en'?'en-GB':'fr-FR';}
const escaped=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const buildPatterns=()=>Object.entries(english).filter(([key])=>/\{\d+\}/.test(key)).map(([key,value])=>{const ids=[];const parts=key.split(/(\{\d+\})/);return {regex:new RegExp('^'+parts.map(p=>/^\{\d+\}$/.test(p)?(ids.push(p.slice(1,-1)),'([\\s\\S]*?)'):escaped(p)).join('')+'$'),ids,value};});
export function tr(text,lang=language,...values){
 if(typeof text!=='string')return text;
 let result=normalLanguage(lang)==='fr'?(french[text]??text):text;
 if(normalLanguage(lang)==='en'){
  result=english[text]??text;
  if(result===text){const trimmed=text.trim();if(english[trimmed]!==undefined)result=text.slice(0,text.indexOf(trimmed))+english[trimmed]+text.slice(text.indexOf(trimmed)+trimmed.length);else for(const pattern of patterns){const m=pattern.regex.exec(text);if(m){result=pattern.value.replace(/\{(\d+)\}/g,(_,id)=>english[m[pattern.ids.indexOf(id)+1]]??m[pattern.ids.indexOf(id)+1]??'');break;}}}
 }
 return result.replace(/\{(\d+)\}/g,(match,i)=>values[Number(i)]===undefined?match:String(values[Number(i)]));
}
export function t(text,...values){return tr(text,language,...values);}

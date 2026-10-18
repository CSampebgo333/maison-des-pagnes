export type Language='fr'|'en';
export function normalLanguage(value:unknown):Language;
export function chooseLanguage(options?:{url?:unknown;saved?:unknown;languages?:readonly string[]}):Language;
export function getLanguage():Language;
export function setLanguage(value:unknown):void;
export function subscribeLanguage(callback:()=>void):()=>boolean;
export function localeFor(value?:unknown):string;
export function tr(text:string,language?:unknown,...values:unknown[]):string;
export function t(text:string,...values:unknown[]):string;

export function installEnglish(dictionary:Record<string,string>):void;

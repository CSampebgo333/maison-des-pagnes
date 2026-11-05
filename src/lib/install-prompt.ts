export const INSTALL_NOTICE_KEY='maison-faso-install-notice-v1';
export const INSTALL_KNOWN_KEY='maison-faso-installed-v1';
export const INSTALL_INTERVAL=24*60*60*1000;
type Store=Pick<Storage,'getItem'|'setItem'>;
export function noticeDue(value:string|null,now=Date.now()){
 if(value===null)return true;
 const last=Number(value);
 return !Number.isFinite(last)||last<0||now-last>=INSTALL_INTERVAL;
}
// Only write when the notice is actually about to appear, never on each visit.
export function claimInstallNotice(store:Store,now=Date.now()){
 try{if(store.getItem(INSTALL_KNOWN_KEY)==='1'||!noticeDue(store.getItem(INSTALL_NOTICE_KEY),now))return false;store.setItem(INSTALL_NOTICE_KEY,String(now));return true;}catch{return false;}
}
export type InstallPromptEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
let pendingInstall:InstallPromptEvent|null=null;
const subscribers=new Set<()=>void>();
function changed(){for(const subscriber of subscribers)subscriber();}
export const getInstallPrompt=()=>pendingInstall;
export const subscribeInstallPrompt=(subscriber:()=>void)=>{subscribers.add(subscriber);return()=>{subscribers.delete(subscriber);};};
export const clearInstallPrompt=()=>{if(pendingInstall){pendingInstall=null;changed();}};
export function captureInstallPrompt(target:EventTarget=window){
 const ready=(event:Event)=>{
  const candidate=event as InstallPromptEvent;
  if(typeof candidate.prompt!=='function'||!candidate.userChoice)return;
  event.preventDefault();pendingInstall=candidate;changed();
 };
 target.addEventListener('beforeinstallprompt',ready);
 target.addEventListener('appinstalled',clearInstallPrompt);
 return()=>{target.removeEventListener('beforeinstallprompt',ready);target.removeEventListener('appinstalled',clearInstallPrompt);};
}
export async function promptInstallation():Promise<'accepted'|'dismissed'|'unavailable'|'failed'>{
 const event=pendingInstall;
 if(!event)return 'unavailable';
 // Consume once, before any await. prompt() must run in the actual click gesture.
 clearInstallPrompt();
 try{await event.prompt();return (await event.userChoice).outcome;}catch{return 'failed';}
}

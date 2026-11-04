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
export function installationPlatform(userAgent:string,platform:string,touchPoints:number){
 if(/iPad|iPhone|iPod/i.test(userAgent)||platform==='MacIntel'&&touchPoints>1)return 'ios';
 if(/Mac/i.test(platform)&&/Safari/i.test(userAgent)&&!/Chrome|Chromium|Edg/i.test(userAgent))return 'mac-safari';
 return 'other';
}

export type InstallPromptEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
let pendingInstall:InstallPromptEvent|null=null;
export const getInstallPrompt=()=>pendingInstall;
export const clearInstallPrompt=()=>{pendingInstall=null;};
export function captureInstallPrompt(){window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pendingInstall=event as InstallPromptEvent;});}

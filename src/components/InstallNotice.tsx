import {useEffect,useState} from 'react';
import {Download,Share,Smartphone,X} from 'lucide-react';
import {t,useLanguage} from '../lib/i18n';
import {getInstallPrompt,clearInstallPrompt,claimInstallNotice,installationPlatform,INSTALL_KNOWN_KEY,INSTALL_NOTICE_KEY} from '../lib/install-prompt';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
export default function InstallNotice({blocked=false}:{blocked?:boolean}){
 useLanguage();
 const [visible,setVisible]=useState(false),[instructions,setInstructions]=useState(false),[event,setEvent]=useState<InstallEvent|null>(getInstallPrompt),[working,setWorking]=useState(false);
 const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone), (display-mode: minimal-ui)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true);
 const platform=installationPlatform(navigator.userAgent,navigator.platform,navigator.maxTouchPoints);
 useEffect(()=>{
  function ready(e:Event){e.preventDefault();setEvent(e as InstallEvent);}
  function done(){setInstalled(true);setVisible(false);try{localStorage.setItem(INSTALL_KNOWN_KEY,'1');}catch{}}
  const media=window.matchMedia('(display-mode: standalone), (display-mode: minimal-ui)');
  function mode(){if(media.matches)done();}
  window.addEventListener('beforeinstallprompt',ready);window.addEventListener('appinstalled',done);media.addEventListener('change',mode);
  return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('appinstalled',done);media.removeEventListener('change',mode);};
 },[]);
 useEffect(()=>{
  if(installed||blocked||visible)return;
  let timer:ReturnType<typeof setTimeout>;let cancelled=false;
  function schedule(){clearTimeout(timer);if(document.hidden)return;timer=setTimeout(()=>{
   function show(){
    if(cancelled||document.hidden||document.querySelector('[role="dialog"]'))return;
    // No storage means no automatic notice: avoid repeatedly bothering a visitor.
    let store:Storage;try{store=localStorage;}catch{return;}
    if(claimInstallNotice(store)){setInstructions(false);setVisible(true);}
   }
   if(navigator.locks)void navigator.locks.request('maison-faso-install-notice',show).catch(()=>{});else show();
  },4500);}
  schedule();document.addEventListener('visibilitychange',schedule);
  return()=>{cancelled=true;clearTimeout(timer);document.removeEventListener('visibilitychange',schedule);};
 },[installed,blocked,visible]);
 useEffect(()=>{function changed(e:StorageEvent){if(e.key===INSTALL_KNOWN_KEY&&e.newValue==='1'){setInstalled(true);setVisible(false);}if(e.key===INSTALL_NOTICE_KEY)setVisible(false);}window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);},[]);
 async function install(){
  if(!event){setInstructions(v=>!v);return;}
  setWorking(true);try{await event.prompt();const choice=await event.userChoice;if(choice.outcome==='accepted'){setInstalled(true);try{localStorage.setItem(INSTALL_KNOWN_KEY,'1');}catch{}}setVisible(false);}catch{setInstructions(true);}finally{clearInstallPrompt();setEvent(null);setWorking(false);}
 }
 if(!visible||installed||blocked)return null;
 return <aside className="install-notice" role="region" aria-labelledby="install-title" aria-live="polite" onKeyDown={e=>{if(e.key==='Escape')setVisible(false);}}>
  <button className="install-close" aria-label={t('Fermer la suggestion d’installation')} onClick={()=>setVisible(false)}><X size={19}/></button>
  <div className="install-icon"><Smartphone size={25}/></div><div className="install-copy"><p className="eyebrow">{t('VOTRE BOUTIQUE, À PORTÉE DE MAIN')}</p><h2 id="install-title">{t('Retrouvez-nous sur votre écran d’accueil.')}</h2><p>{t('Gardez la boutique à portée de main, directement sur votre appareil.')}</p>
   <div className="install-actions"><button className="primary-button" disabled={working} onClick={()=>void install()} aria-expanded={!event?instructions:undefined}>{event?<Download size={16}/>:<Share size={16}/>} {t(event?'Installer l’application':'Comment l’installer')}</button><button className="text-button" onClick={()=>setVisible(false)}>{t('Plus tard')}</button></div>
   {instructions&&<p className="install-instructions" role="status">{t(platform==='ios'?'Dans le menu Partager, choisissez « Sur l’écran d’accueil », puis « Ajouter ». Si cette option manque, ouvrez la boutique dans Safari.':platform==='mac-safari'?'Dans Safari, ouvrez Fichier, puis « Ajouter au Dock ».':'Dans le menu de votre navigateur, choisissez « Installer l’application » si cette option est proposée. Sinon, ouvrez la boutique dans Chrome, Edge ou Safari sur Mac.')}</p>}
  </div>
 </aside>;
}

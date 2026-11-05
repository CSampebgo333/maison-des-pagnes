import {useEffect,useState,useSyncExternalStore} from 'react';
import {Download,Smartphone,X} from 'lucide-react';
import {t,useLanguage} from '../lib/i18n';
import {getInstallPrompt,subscribeInstallPrompt,promptInstallation,claimInstallNotice,INSTALL_KNOWN_KEY,INSTALL_NOTICE_KEY} from '../lib/install-prompt';

const standalone=()=>window.matchMedia('(display-mode: standalone), (display-mode: minimal-ui)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;
export default function InstallNotice({blocked=false}:{blocked?:boolean}){
 useLanguage();
 const event=useSyncExternalStore(subscribeInstallPrompt,getInstallPrompt,()=>null);
 const [visible,setVisible]=useState(false),[working,setWorking]=useState(false),[failed,setFailed]=useState(false);
 const [installed,setInstalled]=useState(standalone);
 useEffect(()=>{
  function done(){setInstalled(true);setVisible(false);try{localStorage.setItem(INSTALL_KNOWN_KEY,'1');}catch{}}
  const media=window.matchMedia('(display-mode: standalone), (display-mode: minimal-ui)');
  function mode(){if(media.matches)done();}
  window.addEventListener('appinstalled',done);media.addEventListener('change',mode);
  return()=>{window.removeEventListener('appinstalled',done);media.removeEventListener('change',mode);};
 },[]);
 useEffect(()=>{
  // A new native event is authoritative, e.g. after a previous uninstall.
  if(event&&!standalone()){setInstalled(false);try{localStorage.removeItem(INSTALL_KNOWN_KEY);}catch{}}
 },[event]);
 useEffect(()=>{
  if(!event||installed||blocked||visible)return;
  let timer:ReturnType<typeof setTimeout>;let cancelled=false;
  function schedule(){clearTimeout(timer);if(document.hidden)return;timer=setTimeout(()=>{
   function show(){
    if(cancelled||document.hidden||!getInstallPrompt()||document.querySelector('[role="dialog"]'))return;
    let store:Storage;try{store=localStorage;}catch{return;}
    if(claimInstallNotice(store)){setFailed(false);setVisible(true);}
   }
   if(navigator.locks)void navigator.locks.request('maison-faso-install-notice',show).catch(()=>{});else show();
  },4500);}
  schedule();document.addEventListener('visibilitychange',schedule);
  return()=>{cancelled=true;clearTimeout(timer);document.removeEventListener('visibilitychange',schedule);};
 },[event,installed,blocked,visible]);
 useEffect(()=>{function changed(e:StorageEvent){if(e.key===INSTALL_KNOWN_KEY&&e.newValue==='1'){setInstalled(true);setVisible(false);}if(e.key===INSTALL_NOTICE_KEY)setVisible(false);}window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);},[]);
 async function install(){
  if(working||!getInstallPrompt())return;
  setWorking(true);setFailed(false);
  const choice=await promptInstallation();
  if(choice==='failed'){setFailed(true);}else{setVisible(false);}
  // Accepting the prompt is not proof of completion: appinstalled records that.
  setWorking(false);
 }
 if(!visible||installed||blocked||!event&&!working&&!failed)return null;
 return <aside className="install-notice" role="region" aria-labelledby="install-title" aria-live="polite" onKeyDown={e=>{if(e.key==='Escape')setVisible(false);}}>
  <button className="install-close" aria-label={t('Fermer la suggestion d’installation')} onClick={()=>setVisible(false)}><X size={19}/></button>
  <div className="install-icon"><Smartphone size={25}/></div><div className="install-copy"><p className="eyebrow">{t('VOTRE BOUTIQUE, À PORTÉE DE MAIN')}</p><h2 id="install-title">{t('Retrouvez-nous sur votre écran d’accueil.')}</h2><p>{t('Gardez la boutique à portée de main, directement sur votre appareil.')}</p>
   <div className="install-actions">{event&&<button className="primary-button" disabled={working} onClick={()=>void install()}><Download size={16}/> {t('Installer l’application')}</button>}<button className="text-button" onClick={()=>setVisible(false)}>{t('Plus tard')}</button></div>
   {failed&&<p className="install-error" role="status">{t('L’installation n’a pas pu démarrer. Réessayez plus tard.')}</p>}
  </div>
 </aside>;
}

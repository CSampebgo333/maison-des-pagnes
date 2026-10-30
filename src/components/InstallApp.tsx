import { useState, useSyncExternalStore } from 'react';
import { Dialog } from 'radix-ui';
import { Download, X } from 'lucide-react';
import { t, useLanguage } from '../lib/i18n';
import { getInstallState, subscribeInstall, promptInstall } from '../lib/install-app';

export default function InstallApp() {
  useLanguage();
  const state = useSyncExternalStore(subscribeInstall, getInstallState, getInstallState);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  async function install() {
    if (!state.available) { setHelp(true); return; }
    setBusy(true);
    try { if (!await promptInstall()) setHelp(true); }
    finally { setBusy(false); }
  }
  if (state.installed) return null;
  return <>
    <button className="install-app-button" onClick={() => void install()} disabled={busy}
      aria-label={t('Installer l’application')} title={t('Installer l’application')}>
      <Download size={18} aria-hidden="true"/><span>{t('Installer l’application')}</span>
    </button>
    <Dialog.Root open={help} onOpenChange={setHelp}><Dialog.Portal>
      <Dialog.Overlay className="modal-overlay"/>
      <Dialog.Content className="install-dialog">
        <Dialog.Close className="dialog-close" aria-label={t('Fermer les instructions d’installation')}><X size={20}/></Dialog.Close>
        <Dialog.Title>{t('Installer Maison du Faso Dan Fani')}</Dialog.Title>
        <Dialog.Description>{t('Gardez la boutique à portée de main, dans une fenêtre dédiée ou sur votre écran d’accueil.')}</Dialog.Description>
        <p>{t('Sur iPhone ou iPad, ouvrez le menu Partager, puis choisissez « Sur l’écran d’accueil ».')}</p>
        <p>{t('Sur ordinateur ou Android, cherchez « Installer l’application » ou « Ajouter à l’écran d’accueil » dans le menu de votre navigateur.')}</p>
        <p>{t('L’installation dépend de votre navigateur. Si l’application est déjà installée, ouvrez-la depuis votre appareil.')}</p>
        <p>{t('Une connexion Internet reste nécessaire pour consulter le catalogue actuel, envoyer une commande ou gérer la boutique.')}</p>
      </Dialog.Content>
    </Dialog.Portal></Dialog.Root>
  </>;
}

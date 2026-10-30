import {localizeProduct} from '../lib/product-language';
import {t,useLanguage,localeFor,shopFetch} from '../lib/i18n';
import { useEffect, useState, useRef } from 'react';
import { Dialog } from 'radix-ui';
import { ArrowRight, Download, FileText, ImagePlus, Share2, Trash2, X } from 'lucide-react';
import { amount, createOrderPdf, localDate, orderTotal, validateOrder } from '../lib/order';
import type { CustomOrderItem, Order, OrderDetails, OrderItem } from '../lib/order';
import { readOrderPhoto, type OrderPhoto } from '../lib/custom-photo';
import { asset } from '../lib/assets';
import { availabilityLabel } from '../lib/catalogue-features';
import { fetchCatalogue } from '../lib/catalogue-client';
import { normalize } from '../lib/catalogue';
import { imageVariant } from '../lib/images';
const initial: OrderDetails = { name:'',phone:'',city:'Bobo-Dioulasso',mode:'livraison',address:'',deadline:'',notes:'' };
const LINK_LIMIT = 24 * 1024 * 1024;

export default function OrderForm({ items, whatsapp, onClose, initialCustom = false }: { items: OrderItem[]; whatsapp: string; onClose: () => void; initialCustom?: boolean }) {
 const language=useLanguage();
 const [whatsappEnabled,setWhatsappEnabled]=useState(false),[whatsappOptIn,setWhatsappOptIn]=useState(false);
 useEffect(()=>{void shopFetch('/api/orders/notification-settings').then(r=>r.ok?r.json():null).then(d=>setWhatsappEnabled(d?.enabled===true)).catch(()=>{});},[]);

  const submittedLanguage=useRef<'fr'|'en'|null>(null);
  const credentials=useRef({requestKey:crypto.randomUUID(),token:crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','')});
  const [registered,setRegistered]=useState<{id:string;reference:string;created_at:string;language?:'fr'|'en'}|null>(null);
  const trackingUrl=registered?`${location.origin}/?lang=${registered.language??language}#suivi/${registered.id}/${credentials.current.token}`:'';
  const [customEnabled,setCustomEnabled] = useState(initialCustom);
  const [photo,setPhoto] = useState<OrderPhoto|null>(null);
  const [photoUrl,setPhotoUrl] = useState('');
  const [description,setDescription] = useState('');
  const [quantity,setQuantity] = useState(1);
  const [reading,setReading] = useState(false);
  const [remoteUrl,setRemoteUrl] = useState('');
  const [expires,setExpires] = useState('');
  const [uploading,setUploading] = useState(false);
  const [details,setDetails] = useState(initial);
  const [file,setFile] = useState<File|null>(null);
  const [url,setUrl] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [hint,setHint] = useState('');
  const working = busy || uploading || reading;
  useEffect(() => {
    if(!photo){setPhotoUrl('');return;}
    const u=URL.createObjectURL(new Blob([photo.bytes as BlobPart],{type:photo.type}));
    setPhotoUrl(u);return()=>URL.revokeObjectURL(u);
  },[photo]);
  useEffect(() => {
    if(!file){setUrl('');return;}
    const u=URL.createObjectURL(file);setUrl(u);return()=>URL.revokeObjectURL(u);
  },[file]);
  function invalidate() { setFile(null);setError('');setHint('');setRemoteUrl('');setExpires(''); }
  function change(key:keyof OrderDetails,value:string) { setDetails(d=>({...d,[key]:value}));invalidate(); }
  async function choosePhoto(input:HTMLInputElement) {
    const selected=input.files?.[0];input.value='';if(!selected)return;
    invalidate();setReading(true);
    try { setPhoto(await readOrderPhoto(selected)); }
    catch(e) { setError((e as Error).message || t("Cette photo n’a pas pu être chargée.")); }
    finally { setReading(false); }
  }
  async function generate(event:React.FormEvent) {
    event.preventDefault();
    const custom: CustomOrderItem | undefined = customEnabled ? { photo,quantity,description } : undefined;
    const invalid=validateOrder(details,items,undefined,custom);
    if(invalid){setError(t(invalid));return;}
    invalidate();setBusy(true);
    try {
      let confirmedItems=items;
      if(items.length){
        const latest=await fetchCatalogue();
        confirmedItems=items.map(item=>{const product=latest.products.find(p=>p.id===item.product.id);if(!product||product.availability==='unavailable')throw Error(t("Un pagne de la sélection n’est plus disponible. Fermez le formulaire et actualisez la collection."));if(product.price!==item.product.price)throw Error(t("Le prix d’un pagne a changé. Fermez le formulaire et vérifiez votre sélection actualisée."));return {...item,product:localizeProduct(product,registered?.language??language)};});
      }
      submittedLanguage.current??=language;
      let saved=registered;
      if(!saved){
        const response=await shopFetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...credentials.current,language:submittedLanguage.current,details,whatsappOptIn,items:confirmedItems.map(i=>({id:i.product.id,quantity:i.quantity,expectedPrice:i.product.price})),custom:custom?{quantity:custom.quantity,description:custom.description}:undefined})});
        const result=await response.json();if(!response.ok)throw Error(result.error||t("La demande n’a pas pu être enregistrée."));saved=result;setRegistered(result);
      }
      if(!saved)throw Error(t("Enregistrement incomplet."));
      if(custom?.photo){const r=await shopFetch(`/api/orders/${saved.id}/photo`,{method:'PUT',headers:{'Content-Type':custom.photo.type,Authorization:'Bearer '+credentials.current.token},body:new Blob([custom.photo.bytes as BlobPart],{type:custom.photo.type})});if(!r.ok)throw Error(t("Demande enregistrée, mais photo non jointe. Réessayez de préparer le PDF."));}
      const order: Order = { language:saved.language??language,reference:saved.reference,created:saved.created_at,details:{...details},items:confirmedItems,custom };

      const pdf=await createOrderPdf(order,asset);
      const generated=new File([pdf],`${order.reference}.pdf`,{type:'application/pdf'});setFile(generated);
      if(generated.size<=LINK_LIMIT){const upload=await shopFetch(`/api/orders/${saved.id}/pdf`,{method:'PUT',headers:{'Content-Type':'application/pdf',Authorization:'Bearer '+credentials.current.token},body:generated});if(!upload.ok)setHint(t("Demande enregistrée. La copie PDF pour la boutique n’a pas pu être jointe ; vous pouvez réessayer ou la partager."));}
    } catch(e) { setError((e as Error).message||t("Le PDF n’a pas pu être créé. Réessayez.")); }
    finally { setBusy(false); }
  }
  async function share() {
    if(!file)return;
    try {
      if(navigator.canShare?.({files:[file]})){
        await navigator.share({files:[file],title:t("Ma demande de commande")});
        setHint(t("Si vous avez choisi WhatsApp, sélectionnez la boutique au +226 77 54 07 92 et envoyez le PDF."));
      } else setHint(t("Le partage de fichiers est indisponible ici. Téléchargez le PDF, ouvrez WhatsApp et joignez-le à la conversation."));
    } catch(e) { if((e as Error).name!=='AbortError')setHint(t("Téléchargez le PDF et joignez-le dans WhatsApp.")); }
  }
  async function prepareLink() {
    if(!file)return;
    if(file.size>LINK_LIMIT){setError(t("Ce PDF dépasse 24 Mo pour le lien WhatsApp. Vous pouvez le télécharger et partager directement le PDF, ou choisir une photo JPEG moins lourde."));return;}
    setUploading(true);setError('');
    try {
      const response=await shopFetch('/api/order-pdfs',{method:'POST',headers:{'Content-Type':'application/pdf'},body:file});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||t("Création du lien indisponible."));
      if(typeof result.url!=='string'||new URL(result.url).origin!==location.origin)throw Error(t("Lien invalide."));
      setRemoteUrl(result.url);setExpires(result.expiresAt);
    } catch(e) { setError((e as Error).message||t("Le lien n’a pas pu être créé. Le téléchargement reste disponible.")); }
    finally { setUploading(false); }
  }
  const message=remoteUrl?t("Bonjour, voici ma demande {0}, à confirmer. Mon bon PDF : {1}",registered?.reference??'',remoteUrl):'';
  return <Dialog.Root open onOpenChange={open=>{if(!open&&!working)onClose();}}><Dialog.Portal>
    <Dialog.Overlay className="modal-overlay"/>
    <Dialog.Content className="order-dialog">
      <div className="order-heading"><div><p className="eyebrow">{t("VOTRE DEMANDE")}</p><Dialog.Title>{initialCustom?t("Le pagne que vous cherchez."):t("Vos pagnes, à votre rythme.")}</Dialog.Title></div><Dialog.Close disabled={working} className="icon-button" aria-label={t("Fermer le formulaire")}><X/></Dialog.Close></div>
      <Dialog.Description>{initialCustom?t("Ajoutez la photo du pagne que vous recherchez. La boutique confirmera sa disponibilité et vous proposera un prix sur WhatsApp."):t("Préparez votre bon PDF avec les photos de vos pagnes. Vous pouvez aussi joindre la photo d’un pagne à rechercher.")}</Dialog.Description>
      {(items.length>0 || photo && customEnabled) && <div className="order-summary">
        {items.map(i=><div key={i.product.id}><img src={asset(imageVariant(i.product.photos[0].src).thumbnail)} alt={i.product.name}/><span>{i.product.name}<small>{i.quantity} {t(" × ")}{amount(i.product.price??0)} {t(" · hors livraison")}<br/>{t(availabilityLabel(i.product))}</small></span><strong>{amount((i.product.price??0)*i.quantity)}</strong></div>)}
        {customEnabled&&photo&&<div><img src={photoUrl} alt={t("Pagne à rechercher")}/><span>{t("Pagne à rechercher")}<small>{quantity || '…'} {t(" unité(s) · Prix à confirmer")}</small></span></div>}
        {items.length>0&&<p>{customEnabled?t("Sous-total de la galerie"):t("Total des articles")}<strong>{amount(orderTotal(items))}</strong></p>}
        <small>{customEnabled?t("Le prix du pagne recherché sera proposé par la boutique. "):''}{t("Prix des pagnes hors livraison. Les frais de livraison et le délai seront confirmés avant votre accord. Aucun paiement sur le site.")}</small>
      </div>}
      <form onSubmit={generate} className="order-form">
        <fieldset disabled={working||!!registered} className="custom-request-fields"><legend className="sr-only">{t("Pagne à rechercher")}</legend>
          {!initialCustom&&<label className="custom-request-toggle order-wide"><input type="checkbox" checked={customEnabled} onChange={e=>{setCustomEnabled(e.target.checked);invalidate();}}/>{t("Ajouter un pagne qui n’est pas dans la galerie")}</label>}
          {customEnabled&&<div className="custom-photo-section order-wide">
            <h3>{t("Votre photo de référence")}</h3>
            <p>{t("JPEG ou PNG, 6 Mo maximum, jusqu’à 24 mégapixels. La photo complète sera ajoutée au PDF en conservant sa résolution.")}</p>
            <label className="custom-photo-upload"><span><ImagePlus size={20}/>{photo?t("Remplacer la photo"):t("Choisir la photo du pagne")}</span><input type="file" accept="image/jpeg,image/png" aria-label={t("Photo du pagne à rechercher")} onChange={e=>void choosePhoto(e.target)}/></label>
            {reading&&<p role="status">{t("Lecture de votre photo…")}</p>}
            {photo&&photoUrl&&<div className="custom-photo-preview"><img src={photoUrl} alt={t("Votre photo du pagne à rechercher")}/><p>{photo.name}<small>{photo.width} {t(" × ")}{photo.height} {t(" pixels · ")}{(photo.bytes.byteLength/1024/1024).toLocaleString(localeFor(),{maximumFractionDigits:1})} {t(" Mo")}</small></p><div><a href={photoUrl} target="_blank" rel="noopener noreferrer" className="text-button">{t("Voir la photo en grand ")}<ArrowRight size={15}/></a><button type="button" disabled={working} className="text-button" onClick={()=>{setPhoto(null);invalidate();}}><Trash2 size={15}/>{t("Retirer la photo")}</button></div></div>}
            <div className="custom-photo-details"><label>{t("Quantité souhaitée")}<input required type="number" min="1" max="99" step="1" inputMode="numeric" value={quantity || ''} onChange={e=>{setQuantity(Number(e.target.value));invalidate();}}/></label><label>{t("Précisions sur ce pagne (facultatif)")}<textarea maxLength={300} placeholder={t("Couleurs, motif, occasion, modèle proche accepté…")} value={description} onChange={e=>{setDescription(e.target.value);invalidate();}}/></label></div>
            <p className="custom-price-note">{t("Prix et disponibilité à confirmer. La demande n’engage aucun achat avant votre accord sur le prix.")}</p>
          </div>}
        </fieldset>
        <fieldset disabled={working||!!registered}><legend className="sr-only">{t("Coordonnées et réception")}</legend>
          <label>{t("Votre nom")}<input required maxLength={80} autoComplete="name" value={details.name} onChange={e=>change('name',e.target.value)}/></label>
          {whatsappEnabled&&<label className="order-wide custom-request-toggle"><input type="checkbox" checked={whatsappOptIn} onChange={e=>setWhatsappOptIn(e.target.checked)}/>{t("Je souhaite recevoir les mises à jour de ma commande par WhatsApp de Maison du Faso Dan Fani. Je peux les arrêter depuis mon lien de suivi.")}</label>}<label>{t("Téléphone avec indicatif")}<input required type="tel" maxLength={25} autoComplete="tel" placeholder="+226 …" value={details.phone} onChange={e=>change('phone',e.target.value)}/></label>
          <label>{t("Pays")}<input value="Burkina Faso" readOnly/></label>
          <label>{t("Ville")}<input required maxLength={80} list="delivery-cities" autoComplete="address-level2" value={details.city} onChange={e=>change('city',e.target.value)}/></label>
          <datalist id="delivery-cities"><option value="Bobo-Dioulasso"/><option value="Ouagadougou"/></datalist><label>{t("Mode de réception")}<select value={details.mode} onChange={e=>change('mode',e.target.value)}><option value="livraison">{t("Livraison")}</option><option value="retrait">{t("Retrait à Bobo-Dioulasso")}</option></select></label>
          <label>{t("Recevoir au plus tard le")}<input required type="date" min={localDate()} value={details.deadline} onChange={e=>change('deadline',e.target.value)}/><small>{t("Date souhaitée, à confirmer par la boutique.")}</small></label>
          {details.mode==='livraison'?<label className="order-wide">{t("Quartier et indications de livraison")}<textarea required maxLength={240} autoComplete="street-address" value={details.address} onChange={e=>change('address',e.target.value)}/></label>:<p className="order-wide">{t("Le lieu et l’heure de retrait seront convenus sur WhatsApp.")}</p>}
          <label className="order-wide">{t("Remarques (facultatif)")}<textarea maxLength={500} placeholder={t("Disponibilités pour vous contacter, précisions utiles…")} value={details.notes} onChange={e=>change('notes',e.target.value)}/></label>
        </fieldset>
        <p className="order-wide delivery-order-note">{details.mode==='retrait'?t("Retrait à Bobo-Dioulasso, lieu et heure à convenir."): ['bobo-dioulasso','ouagadougou'].includes(normalize(details.city).trim())?t("Livraison proposée dans votre ville. Frais et délai à confirmer sur WhatsApp."):t("Autre ville du Burkina Faso : la livraison dépend de la situation générale et doit être confirmée par la boutique.")}</p>
        <p className="order-note">{t("En enregistrant votre demande, vos coordonnées, votre sélection et votre éventuelle photo sont transmises à la boutique pour traiter la commande. Le bon PDF est conservé avec votre demande. Paiement intégral à la remise du produit par Orange Money ou Wave. Aucun paiement sur le site. Le lien PDF partagé sur WhatsApp reste accessible sept jours à toute personne qui le possède.")}</p>
        {error&&<p role="alert" className="order-error">{t(error)}</p>}
        <button disabled={working} className="primary-button" type="submit"><FileText size={18}/>{busy?t("Enregistrement et préparation…"):reading?t("Lecture de la photo…"):file?t("Regénérer le bon PDF"):t("Enregistrer ma demande et préparer le PDF")}</button>
      </form>
      {registered&&<section className="order-ready" aria-label={t("Demande enregistrée")}><h3>{t("Demande ")}{registered.reference} {t(" enregistrée")}</h3><p>{t("Elle attend la confirmation de la boutique. Aucun stock n’est réservé et aucun paiement n’est demandé à cette étape.")}</p><a className="underlined-button" href={trackingUrl} target="_blank" rel="noopener noreferrer">{t("Ouvrir mon suivi privé ")}<ArrowRight size={17}/></a><p>{t("Conservez ce lien privé pour retrouver votre suivi. Les informations envoyées sont figées ; contactez la boutique pour une correction.")}</p></section>}
      {file&&url&&<section className="order-ready" aria-label={t("Envoyer le bon PDF")}><h3>{t("Votre bon est prêt")}</h3>
        <p>{t("Vérifiez votre PDF. Vous pouvez le télécharger pour garder une copie, ou préparer un lien pour l’envoyer à la boutique sans joindre le fichier manuellement.")}</p>
        <a className="primary-button" href={url} download={file.name}><Download size={18}/>{t("Télécharger le PDF")}</a>
        <a className="underlined-button" href={url} target="_blank" rel="noopener noreferrer">{t("Prévisualiser le PDF ")}<ArrowRight size={17}/></a>
        <button type="button" className="underlined-button" onClick={share}><Share2 size={17}/>{t("Partager le PDF")}</button>
        {file.size>LINK_LIMIT&&<p className="order-error">{t("Le PDF dépasse 24 Mo : le téléchargement et le partage direct restent disponibles. Pour préparer un lien WhatsApp, choisissez une photo JPEG moins lourde.")}</p>}
        {remoteUrl?<><a className="primary-button whatsapp-order" href={`https://wa.me/${whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">{t("Envoyer le lien sur WhatsApp ")}<ArrowRight size={18}/></a><p>{t("Le lien expire le ")}{new Date(expires).toLocaleDateString(localeFor())}{t(". Toute personne qui le possède peut consulter le PDF. Appuyez sur Envoyer dans WhatsApp pour transmettre votre demande.")}</p></>:<><button type="button" disabled={working||file.size>LINK_LIMIT} className="primary-button whatsapp-order" onClick={prepareLink}>{uploading?t("Préparation du lien…"):t("Préparer le lien WhatsApp")} <ArrowRight size={18}/></button><p>{t("Aucun téléchargement nécessaire pour envoyer le lien. Votre conversation avec la boutique s’ouvrira à l’étape suivante.")}</p></>}
        <p role="status">{t(hint)}</p>
      </section>}
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

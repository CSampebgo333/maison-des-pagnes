import { useEffect, useState } from 'react';
import { Dialog } from 'radix-ui';
import { ArrowRight, Download, FileText, ImagePlus, Share2, Trash2, X } from 'lucide-react';
import { amount, createOrderPdf, localDate, orderTotal, validateOrder } from '../lib/order';
import type { CustomOrderItem, Order, OrderDetails, OrderItem } from '../lib/order';
import { readOrderPhoto, type OrderPhoto } from '../lib/custom-photo';
import { asset } from '../lib/assets';
const initial: OrderDetails = { name:'',phone:'',city:'Bobo-Dioulasso',mode:'livraison',address:'',deadline:'',notes:'' };
const LINK_LIMIT = 24 * 1024 * 1024;

export default function OrderForm({ items, whatsapp, onClose, initialCustom = false }: { items: OrderItem[]; whatsapp: string; onClose: () => void; initialCustom?: boolean }) {
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
    catch(e) { setError((e as Error).message || 'Cette photo n’a pas pu être chargée.'); }
    finally { setReading(false); }
  }
  async function generate(event:React.FormEvent) {
    event.preventDefault();
    const custom: CustomOrderItem | undefined = customEnabled ? { photo,quantity,description } : undefined;
    const invalid=validateOrder(details,items,undefined,custom);
    if(invalid){setError(invalid);return;}
    invalidate();setBusy(true);
    try {
      const order: Order = { reference:`MP-${localDate().replaceAll('-','')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`,created:new Date().toISOString(),details:{...details},items,custom };
      const pdf=await createOrderPdf(order,asset);
      setFile(new File([pdf],`${order.reference}.pdf`,{type:'application/pdf'}));
    } catch { setError('Le PDF n’a pas pu être créé. Vérifiez votre connexion et la photo choisie, puis réessayez.'); }
    finally { setBusy(false); }
  }
  async function share() {
    if(!file)return;
    try {
      if(navigator.canShare?.({files:[file]})){
        await navigator.share({files:[file],title:'Ma demande de commande'});
        setHint('Si vous avez choisi WhatsApp, sélectionnez la boutique au +226 77 54 07 92 et envoyez le PDF.');
      } else setHint('Le partage de fichiers est indisponible ici. Téléchargez le PDF, ouvrez WhatsApp et joignez-le à la conversation.');
    } catch(e) { if((e as Error).name!=='AbortError')setHint('Téléchargez le PDF et joignez-le dans WhatsApp.'); }
  }
  async function prepareLink() {
    if(!file)return;
    if(file.size>LINK_LIMIT){setError('Ce PDF dépasse 24 Mo pour le lien WhatsApp. Vous pouvez le télécharger et partager directement le PDF, ou choisir une photo JPEG moins lourde.');return;}
    setUploading(true);setError('');
    try {
      const response=await fetch('/api/order-pdfs',{method:'POST',headers:{'Content-Type':'application/pdf'},body:file});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Création du lien indisponible.');
      if(typeof result.url!=='string'||new URL(result.url).origin!==location.origin)throw Error('Lien invalide.');
      setRemoteUrl(result.url);setExpires(result.expiresAt);
    } catch(e) { setError((e as Error).message||'Le lien n’a pas pu être créé. Le téléchargement reste disponible.'); }
    finally { setUploading(false); }
  }
  const message=remoteUrl?`Bonjour, je vous envoie ma demande de pagnes. Vous trouverez les photos et tous les détails dans mon bon PDF : ${remoteUrl}`:'';
  return <Dialog.Root open onOpenChange={open=>{if(!open&&!working)onClose();}}><Dialog.Portal>
    <Dialog.Overlay className="modal-overlay"/>
    <Dialog.Content className="order-dialog">
      <div className="order-heading"><div><p className="eyebrow">VOTRE DEMANDE</p><Dialog.Title>{initialCustom?'Le pagne que vous cherchez.':'Vos pagnes, à votre rythme.'}</Dialog.Title></div><Dialog.Close disabled={working} className="icon-button" aria-label="Fermer le formulaire"><X/></Dialog.Close></div>
      <Dialog.Description>{initialCustom?'Ajoutez la photo du pagne que vous recherchez. La boutique confirmera sa disponibilité et vous proposera un prix sur WhatsApp.':'Préparez votre bon PDF avec les photos de vos pagnes. Vous pouvez aussi joindre la photo d’un pagne à rechercher.'}</Dialog.Description>
      {(items.length>0 || photo && customEnabled) && <div className="order-summary">
        {items.map(i=><div key={i.product.id}><img src={asset(i.product.photos[0].thumbnail)} alt={i.product.name}/><span>{i.product.name}<small>{i.quantity} × {amount(i.product.price??0)}</small></span><strong>{amount((i.product.price??0)*i.quantity)}</strong></div>)}
        {customEnabled&&photo&&<div><img src={photoUrl} alt="Pagne à rechercher"/><span>Pagne à rechercher<small>{quantity || '…'} unité(s) · Prix à confirmer</small></span></div>}
        {items.length>0&&<p>{customEnabled?'Sous-total de la galerie':'Total des articles'}<strong>{amount(orderTotal(items))}</strong></p>}
        <small>{customEnabled?'Le prix du pagne recherché sera proposé par la boutique. ':''}Frais et disponibilité à confirmer. Aucun paiement sur le site.</small>
      </div>}
      <form onSubmit={generate} className="order-form">
        <fieldset disabled={working} className="custom-request-fields"><legend className="sr-only">Pagne à rechercher</legend>
          {!initialCustom&&<label className="custom-request-toggle order-wide"><input type="checkbox" checked={customEnabled} onChange={e=>{setCustomEnabled(e.target.checked);invalidate();}}/>Ajouter un pagne qui n’est pas dans la galerie</label>}
          {customEnabled&&<div className="custom-photo-section order-wide">
            <h3>Votre photo de référence</h3>
            <p>JPEG ou PNG, 6 Mo maximum, jusqu’à 24 mégapixels. La photo complète sera ajoutée au PDF en conservant sa résolution.</p>
            <label className="custom-photo-upload"><span><ImagePlus size={20}/>{photo?'Remplacer la photo':'Choisir la photo du pagne'}</span><input type="file" accept="image/jpeg,image/png" aria-label="Photo du pagne à rechercher" onChange={e=>void choosePhoto(e.target)}/></label>
            {reading&&<p role="status">Lecture de votre photo…</p>}
            {photo&&photoUrl&&<div className="custom-photo-preview"><img src={photoUrl} alt="Votre photo du pagne à rechercher"/><p>{photo.name}<small>{photo.width} × {photo.height} pixels · {(photo.bytes.byteLength/1024/1024).toLocaleString('fr-FR',{maximumFractionDigits:1})} Mo</small></p><div><a href={photoUrl} target="_blank" rel="noopener noreferrer" className="text-button">Voir la photo en grand <ArrowRight size={15}/></a><button type="button" disabled={working} className="text-button" onClick={()=>{setPhoto(null);invalidate();}}><Trash2 size={15}/>Retirer la photo</button></div></div>}
            <div className="custom-photo-details"><label>Quantité souhaitée<input required type="number" min="1" max="99" step="1" inputMode="numeric" value={quantity || ''} onChange={e=>{setQuantity(Number(e.target.value));invalidate();}}/></label><label>Précisions sur ce pagne (facultatif)<textarea maxLength={300} placeholder="Couleurs, motif, occasion, modèle proche accepté…" value={description} onChange={e=>{setDescription(e.target.value);invalidate();}}/></label></div>
            <p className="custom-price-note">Prix et disponibilité à confirmer. La demande n’engage aucun achat avant votre accord sur le prix.</p>
          </div>}
        </fieldset>
        <fieldset disabled={working}><legend className="sr-only">Coordonnées et réception</legend>
          <label>Votre nom<input required maxLength={80} autoComplete="name" value={details.name} onChange={e=>change('name',e.target.value)}/></label>
          <label>Téléphone avec indicatif<input required type="tel" maxLength={25} autoComplete="tel" placeholder="+226 …" value={details.phone} onChange={e=>change('phone',e.target.value)}/></label>
          <label>Pays<input value="Burkina Faso" readOnly/></label>
          <label>Ville<input required maxLength={80} autoComplete="address-level2" value={details.city} onChange={e=>change('city',e.target.value)}/></label>
          <label>Mode de réception<select value={details.mode} onChange={e=>change('mode',e.target.value)}><option value="livraison">Livraison</option><option value="retrait">Retrait à Bobo-Dioulasso</option></select></label>
          <label>Recevoir au plus tard le<input required type="date" min={localDate()} value={details.deadline} onChange={e=>change('deadline',e.target.value)}/><small>Date souhaitée, à confirmer par la boutique.</small></label>
          {details.mode==='livraison'?<label className="order-wide">Quartier et indications de livraison<textarea required maxLength={240} autoComplete="street-address" value={details.address} onChange={e=>change('address',e.target.value)}/></label>:<p className="order-wide">Le lieu et l’heure de retrait seront convenus sur WhatsApp.</p>}
          <label className="order-wide">Remarques (facultatif)<textarea maxLength={500} placeholder="Disponibilités pour vous contacter, précisions utiles…" value={details.notes} onChange={e=>change('notes',e.target.value)}/></label>
        </fieldset>
        <p className="order-note">Le PDF, y compris votre éventuelle photo, est créé sur votre appareil. Si vous préparez un lien WhatsApp, une copie est enregistrée temporairement pour être consultée pendant sept jours par les personnes qui possèdent ce lien.</p>
        {error&&<p role="alert" className="order-error">{error}</p>}
        <button disabled={working} className="primary-button" type="submit"><FileText size={18}/>{busy?'Préparation du PDF…':reading?'Lecture de la photo…':file?'Regénérer le bon PDF':'Préparer mon bon PDF'}</button>
      </form>
      {file&&url&&<section className="order-ready" aria-label="Envoyer le bon PDF"><h3>Votre bon est prêt</h3>
        <p>Vérifiez votre PDF. Vous pouvez le télécharger pour garder une copie, ou préparer un lien pour l’envoyer à la boutique sans joindre le fichier manuellement.</p>
        <a className="primary-button" href={url} download={file.name}><Download size={18}/>Télécharger le PDF</a>
        <a className="underlined-button" href={url} target="_blank" rel="noopener noreferrer">Prévisualiser le PDF <ArrowRight size={17}/></a>
        <button type="button" className="underlined-button" onClick={share}><Share2 size={17}/>Partager le PDF</button>
        {file.size>LINK_LIMIT&&<p className="order-error">Le PDF dépasse 24 Mo : le téléchargement et le partage direct restent disponibles. Pour préparer un lien WhatsApp, choisissez une photo JPEG moins lourde.</p>}
        {remoteUrl?<><a className="primary-button whatsapp-order" href={`https://wa.me/${whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">Envoyer le lien sur WhatsApp <ArrowRight size={18}/></a><p>Le lien expire le {new Date(expires).toLocaleDateString('fr-FR')}. Toute personne qui le possède peut consulter le PDF. Appuyez sur Envoyer dans WhatsApp pour transmettre votre demande.</p></>:<><button type="button" disabled={working||file.size>LINK_LIMIT} className="primary-button whatsapp-order" onClick={prepareLink}>{uploading?'Préparation du lien…':'Préparer le lien WhatsApp'} <ArrowRight size={18}/></button><p>Aucun téléchargement nécessaire pour envoyer le lien. Votre conversation avec la boutique s’ouvrira à l’étape suivante.</p></>}
        <p role="status">{hint}</p>
      </section>}
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

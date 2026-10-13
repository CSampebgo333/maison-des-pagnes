import type { Product } from './types';
import type { OrderPhoto } from './custom-photo';
export type OrderItem = { product: Product; quantity: number };
export type OrderDetails = { name: string; phone: string; city: string; mode: 'livraison' | 'retrait'; address: string; deadline: string; notes: string };
export type CustomOrderItem = { description: string; quantity: number; photo: OrderPhoto | null };
export type Order = { reference: string; created: string; details: OrderDetails; items: OrderItem[]; custom?: CustomOrderItem };
export const amount = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} CFA`;
export function localDate(now = new Date()) { return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; }
export function validateOrder(d: OrderDetails, items: OrderItem[], today = localDate(), custom?: CustomOrderItem) {
  if (!items.length && !custom) return 'Ajoutez au moins un pagne à votre sélection.';
  if (custom && !custom.photo) return 'Ajoutez la photo du pagne que vous recherchez.';
  if (custom && (!Number.isInteger(custom.quantity) || custom.quantity < 1 || custom.quantity > 99)) return 'Choisissez une quantité de 1 à 99 pour le pagne à rechercher.';
  if (items.some(i => !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 99 || i.product.price === null)) return 'Vérifiez les quantités et les prix des articles.';
  if (!d.name.trim() || !d.city.trim()) return 'Renseignez votre nom et votre ville.';
  if (!/^\+?[\d\s().-]+$/.test(d.phone) || d.phone.replace(/\D/g,'').length < 8 || d.phone.replace(/\D/g,'').length > 15) return 'Renseignez un numéro de téléphone valide avec son indicatif.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.deadline) || Number.isNaN(Date.parse(d.deadline)) || new Date(d.deadline).toISOString().slice(0,10) !== d.deadline || d.deadline < today) return 'Choisissez une date de réception souhaitée à partir d’aujourd’hui.';
  if (d.mode === 'livraison' && !d.address.trim()) return 'Renseignez le quartier et les indications de livraison.';
  return '';
}
export function orderTotal(items: OrderItem[]) { return items.reduce((total,i)=>total+(i.product.price ?? 0)*i.quantity,0); }
export function dateLabel(date: string) { return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${date}T12:00:00`)); }
// Le PDF contient des pages JPEG haute résolution ; aucune donnée personnelle n’est envoyée à un serveur.
export function jpegPagesToPdf(pages: Uint8Array[], width = 1240, height = 1754): Blob {
  const enc = new TextEncoder(); const chunks: Uint8Array[] = []; const offsets = [0]; let length = 0;
  const put = (value: string | Uint8Array) => { const bytes = typeof value === 'string' ? enc.encode(value) : value; chunks.push(bytes); length += bytes.length; };
  const object = (id: number, body: string | (() => void)) => { offsets[id] = length; put(`${id} 0 obj\n`); if (typeof body === 'string') put(body); else body(); put('\nendobj\n'); };
  put('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
  pages.forEach((jpeg,i)=>{
    const id=3+i*3;
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`);
    object(id+1,()=>{put(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);put(jpeg);put('\nendstream');});
    const content='q 595.28 0 0 841.89 0 0 cm /Im Do Q';
    object(id+2,`<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`);
  });
  const xref=length; put(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for(let i=1;i<offsets.length;i++) put(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
  put(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks as BlobPart[],{type:'application/pdf'});
}
export async function renderOrderPages(order: Order, photoUrl: (path: string) => string, canvasFactory = () => document.createElement('canvas'), imageLoader = (url: string): Promise<CanvasImageSource> => new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Une photo n’a pas pu être chargée. Réessayez.'));img.src=url;})) {
  const canvases: HTMLCanvasElement[]=[]; let canvas!:HTMLCanvasElement; let ctx!:CanvasRenderingContext2D; let y=0;
  const text=(value:string,x:number,top:number,size=24,color='#603a53',bold=false)=>{ctx.fillStyle=color;ctx.font=`${bold?'bold ':''}${size}px Arial`;ctx.fillText(value,x,top);};
  const newPage=()=>{canvas=canvasFactory();canvas.width=1240;canvas.height=1754;ctx=canvas.getContext('2d')!;ctx.fillStyle='#fcf8f2';ctx.fillRect(0,0,1240,1754);ctx.fillStyle='#603a53';ctx.fillRect(0,0,1240,210);text('MAISON DU FASO DAN FANI',70,85,42,'#ffffff',true);text(order.custom?(order.items.length?'Demande de commande et de recherche':'Demande de pagne à rechercher'):'Demande de commande',70,140,28,'#ead6e0');text(order.reference,70,180,20,'#ead6e0');text(`Créée le ${new Date(order.created).toLocaleString('fr-FR',{timeZone:'Africa/Ouagadougou'})}`,70,255,21);y=302;canvases.push(canvas);};
  const ensure=(h:number)=>{if(y+h>1590)newPage();};
  const block=(label:string,value:string)=>{ctx.font='24px Arial';const lines:string[]=[];let line='';for(const word of value.trim().split(/\s+/)){if(ctx.measureText(line+word).width>1060&&line){lines.push(line.trim());line='';}let rest=word;while(ctx.measureText(rest).width>1060){let n=rest.length;while(n>1&&ctx.measureText(rest.slice(0,n)).width>1060)n--;if(line){lines.push(line.trim());line='';}lines.push(rest.slice(0,n));rest=rest.slice(n);}line+=rest+' ';}if(line.trim())lines.push(line.trim());ensure(55+lines.length*32);text(label.toUpperCase(),70,y,18,'#9c7187',true);y+=34;for(const l of lines){text(l,70,y);y+=32;}y+=22;};
  newPage();
  const d=order.details;
  block('Client',`${d.name}  |  ${d.phone}`);
  block('Lieu et service',`Burkina Faso - ${d.city} - ${d.mode==='livraison'?'Livraison':'Retrait à Bobo-Dioulasso (lieu à confirmer)'}`);
  if(d.mode==='livraison')block('Quartier et indications',d.address);
  block('Recevoir au plus tard le (date souhaitée)',dateLabel(d.deadline));
  if(d.notes.trim())block('Remarques',d.notes);
  for(const item of order.items){ensure(210);const image=await imageLoader(photoUrl(item.product.photos[0].src));ctx.fillStyle='#f0e6eb';ctx.fillRect(70,y,1100,188);const img=image as HTMLImageElement;const iw=img.naturalWidth||img.width;const ih=img.naturalHeight||img.height;const scale=Math.min(164/iw,164/ih);ctx.drawImage(image,82+(164-iw*scale)/2,y+12+(164-ih*scale)/2,iw*scale,ih*scale);text(item.product.name,280,y+50,28,'#603a53',true);text(`Quantité : ${item.quantity}`,280,y+92,23);text(`Prix unitaire : ${amount(item.product.price??0)}`,280,y+132,23);text(amount((item.product.price??0)*item.quantity),820,y+165,25,'#603a53',true);y+=210;}
  if(order.custom){
    ensure(245);ctx.fillStyle='#f0e6eb';ctx.fillRect(70,y,1100,220);
    text('PAGNE À RECHERCHER',95,y+44,28,'#603a53',true);
    text(`Quantité : ${order.custom.quantity}`,95,y+90,24);
    text('Prix et disponibilité : à confirmer par la boutique',95,y+130,24);
    text('Photo de référence en pleine page à la fin de ce document.',95,y+175,22);y+=245;
    if(order.custom.description.trim())block('Précisions sur le pagne',order.custom.description);
  }
  ensure(245);ctx.fillStyle='#603a53';ctx.fillRect(70,y,1100,82);
  text(order.items.length?(order.custom?'SOUS-TOTAL DE LA GALERIE':'TOTAL DES ARTICLES'):'PRIX À CONFIRMER',95,y+50,24,'#ffffff',true);
  text(order.items.length?amount(orderTotal(order.items)):'À définir',790,y+50,30,'#ffffff',true);y+=120;
  if(order.custom && order.items.length)block('Pagne à rechercher','Son prix n’est pas compris dans le sous-total. La boutique vous proposera un prix avant toute confirmation.');
  block('À confirmer par la boutique',`${order.custom?'Prix et disponibilité du pagne recherché, ':''}disponibilité des articles, frais de livraison ou de retrait, lieu de retrait, délai et modalités de paiement. Cette demande ne vaut ni paiement ni confirmation de commande.`);
  return canvases.map((c,i)=>{ctx=c.getContext('2d')!;ctx.strokeStyle='#d8c1cc';ctx.beginPath();ctx.moveTo(70,1640);ctx.lineTo(1170,1640);ctx.stroke();text('WhatsApp : +226 77 54 07 92  |  Bobo-Dioulasso',70,1682,20);text(`${i+1} / ${canvases.length+(order.custom?1:0)}`,1100,1682,20);const binary=atob(c.toDataURL('image/jpeg',.9).split(',')[1]);return Uint8Array.from(binary,ch=>ch.charCodeAt(0));});
}
export async function appendOriginalPhoto(pdf: Blob, photo: OrderPhoto) {
  // Loaded only when an uploaded photo needs to be embedded. No recompression.
  const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib');
  const doc = await PDFDocument.load(await pdf.arrayBuffer());
  const image = photo.type === 'image/jpeg' ? await doc.embedJpg(new Uint8Array(photo.bytes)) : await doc.embedPng(new Uint8Array(photo.bytes));
  const page = doc.addPage([595.28,841.89]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const plum = rgb(.376,.227,.325);
  page.drawRectangle({x:0,y:750,width:595.28,height:92,color:plum});
  page.drawText('PHOTO DU PAGNE RECHERCHÉ',{x:40,y:794,size:21,font:bold,color:rgb(1,1,1)});
  page.drawText('Prix et disponibilité à confirmer',{x:40,y:766,size:12,font:regular,color:rgb(.92,.84,.88)});
  const swapped = photo.orientation >= 5;
  const iw = swapped ? image.height : image.width, ih = swapped ? image.width : image.height;
  const scale = Math.min(515.28/iw,655/ih), w=iw*scale, h=ih*scale;
  const x=(595.28-w)/2, y=73+(655-h)/2;
  const transforms: Record<number,{x:number;y:number;width:number;height:number;angle:number}> = {
    1:{x,y,width:w,height:h,angle:0},2:{x:x+w,y,width:-w,height:h,angle:0},
    3:{x:x+w,y:y+h,width:-w,height:-h,angle:0},4:{x,y:y+h,width:w,height:-h,angle:0},
    5:{x:x+w,y:y+h,width:-h,height:w,angle:90},6:{x,y:y+h,width:h,height:w,angle:270},
    7:{x,y,width:h,height:-w,angle:90},8:{x:x+w,y,width:h,height:w,angle:90},
  };
  const {angle,...position}=transforms[photo.orientation]??transforms[1];
  page.drawImage(image,{...position,rotate:degrees(angle)});
  page.drawText('Photo fournie par le client - image complète, sans recadrage.',{x:40,y:48,size:10,font:regular,color:plum});
  page.drawText(`WhatsApp : +226 77 54 07 92  |  ${doc.getPageCount()} / ${doc.getPageCount()}`,{x:40,y:27,size:10,font:regular,color:plum});
  return new Blob([await doc.save() as BlobPart],{type:'application/pdf'});
}
export async function createOrderPdf(order:Order,photoUrl:(path:string)=>string){
  const pdf=jpegPagesToPdf(await renderOrderPages(order,photoUrl));
  if(!order.custom)return pdf;
  if(!order.custom.photo)throw Error('Ajoutez une photo avant de préparer le PDF.');
  return appendOriginalPhoto(pdf,order.custom.photo);
}

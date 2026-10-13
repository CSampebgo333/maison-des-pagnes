import seed from './catalogue-seed.js';
const KEY='catalogue/current.json';
const LIMIT=9*1024*1024;
const STATES=['available','on-order','unavailable','confirm'];
const OCCASIONS=['Mariage traditionnel','Cérémonie','Fête en famille','Quotidien','Rencontre professionnelle','Cadeau'];
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function isCatalogueAdmin(request,env) {
 const email=request.headers.get('oai-authenticated-user-email');
 return Boolean(email&&env.CATALOGUE_ADMIN_EMAIL&&email.toLowerCase()===env.CATALOGUE_ADMIN_EMAIL.toLowerCase());
}
async function current(bucket){const object=await bucket.get(KEY);return {document:object?await object.json():seed,etag:object?.etag};}
async function bounded(request,limit){
 if(Number(request.headers.get('Content-Length'))>limit)throw Error('Fichier trop volumineux.');
 const reader=request.body?.getReader();if(!reader)throw Error('Contenu manquant.');
 const chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('Fichier trop volumineux.');}chunks.push(value);}
 const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
function sourceDimensions(bytes,type){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(type==='image/png'&&bytes.length>=33&&bytes[0]===137&&new TextDecoder().decode(bytes.slice(1,4))==='PNG'&&new TextDecoder().decode(bytes.slice(12,16))==='IHDR')return [view.getUint32(16),view.getUint32(20)];
 if(type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216){let offset=2;while(offset+4<bytes.length){if(bytes[offset++]!==255)break;while(bytes[offset]===255)offset++;const marker=bytes[offset++];if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=215)continue;const size=view.getUint16(offset);if(size<2||offset+size>bytes.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&size>=8)return [view.getUint16(offset+5),view.getUint16(offset+3)];offset+=size;}}
 throw Error('La photo doit être un JPEG ou PNG valide.');
}
function webpDimensions(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder();
 if(bytes.length<30||decoder.decode(bytes.slice(0,4))!=='RIFF'||decoder.decode(bytes.slice(8,12))!=='WEBP'||view.getUint32(4,true)+8!==bytes.length)throw Error('Version optimisée invalide.');
 let offset=12;while(offset+8<=bytes.length){const kind=decoder.decode(bytes.slice(offset,offset+4));const size=view.getUint32(offset+4,true),p=offset+8;if(p+size>bytes.length)break;
 if(kind==='VP8X'&&size>=10)return [1+bytes[p+4]+(bytes[p+5]<<8)+(bytes[p+6]<<16),1+bytes[p+7]+(bytes[p+8]<<8)+(bytes[p+9]<<16)];
 if(kind==='VP8 '&&size>=10&&bytes[p+3]===157&&bytes[p+4]===1&&bytes[p+5]===42)return [view.getUint16(p+6,true)&16383,view.getUint16(p+8,true)&16383];
 if(kind==='VP8L'&&size>=5&&bytes[p]===47){const bits=view.getUint32(p+1,true);return [(bits&16383)+1,((bits>>>14)&16383)+1];}offset=p+size+(size%2);
 }throw Error('Version WebP invalide.');
}
const text=(value,max,required=false)=>{if(typeof value!=='string'||value.length>max||required&&!value.trim())throw Error('Vérifiez les textes du pagne.');return value.trim();};
export async function catalogueRoute(request,env) {
 const url=new URL(request.url),path=url.pathname;
 const admin=path.startsWith('/api/admin/');
 if(path==='/api/admin/session')return json({allowed:isCatalogueAdmin(request,env)},isCatalogueAdmin(request,env)?200:403);
 const photoPath=/^\/catalogue-images\/([a-f0-9-]{36})\.(jpg|png)$/.test(path)||/^\/media\/catalogue-(thumbnail|scene|display)-[a-f0-9]{12}\.webp$/.test(path);
 if(photoPath&&['GET','HEAD'].includes(request.method)){
  if(!env.BUCKET)return new Response('Indisponible',{status:503});const photo=await env.BUCKET.get('catalogue-assets/'+path.slice(1));if(!photo)return new Response('Photo introuvable',{status:404});
  return new Response(request.method==='HEAD'?null:photo.body,{headers:{'Content-Type':photo.httpMetadata?.contentType??'image/webp','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
 }
 if(path!=='/api/catalogue'&&!admin)return null;
 if(admin&&!isCatalogueAdmin(request,env))return json({error:'Connectez-vous avec le compte autorisé pour gérer la boutique.'},403);
 if(!env.BUCKET)return json({error:'Le catalogue est temporairement indisponible.'},503);
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)return json({error:'Origine non autorisée.'},403);
 try {
  if((path==='/api/catalogue'||path==='/api/admin/catalogue')&&request.method==='GET'){
   const {document}=await current(env.BUCKET);return json(path==='/api/catalogue'?{...document,products:document.products.filter(p=>p.published!==false)}:document);
  }
  if(path==='/api/admin/photos'&&request.method==='POST'){
   const data=await bounded(request,LIMIT);const form=await new Response(data,{headers:{'Content-Type':request.headers.get('Content-Type')??''}}).formData();
   const original=form.get('original');if(!original||typeof original==='string'||original.size>6*1024*1024)throw Error('Photo originale : 6 Mo maximum.');
   const bytes=new Uint8Array(await original.arrayBuffer()),[width,height]=sourceDimensions(bytes,original.type);
   if(!width||!height||width*height>24000000)throw Error('Photo originale : 24 mégapixels maximum.');
   const id=crypto.randomUUID(),src=`catalogue-images/${id}.${original.type==='image/png'?'png':'jpg'}`;const variant={width,height};
   for(const [role,maxSide,maxSize] of [['thumbnail',200,100*1024],['scene',650,300*1024],['display',1000,600*1024]]){
    const file=form.get(role);if(!file||typeof file==='string'||file.type!=='image/webp'||file.size>maxSize)throw Error('Une version optimisée manque ou dépasse la limite.');
    const image=new Uint8Array(await file.arrayBuffer()),[w,h]=webpDimensions(image);if(!w||!h||Math.max(w,h)>maxSide)throw Error('Dimensions optimisées invalides.');
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',image))].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,12);const key=`media/catalogue-${role}-${hash}.webp`;variant[role]=key;
    await env.BUCKET.put('catalogue-assets/'+key,image,{httpMetadata:{contentType:'image/webp'}});
   }
   await env.BUCKET.put('catalogue-assets/'+src,bytes,{httpMetadata:{contentType:original.type}});
   await env.BUCKET.put('catalogue/photos/'+id+'.json',JSON.stringify({src,variant}));
   return json({photo:{src,thumbnail:variant.thumbnail,view:1,label:'Vue d’ensemble'},variant},201);
  }
  if(path==='/api/admin/catalogue'&&request.method==='PUT'){
   const body=JSON.parse(new TextDecoder().decode(await bounded(request,1024*1024))),{document,etag}=await current(env.BUCKET);
   if(body.revision!==document.revision)return json({error:'La collection a changé ailleurs. Rechargez-la avant d’enregistrer.'},409);
   if(!Array.isArray(body.products)||body.products.length>200)throw Error('La collection accepte jusqu’à 200 pagnes.');
   const ids=new Set(),numbers=new Set(),variants={};
   const products=[];
   for(const p of body.products){
    if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(p.id)||ids.has(p.id)||!Number.isInteger(p.number)||p.number<1||numbers.has(p.number))throw Error('Identifiant de pagne invalide.');ids.add(p.id);numbers.add(p.number);
    if(!Number.isInteger(p.price)||p.price<1||p.price>10000000)throw Error('Indiquez un prix positif en CFA.');
    if(!STATES.includes(p.availability)||!Array.isArray(p.occasions)||p.occasions.some(o=>!OCCASIONS.includes(o))||p.occasions.length>6)throw Error('Choisissez la disponibilité et les occasions.');
    if(!Array.isArray(p.photos)||p.photos.length<1||p.photos.length>8)throw Error('Ajoutez entre une et huit photos par pagne.');
    const photos=[];
    for(let i=0;i<p.photos.length;i++){
     const photo=p.photos[i];let variant=seed.variants[photo.src]??document.variants[photo.src];
     if(!variant){const match=typeof photo.src==='string'&&photo.src.match(/^catalogue-images\/([a-f0-9-]{36})\.(jpg|png)$/);if(!match)throw Error('Photo non autorisée.');const uploaded=await env.BUCKET.get('catalogue/photos/'+match[1]+'.json');if(!uploaded)throw Error('Photo manquante.');const saved=await uploaded.json();if(saved.src!==photo.src)throw Error('Photo invalide.');variant=saved.variant;}
     variants[photo.src]=variant;photos.push({src:photo.src,thumbnail:variant.thumbnail,view:i+1,label:text(photo.label??'',60)||['Vue d’ensemble','Pagne plié','Pagne drapé','Détail du motif','Autre vue'][i]||'Autre vue'});
    }
    if(!Array.isArray(p.colors)||p.colors.length>8)throw Error('Vérifiez les couleurs.');
    products.push({id:p.id,number:p.number,name:text(p.name,100,true),description:text(p.description,1000,true),colors:p.colors.map(c=>text(c,30,true)),pattern:text(p.pattern,100),accent:/^#[a-f0-9]{6}$/i.test(p.accent)?p.accent:'#aaa0c7',price:p.price,unit:text(p.unit,80),composition:text(p.composition,120),dimensions:text(p.dimensions,120),availability:p.availability,occasions:[...new Set(p.occasions)],published:p.published!==false,photos});
   }
   const next={products,variants,revision:crypto.randomUUID(),updatedAt:new Date().toISOString()};
   // Keep recoverable snapshots; optimistic concurrency prevents overwriting another edit.
   await env.BUCKET.put('catalogue/history/'+document.revision+'.json',JSON.stringify(document));
   const saved=await env.BUCKET.put(KEY,JSON.stringify(next),{onlyIf:etag?{etagMatches:etag}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});
   if(!saved)return json({error:'Une autre modification vient d’être enregistrée. Rechargez la collection.'},409);
   return json(next);
  }
  return json({error:'Action introuvable.'},404);
 } catch(e){return json({error:e instanceof Error?e.message:'Le catalogue n’a pas pu être enregistré.'},400);}
}

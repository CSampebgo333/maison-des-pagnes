import { catalogueRoute } from './catalogue-service.js';
const TTL = 7 * 24 * 60 * 60 * 1000;
const LIMIT = 24 * 1024 * 1024;
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function cleanup(bucket) {
 const page = await bucket.list({prefix:'orders/',limit:100,include:['customMetadata']});
 await Promise.all(page.objects.filter(o=>Number(o.customMetadata?.expiresAt)<=Date.now()).map(o=>bucket.delete(o.key)));
}
export default {
 async fetch(request, env) {
  const url=new URL(request.url);
  const catalogueResponse=await catalogueRoute(request,env);if(catalogueResponse)return catalogueResponse;
  if(url.pathname==='/api/order-pdfs' && request.method==='POST') {
   if(!env.BUCKET) return json({error:'Le stockage des PDF est temporairement indisponible.'},503);
   if(request.headers.get('Origin')!==url.origin) return json({error:'Origine non autorisée.'},403);
   if(request.headers.get('Content-Type')?.split(';')[0]!=='application/pdf') return json({error:'Un fichier PDF est requis.'},415);
   if(Number(request.headers.get('Content-Length'))>LIMIT) return json({error:'PDF trop volumineux.'},413);
   const reader=request.body?.getReader(); if(!reader)return json({error:'PDF manquant.'},400);
   const chunks=[];let size=0;
   for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>LIMIT){await reader.cancel();return json({error:'PDF trop volumineux.'},413);}chunks.push(value);}
   const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.length;}
   const decoder=new TextDecoder();if(size<20||decoder.decode(bytes.slice(0,5))!=='%PDF-'||!decoder.decode(bytes.slice(-40)).includes('%%EOF'))return json({error:'Le fichier PDF est invalide.'},400);
   const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');const expiresAt=Date.now()+TTL;
   try {await cleanup(env.BUCKET);await env.BUCKET.put('orders/'+token,bytes,{httpMetadata:{contentType:'application/pdf'},customMetadata:{expiresAt:String(expiresAt)}});}
   catch{return json({error:'Le lien n’a pas pu être créé. Vous pouvez toujours télécharger votre PDF.'},503);}
   return json({url:new URL('/order-pdfs/'+token+'.pdf',url.origin).href,expiresAt:new Date(expiresAt).toISOString()},201);
  }
  const match=url.pathname.match(/^\/order-pdfs\/([a-f0-9]{64})\.pdf$/);
  if(match && ['GET','HEAD'].includes(request.method)){
   if(!env.BUCKET)return new Response('Document indisponible.',{status:503});
   const key='orders/'+match[1];const object=await env.BUCKET.get(key);
   if(!object)return new Response('Ce document est introuvable ou son lien a expiré.',{status:404,headers:{'Cache-Control':'no-store'}});
   if(Number(object.customMetadata?.expiresAt)<=Date.now()) {await env.BUCKET.delete(key);return new Response('Ce lien a expiré. Demandez un nouveau bon à la personne qui l’a créé.',{status:410,headers:{'Cache-Control':'no-store'}});}
   return new Response(request.method==='HEAD'?null:object.body,{headers:{'Content-Type':'application/pdf','Content-Disposition':'inline; filename="bon-de-commande.pdf"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive'}});
  }
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/order-pdfs/'))return new Response('Introuvable',{status:404});
  if(env.ASSETS){
   const response=await env.ASSETS.fetch(request);
   // Content hashes change whenever a photo changes: safe, long-lived caching.
   if(response.ok && /^\/media\/[a-zA-Z0-9-]+-[a-f0-9]{12}\.webp$/.test(url.pathname)){
    const headers=new Headers(response.headers);headers.set('Content-Type','image/webp');headers.set('Cache-Control','public, max-age=31536000, immutable');
    return new Response(response.body,{status:response.status,headers});
   }
   return response;
  }
  return new Response('Ressource introuvable',{status:404});
 }
};

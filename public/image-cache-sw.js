// Cache only immutable, public product photos. Never HTML, orders or PDFs.
const CACHE = 'maison-faso-images-v1';
const LIMIT = 96;
let writes = Promise.resolve();
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
 const request = event.request;
 const url = new URL(request.url);
 if(request.method !== 'GET' || url.origin !== self.location.origin ||
    !/^\/media\/[a-zA-Z0-9-]+-[a-f0-9]{12}\.webp$/.test(url.pathname) || url.search) return;
 event.respondWith((async () => {
  const cache = await caches.open(CACHE).catch(() => null);
  const cached = cache && await cache.match(request).catch(() => undefined);
  if(cached) return cached;
  const response = await fetch(request);
  if(!response.ok || response.redirected) return response;
  const type = response.headers.get('Content-Type')?.split(';')[0];
  if(!['image/webp','application/octet-stream'].includes(type)) return response;
  const bytes = await response.clone().arrayBuffer();
  const magic = new TextDecoder().decode(bytes.slice(0,12));
  if(!magic.startsWith('RIFF') || magic.slice(8)!=='WEBP' || bytes.byteLength>1024*1024) return response;
  const headers = new Headers(response.headers);
  headers.delete('Content-Encoding');headers.delete('Content-Length');
  headers.set('Content-Type','image/webp');
  headers.set('Cache-Control','public, max-age=31536000, immutable');
  const image = new Response(bytes,{status:200,headers});
  if(cache){
   const copy=image.clone();
   writes = writes.catch(()=>{}).then(async()=>{
    await cache.put(request,copy);
    const keys=await cache.keys();
    await Promise.all(keys.slice(0,Math.max(0,keys.length-LIMIT)).map(key=>cache.delete(key)));
   });
   event.waitUntil(writes.catch(()=>{}));
  }
  return image;
 })());
});

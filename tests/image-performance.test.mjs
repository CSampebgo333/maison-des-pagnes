import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import worker from '../src/lib/pdf-service.js';

test('Chaque photo a des variantes valides et versionnées, les miniatures restent légères', async () => {
 const manifest=JSON.parse(await readFile(new URL('../src/image-manifest.json',import.meta.url)));
 const catalogue=JSON.parse(await readFile(new URL('../src/catalogue.json',import.meta.url)));
 for(const source of [...catalogue.flatMap(p=>p.photos.map(photo=>photo.src)),'pagne-default.png']){
  assert.ok(manifest[source],`Missing variants: ${source}`);
  for(const variant of ['thumbnail','scene','display']){
   const path=manifest[source][variant];
   const bytes=await readFile(new URL('../public/'+path,import.meta.url));
   assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
   assert.ok(path.endsWith(createHash('sha256').update(bytes).digest('hex').slice(0,12)+'.webp'));
   if(variant==='thumbnail')assert.ok(bytes.length<20000,`${path} exceeds thumbnail budget`);
  }
 }
 const defaultBytes=await readFile(new URL('../public/'+manifest['pagne-default.png'].display,import.meta.url));
 assert.ok(defaultBytes.length<300000,'Default photo exceeds display budget');
});

test('Seules les photos versionnées ont un cache immuable ; les erreurs ne sont pas mises en cache', async () => {
 const env={ASSETS:{fetch:async ()=>new Response('image',{headers:{'Content-Type':'application/octet-stream'}})}};
 const response=await worker.fetch(new Request('https://shop.test/media/pagne1-1-scene-123456789abc.webp'),env);
 assert.equal(response.headers.get('Cache-Control'),'public, max-age=31536000, immutable');
 assert.equal(response.headers.get('Content-Type'),'image/webp');assert.equal(await response.text(),'image');
 const html=await worker.fetch(new Request('https://shop.test/'),env);
 assert.notEqual(html.headers.get('Cache-Control'),response.headers.get('Cache-Control'));
 const missing=await worker.fetch(new Request('https://shop.test/media/pagne1-1-scene-123456789abc.webp'),{ASSETS:{fetch:async ()=>new Response('missing',{status:404})}});
 assert.equal(missing.status,404);assert.notEqual(missing.headers.get('Cache-Control'),response.headers.get('Cache-Control'));
});

test('Les PDF partagés par lien restent bornés à 24 Mo, y compris les corps sans taille déclarée', async () => {
 const url='https://shop.test/api/order-pdfs';
 const headers={Origin:'https://shop.test','Content-Type':'application/pdf','Content-Length':String(24*1024*1024+1)};
 assert.equal((await worker.fetch(new Request(url,{method:'POST',headers,body:'%PDF-1.4\nDocument de test\n%%EOF'}),{BUCKET:{}})).status,413);
 let cancelled=false;
 const chunk=new Uint8Array(4*1024*1024);let count=0;
 const stream=new ReadableStream({pull(controller){controller.enqueue(count++<6?chunk:new Uint8Array(1));},cancel(){cancelled=true;}});
 const response=await worker.fetch(new Request(url,{method:'POST',headers:{Origin:'https://shop.test','Content-Type':'application/pdf'},body:stream,duplex:'half'}),{BUCKET:{}});
 assert.equal(response.status,413);assert.equal(cancelled,true);
});

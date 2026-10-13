import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

test('Le cache évite le second téléchargement, exclut PDF/auth/erreurs et limite son stockage', async () => {
 const handlers={},stored=new Map();let calls=0;
 const cache={match:async r=>stored.get(r.url)?.clone(),put:async(r,v)=>stored.set(r.url,v.clone()),keys:async()=>[...stored.keys()].map(url=>new Request(url)),delete:async r=>stored.delete(r.url)};
 const context={self:{location:{origin:'https://shop.test'},addEventListener:(name,handler)=>handlers[name]=handler},caches:{open:async()=>cache},URL,Response,Headers,TextDecoder,Promise,
 fetch:async r=>{calls++;if(r.url.includes('bad-'))return new Response('missing',{status:404});if(r.url.includes('auth-'))return new Response('<html>sign in</html>',{headers:{'Content-Type':'text/html'}});return new Response('RIFF....WEBPphoto',{headers:{'Content-Type':'application/octet-stream'}});}};
 vm.runInNewContext(await readFile(new URL('../public/image-cache-sw.js',import.meta.url),'utf8'),context);
 async function request(path){let response;const tasks=[];handlers.fetch({request:new Request('https://shop.test'+path),respondWith:p=>response=p,waitUntil:p=>tasks.push(p)});if(!response)return null;const result=await response;await Promise.all(tasks);return result;}
 const path='/media/pagne1-scene-123456789abc.webp';
 assert.equal((await request(path)).headers.get('Content-Type'),'image/webp');
 assert.equal(await (await request(path)).text(),'RIFF....WEBPphoto');assert.equal(calls,1);
 assert.equal(await request('/order-pdfs/'+ 'a'.repeat(64)+'.pdf'),null);
 assert.equal(await request('/api/order-pdfs'),null);assert.equal(await request('/'),null);
 await request('/media/bad-scene-123456789abc.webp');await request('/media/auth-scene-123456789abc.webp');assert.equal(stored.size,1);
 for(let i=0;i<100;i++)await request(`/media/pagne${i}-scene-${i.toString(16).padStart(12,'0')}.webp`);
 assert.equal(stored.size,96);assert.equal(stored.has('https://shop.test'+path),false);
});

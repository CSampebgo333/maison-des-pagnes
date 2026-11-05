import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publicPagesRoute,renderDocument} from '../src/lib/public-pages.js';
import {editorialRoutes,editorialKind,editorialMetadata,renderEditorialPage} from '../src/lib/editorial-pages.js';
import {catalogueSitemap,photoAlt} from '../src/lib/product-seo.js';
import {reviewEditorialUpdate,editorialRevision} from '../src/lib/catalogue-editorial.js';
import patches from '../src/lib/catalogue-editorial-data.js';
import seed from '../src/lib/catalogue-seed.js';
const origin='https://fasodanfani.shop',template=await readFile(new URL('../index.html',import.meta.url),'utf8');
const assets={async fetch(){return new Response(template);}};
test('All editorial routes render complete FR/EN text before JavaScript and work without catalogue storage',async()=>{
 for(const path of editorialRoutes)for(const language of ['fr','en']){
  const suffix=language==='en'?'?lang=en':'',kind=editorialKind(path),meta=editorialMetadata(kind,language);
  const env={PUBLIC_SITE_URL:origin,DB:{prepare(){throw Error('unavailable catalogue');}},ASSETS:assets};
  const response=await publicPagesRoute(new Request(origin+path+suffix),env);assert.equal(response.status,200);assert.equal(response.headers.get('Content-Language'),language);
  const html=await response.text();assert.ok(html.includes(renderEditorialPage(kind,language)));assert.ok(html.includes('<h1>'+meta.title.split(' — ')[0]+'</h1>'));assert.equal((html.match(/<h1>/g)||[]).length,1);
  assert.ok(html.includes('rel="canonical" href="'+origin+path+suffix+'"'));assert.ok(html.includes('hreflang="fr" href="'+origin+path+'"'));assert.ok(html.includes('hreflang="en" href="'+origin+path+'?lang=en"'));
  const graph=JSON.parse(html.match(/id="shop-structured-data"[^>]*>(.*?)<\/script>/s)[1]);assert.ok(graph.some(x=>x['@type']==='BreadcrumbList'));assert.ok(graph.some(x=>x['@type']===(kind==='story'?'AboutPage':'WebPage')));assert.ok(!graph.some(x=>x['@type']==='Product'));
 }
});
test('Editorial HEAD, slash redirects and private noindex preserve route and language',async()=>{
 for(const path of editorialRoutes){const env={ASSETS:assets,PUBLIC_SITE_URL:origin};const head=await publicPagesRoute(new Request(origin+path,{method:'HEAD'}),env);assert.equal(head.status,200);assert.equal(await head.text(),'');const redirect=await publicPagesRoute(new Request(origin+path+'/?lang=en'),env);assert.equal(redirect.status,301);assert.equal(redirect.headers.get('Location'),origin+path+'?lang=en');
 const preview=await publicPagesRoute(new Request(origin+path),{ASSETS:assets});assert.match(preview.headers.get('X-Robots-Tag'),/noindex/);assert.doesNotMatch(await preview.text(),/rel="canonical"/);}
 const privatePage=await publicPagesRoute(new Request(origin+'/?q=violet&gestion=1'),{PUBLIC_SITE_URL:origin,ASSETS:assets});assert.match(privatePage.headers.get('X-Robots-Tag'),/noindex/);assert.match(await privatePage.text(),/content="noindex, nofollow"/);
});
test('Sitemap includes both languages for all new pages and real archive images',()=>{const xml=catalogueSitemap(seed,origin);for(const path of editorialRoutes){assert.ok(xml.includes('<loc>'+origin+path+'</loc>'));assert.ok(xml.includes('<loc>'+origin+path+'?lang=en</loc>'));}assert.match(xml,/editorial\/thomas-sankara-archive-1987.webp/);assert.equal((xml.match(/<loc>/g)||[]).length,34);});
test('Delivery explains a request, confirmed charges and indicative timing without inventing a return window',()=>{for(const l of ['fr','en']){const html=renderEditorialPage('delivery',l);assert.match(html,/1 000–1 500/);assert.match(html,/2 000/);assert.match(html,/Orange Money/);assert.match(html,/Wave/);assert.match(html,/data-delivery-choice="stock"/);assert.match(html,/data-delivery-choice="made"/);assert.doesNotMatch(html,/14 jours|30 jours|14 days|30 days|Free delivery|Livraison gratuite/);}});
test('Three-way catalogue update preserves edited descriptions, prices, photos and newer availability',()=>{
 const doc=structuredClone(seed);for(const p of doc.products){const patch=patches.find(x=>x.id===p.id);p.description=patch.before.description;p.translations.en.description=patch.before.description_en;delete p.availability;}
 const before=structuredClone(doc);doc.products[0].price=14500;doc.products[1].description='Description modifiée par la gestion';doc.products[2].photos[0].src='catalogue-images/new.jpg';doc.products[3].availability='unavailable';
 const update=reviewEditorialUpdate(doc);assert.ok(update.changes.length);assert.equal(update.document.products[0].price,14500);assert.equal(update.document.products[0].description,seed.products[0].description);assert.equal(update.document.products[1].description,doc.products[1].description);assert.equal(update.document.products[1].translations.en.description,doc.products[1].translations.en.description);assert.deepEqual(update.document.products[2],doc.products[2]);assert.equal(update.document.products[3].availability,'unavailable');assert.equal(update.document.products[4].availability,'available');assert.ok(update.document.editorialRevisions.includes(editorialRevision));assert.deepEqual(reviewEditorialUpdate(update.document).changes,[]);assert.deepEqual(before.products[0].photos,update.document.products[0].photos);
});
test('Image alternatives distinguish verified existing views and preserve labels on new uploads',()=>{const p=seed.products[0];assert.match(photoAlt(p,p.photos[0]),/plié/);assert.match(photoAlt(p,p.photos[2],'en'),/draped/);assert.match(photoAlt(p,p.photos[3]),/gros plan/);assert.match(photoAlt(p,{src:'catalogue-images/new.jpg',view:1,label:'Vue du revers'}),/Vue du revers/);});
test('Only the actual hero or product image is prioritised, with responsive preload on the homepage',()=>{const home=renderDocument(template,seed,origin,'fr');assert.equal((home.match(/rel="preload" as="image"/g)||[]).length,1);assert.match(home,/imagesrcset="\/media\/pagne1-1-scene/);const product=renderDocument(template,seed,origin,'fr',seed.products[0]);assert.match(product,/rel="preload" as="image" href="\/media\/pagne1-1-display/);assert.doesNotMatch(renderDocument(template,seed,origin,'fr',undefined,true),/rel="preload" as="image"/);});

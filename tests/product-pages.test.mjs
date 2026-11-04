import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publicPagesRoute,renderDocument} from '../src/lib/public-pages.js';
import {productPath,catalogueSitemap,structuredProduct,publicOrigin,productSeoName} from '../src/lib/product-seo.js';
import {seoFiles} from '../scripts/prepare-seo.mjs';
import seed from '../src/lib/catalogue-seed.js';
import {installEnglish} from '../src/lib/i18n-core.js';
import english from '../src/locales/en.json' with {type:'json'};
installEnglish(english);
const template=await readFile(new URL('../index.html',import.meta.url),'utf8');
const origin='https://fasodanfani.shop';
function environment(document=structuredClone(seed)){
 return {PUBLIC_SITE_URL:origin,BUCKET:{async get(){return {json:async()=>document};}},ASSETS:{async fetch(){return new Response(template,{headers:{'Content-Type':'text/html'}});}}};
}
const request=(path,method='GET')=>new Request(origin+path,{method});
const get=(path,env=environment(),method='GET')=>publicPagesRoute(request(path,method),env);
test('A direct product request contains readable product information and crawlable navigation before JavaScript',async()=>{
 const p=seed.products[0],r=await get(productPath(p));assert.equal(r.status,200);const html=await r.text();
 assert.match(html,/<h1 class="mobile-product-title">Rayures lavande<\/h1>/);assert.ok(html.includes(p.description));assert.match(html,/12[\s\u202f]000 CFA/);assert.match(html,/href="\/collection"/);assert.match(html,/<img[^>]+src="\/media\//);assert.equal((html.match(/<title>/g)||[]).length,1);assert.equal((html.match(/name="description"/g)||[]).length,1);assert.equal((html.match(/id="root"/g)||[]).length,1);
 assert.match(html,/rel="canonical" href="https:\/\/fasodanfani.shop\/pagnes\/pagne1\/faso-dan-fani-violet-blanc"/);assert.doesNotMatch(html,/content="noindex/);
 const graph=JSON.parse(html.match(/<script id="shop-structured-data"[^>]*>(.*?)<\/script>/s)[1]);assert.equal(graph[0].name,productSeoName(p));assert.equal(graph[0].offers.price,12000);assert.equal(graph[0].offers.priceCurrency,'XOF');assert.equal(graph[0].offers.availability,undefined);assert.equal(graph[0].aggregateRating,undefined);
});
test('English metadata, page content and alternate links describe the same product',async()=>{
 const p=seed.products[0],r=await get(productPath(p,'en'));const html=await r.text();assert.equal(r.headers.get('Content-Language'),'en');assert.match(html,/<html lang="en"/);assert.match(html,/<h1 class="mobile-product-title">Lavender stripes<\/h1>/);assert.ok(html.includes(p.translations.en.description));assert.match(html,/hreflang="fr" href="https:\/\/fasodanfani.shop\/pagnes\/pagne1\/faso-dan-fani-violet-blanc"/);assert.match(html,/canonical" href="https:\/\/fasodanfani.shop\/pagnes\/pagne1\/faso-dan-fani-violet-blanc\?lang=en"/);assert.match(html,/Purple · White/);
});
test('Public homepage contains links to all products and useful ordering information without requiring button clicks',async()=>{
 const html=await (await get('/')).text();for(const p of seed.products)assert.ok(html.includes('href="'+productPath(p)+'"'));assert.match(html,/Commander un pagne Faso Dan Fani/);assert.match(html,/Livraison à Bobo-Dioulasso et Ouagadougou/);
});
test('Sitemap automatically includes a newly published product, both languages, and excludes hidden and private data',async()=>{
 const doc=structuredClone(seed),newP={...doc.products[0],id:'pagne-new',number:13,name:'Étoile dorée'};doc.products.push(newP);doc.products[1].published=false;
 const r=await get('/sitemap.xml',environment(doc)),xml=await r.text();assert.equal(r.status,200);assert.equal((xml.match(/<loc>/g)||[]).length,28);assert.ok(xml.includes(origin+productPath(newP)));assert.ok(xml.includes(origin+productPath(newP,'en')));assert.ok(!xml.includes(productPath(doc.products[1])));assert.doesNotMatch(xml,/gestion|orders|tracking|order-pdfs|admin/);
 const page=await get(productPath(newP),environment(doc));assert.equal(page.status,200);assert.match(await page.text(),/<h1 class="mobile-product-title">Étoile dorée<\/h1>/);
});
test('Unpublishing or removing a product returns a real 404 and removes links from homepage and sitemap',async()=>{
 for(const remove of [false,true]){const doc=structuredClone(seed),p=doc.products[0];if(remove)doc.products.shift();else p.published=false;const env=environment(doc),r=await get(productPath(p),env);assert.equal(r.status,404);assert.match(r.headers.get('X-Robots-Tag'),/noindex/);assert.ok(!(await (await get('/',env)).text()).includes(productPath(p)));assert.ok(!(await (await get('/sitemap.xml',env)).text()).includes(productPath(p)));}
});
test('Changing dominant colours redirects old URLs and preserves English',async()=>{
 const doc=structuredClone(seed),old=productPath(doc.products[0],'en');doc.products[0].colors=['Rouge','Noir'];const r=await get(old,environment(doc));assert.equal(r.status,301);assert.equal(r.headers.get('Location'),origin+productPath(doc.products[0],'en'));assert.equal((await get(productPath(doc.products[0],'en'),environment(doc))).status,200);
});
test('Current price and confirmed stock come from saved catalogue rather than static build data',async()=>{
 const doc=structuredClone(seed);doc.products[0].price=14500;doc.products[0].availability='unavailable';const html=await (await get(productPath(doc.products[0]),environment(doc))).text();assert.match(html,/14[\s\u202f]500 CFA/);assert.match(html,/OutOfStock/);assert.match(html,/Indisponible pour le moment/);assert.doesNotMatch(html,/"price":12000/);
});
test('Product text cannot inject markup, JSON-LD or replacement-string content',()=>{
 const doc=structuredClone(seed);const p=doc.products[0];p.name='Danger </script><script>alert(1)</script> $&';p.colors=[p.name,'Blanc'];p.description='Text <img onerror="bad"> $&';
 const html=renderDocument(template,doc,origin,'fr',p);assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);assert.doesNotMatch(html,/<img onerror=/);assert.match(html,/Danger &lt;\/script&gt;/);assert.match(html,/Text &lt;img onerror=&quot;bad&quot;&gt; \$&amp;/);assert.equal((html.match(/id="root"/g)||[]).length,1);JSON.parse(html.match(/<script id="shop-structured-data"[^>]*>(.*?)<\/script>/s)[1]);
});
test('Private preview remains non-indexable, without public canonicals or product sitemap entries',async()=>{
 const env=environment();delete env.PUBLIC_SITE_URL;const r=await get(productPath(seed.products[0]),env);assert.equal(r.headers.get('X-Robots-Tag'),'noindex, nofollow');const html=await r.text();assert.match(html,/content="noindex, nofollow"/);assert.doesNotMatch(html,/rel="canonical"/);assert.doesNotMatch(await (await get('/sitemap.xml',env)).text(),/<loc>/);assert.match(await (await get('/robots.txt',env)).text(),/Disallow: \//);
});
test('Temporary database failure returns a retryable 503 instead of indexing stale or missing products',async()=>{
 const env=environment();env.BUCKET.get=async()=>{throw Error('offline');};const r=await get(productPath(seed.products[0]),env);assert.equal(r.status,503);assert.equal(r.headers.get('Retry-After'),'60');assert.equal(r.headers.get('Cache-Control'),'no-store');
});
test('HEAD, invalid product paths and original photo URLs keep their HTTP semantics',async()=>{
 const env=environment(),head=await get(productPath(seed.products[0]),env,'HEAD');assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal((await get('/pagnes/not-a-real-product/example')).status,404);assert.equal((await get('/pagnes/pagne1/wrong/extra')).status,404);assert.equal(await get('/pagnes/pagne1-1.webp'),null);assert.equal(await get('/api/orders'),null);assert.equal(await get('/order-pdfs/private.pdf'),null);
});
test('Asset index aliases redirect to canonical language URLs; product metadata has no stale homepage image dimensions',async()=>{
 assert.equal((await get('/index.en')).headers.get('Location'),origin+'/?lang=en');assert.equal((await get('/index.html')).headers.get('Location'),origin+'/');
 const built=template.replace('</head>','<meta property="og:image:width" content="800" /><meta property="og:image:type" content="image/jpeg" /></head>');const html=renderDocument(built,seed,origin,'fr',seed.products[0]);assert.doesNotMatch(html,/og:image:width|og:image:type/);
});
test('Price and stock markup never fabricate missing values and deployment origins cannot contain secrets or paths',()=>{
 const p=structuredClone(seed.products[0]);p.price=null;assert.equal(structuredProduct(p,seed.variants,origin).offers,undefined);p.price=12000;p.availability='available';assert.equal(structuredProduct(p,seed.variants,origin).offers.availability,'https://schema.org/InStock');for(const value of ['http://shop.test','https://user:pass@shop.test/','https://shop.test/path'])assert.throws(()=>publicOrigin(value));
});

test('Rendering a built homepage template replaces all page-specific metadata without duplicates',()=>{
 const built=template.replace('<!-- PUBLIC_SEO -->',seoFiles(origin).head);const html=renderDocument(built,seed,origin,'en',seed.products[0]);
 for(const key of ['og:title','og:description','og:site_name','og:type','og:locale','og:url','og:image','og:image:secure_url','og:image:alt'])assert.equal((html.match(new RegExp('property="'+key+'"','g'))||[]).length,1,key);
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1);assert.equal((html.match(/application\/ld\+json/g)||[]).length,1);assert.match(html,/BreadcrumbList/);assert.doesNotMatch(html,/og:image:width|og:image:height|og:image:type/);
});
test('Dedicated collection serves all rows before JavaScript, has bilingual canonicals and a sitemap entry',async()=>{
 const doc=structuredClone(seed),extra={...doc.products[0],id:'pagne-extra',number:13,name:'Nouveau modèle',collectionRow:4};doc.products.push(extra);
 const env=environment(doc),home=await (await get('/',env)).text();assert.ok(home.includes('href="/collection"'));assert.ok(!home.includes('href="'+productPath(extra)+'"'));
 for(const l of ['fr','en']){
  const path='/collection'+(l==='en'?'?lang=en':''),r=await get(path,env),html=await r.text();assert.equal(r.status,200);assert.ok(html.includes('href="'+productPath(extra,l)+'"'));assert.ok(html.includes('rel="canonical" href="'+origin+path+'"'));assert.ok(html.includes('hreflang="fr" href="'+origin+'/collection"'));assert.ok(html.includes('hreflang="en" href="'+origin+'/collection?lang=en"'));
  const graph=JSON.parse(html.match(/<script id="shop-structured-data"[^>]*>(.*?)<\/script>/s)[1]);assert.equal(graph.find((g)=>g['@type']==='CollectionPage').mainEntity.itemListElement.length,13);
 }
 assert.ok((await (await get('/sitemap.xml',env)).text()).includes(origin+'/collection'));
 assert.equal((await get('/collection/?lang=en',env)).headers.get('Location'),origin+'/collection?lang=en');
});

test('Colour names produce concise canonical URLs and stable bilingual identities',()=>{
 const p={...seed.products[0],colors:['Violet','Blanc','Noir']};
 assert.equal(productSeoName(p),'Faso Dan Fani - Violet Blanc');
 assert.equal(productSeoName(p,'en'),'Faso Dan Fani - Purple White');
 assert.equal(productPath(p),'/pagnes/pagne1/faso-dan-fani-violet-blanc');
 assert.equal(productPath({...p,name:'Un autre titre'}),productPath(p));
 assert.notEqual(productPath({...p,id:'autre-modele'}),productPath(p));
 assert.equal(productSeoName({...p,colors:['Blanc','Blanc']}),'Faso Dan Fani - Blanc');
 assert.equal(productSeoName({...p,colors:[]}),'Faso Dan Fani');
});
test('Legacy named links redirect directly to the new colour URL in either language',async()=>{
 for(const language of ['fr','en']){
  const r=await get('/pagnes/pagne1/rayures-lavande'+(language==='en'?'?lang=en':''));
  assert.equal(r.status,301);assert.equal(r.headers.get('Location'),origin+productPath(seed.products[0],language));
 }
});
test('Product headings remain available to desktop and can be visually hidden on mobile',async()=>{
 const html=await (await get('/collection')).text();
 assert.doesNotMatch(html,/<h3>Rayures lavande/);
 assert.match(html,/alt="Faso Dan Fani - Violet Blanc"/);
 const detail=await (await get(productPath(seed.products[0]))).text();
 assert.match(detail,/<h1 class="mobile-product-title">/);
 assert.match(detail,/<title>Faso Dan Fani - Violet Blanc/);
});

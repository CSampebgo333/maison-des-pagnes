import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderDocument} from '../src/lib/public-pages.js';
import {homeMetadata,productMetadata,catalogueSitemap,pageStructuredData,productPath} from '../src/lib/product-seo.js';
import {seoFiles} from '../scripts/prepare-seo.mjs';
import seed from '../src/lib/catalogue-seed.js';
const origin='https://fasodanfani.shop',template=await readFile(new URL('../index.html',import.meta.url),'utf8');
test('French and English homepages clearly offer fabrics for sale in headings, metadata and crawlable content',()=>{
 for(const language of ['fr','en']){const meta=homeMetadata(language),html=renderDocument(template,seed,origin,language);assert.match(meta.title,language==='fr'?/Vente de pagnes/:/Shop fabrics/);assert.match(meta.description,language==='fr'?/^Achetez vos pagnes Faso Dan Fani/:/^Shop Faso Dan Fani fabrics/);assert.match(html,language==='fr'?/<h1>Achetez votre <em>Faso Dan Fani\.<\/em><\/h1>/:/<h1>Shop <em>Faso Dan Fani\.<\/em><\/h1>/);assert.match(html,language==='fr'?/Voir les pagnes et les prix/:/Browse fabrics and prices/);assert.ok(html.includes(productPath(seed.products[0],language)));assert.match(html,/Ouagadougou/);assert.match(html,/Bobo-Dioulasso/);}
});
test('Public pages permit large Google image previews while private builds remain noindex without that directive',()=>{
 for(const product of [undefined,seed.products[0]]){const html=renderDocument(template,seed,origin,'fr',product);assert.equal((html.match(/name="googlebot"/g)||[]).length,1);assert.match(html,/content="max-image-preview:large"/);const privateHtml=renderDocument(html,seed,null,'fr',product);assert.match(privateHtml,/content="noindex, nofollow"/);assert.doesNotMatch(privateHtml,/max-image-preview|"@type":"CollectionPage"/);}
});
test('Collection structured data describes actual published product links and one representative image, not a multi-product offer',()=>{
 const products=structuredClone(seed.products);products[1].published=false;const graph=pageStructuredData(undefined,seed.variants,origin,'en',products),page=graph.find(item=>item['@type']==='CollectionPage'),image=graph.find(item=>item['@type']==='ImageObject');assert.equal(page.mainEntity.itemListElement.length,11);assert.equal(page.mainEntity.itemListElement[0].name,'Lavender stripes');assert.ok(!JSON.stringify(page).includes(productPath(products[1])));assert.equal(page.primaryImageOfPage['@id'],image['@id']);assert.equal(image.contentUrl,origin+'/social/rayures-lavande-v3.jpg');assert.equal(image.width,800);assert.equal(graph.some(item=>item['@type']==='Product'),false);
});
test('Image sitemap discovers current photos and excludes the images of unpublished products',()=>{
 const doc=structuredClone(seed);doc.products[1].published=false;const p=doc.products[0];doc.variants[p.photos[0].src].display='media/new-photo.webp';const xml=catalogueSitemap(doc,origin);assert.match(xml,/xmlns:image="http:\/\/www.google.com\/schemas\/sitemap-image\/1.1"/);assert.match(xml,/<image:loc>https:\/\/fasodanfani.shop\/media\/new-photo.webp<\/image:loc>/);for(const photo of doc.products[1].photos)assert.ok(!xml.includes(doc.variants[photo.src].display));assert.doesNotMatch(catalogueSitemap(doc,null),/<image:loc>|<loc>/);assert.equal((xml.match(/<loc>/g)||[]).length,24);
});
test('Product sales descriptions use current prices, state delivery exclusion and do not invite orders for unavailable stock',()=>{
 const product=structuredClone(seed.products[0]);product.price=17500;
 for(const l of ['fr','en']){let meta=productMetadata(product,seed.variants,l);assert.match(meta.description,/17[\s\u202f,]500 CFA/);assert.match(meta.description,l==='fr'?/hors livraison/:/excluding delivery/);product.availability='unavailable';meta=productMetadata(product,seed.variants,l);assert.match(meta.description,l==='fr'?/Indisponible pour le moment/:/Currently unavailable/);assert.doesNotMatch(meta.title,/Acheter|Shop/);product.availability='confirm';}
 product.price=null;assert.match(productMetadata(product,seed.variants).description,/Prix sur demande/);assert.doesNotMatch(productMetadata(product,seed.variants).description,/0 CFA/);
});
test('Build metadata and runtime rendering share the same sales descriptions, image signals and collection data',()=>{
 for(const l of ['fr','en']){const meta=homeMetadata(l),seo=seoFiles(origin,l),html=renderDocument(template,seed,origin,l);assert.ok(seo.head.includes(meta.description));assert.ok(html.includes(meta.description));assert.match(seo.head,/CollectionPage/);assert.match(seo.sitemap,/<image:loc>/);assert.match(html,/sizes="192x192"/);}
});

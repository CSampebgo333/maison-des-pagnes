import {editorialKind,editorialMetadata,editorialStructuredData,renderEditorialPage,editorialLinks,editorialPath} from './editorial-pages.js';
import {commercePolicy,deliveryPath} from './commerce-policy.js';
import {productCollectionRow} from './collection-rows.js';
import {getCatalogue,englishFor} from './catalogue-service.js';
import seed from './catalogue-seed.js';
import {commerceCopy} from './commerce-copy.js';
import {tr} from './i18n-core.js';
import {photoAlt,SHOP_NAME,collectionMetadata,collectionPath,publicOrigin,pageLanguage,productPath,productIdFromPath,translatedProduct,publicProducts,productImage,homeMetadata,productMetadata,pageStructuredData,htmlEscape as e,jsonForHtml,metadataMarkup,catalogueSitemap} from './product-seo.js';
const labels={fr:{collection:'La collection',back:'Retour à la collection',price:'Prix sur demande',delivery:'Prix du pagne hors livraison. Livraison à Ouagadougou et Bobo-Dioulasso ; autres villes sur confirmation.',confirm:'Disponibilité à confirmer',available:'Disponible',unavailable:'Indisponible pour le moment',order:'Sur commande',material:'Composition',dimensions:'Dimensions',pattern:'Motif',contact:'Un renseignement sur ce pagne ? Contactez la boutique sur WhatsApp.',missing:'Ce pagne n’est plus dans la collection.',retry:'La collection est temporairement indisponible. Réessayez dans un instant.'},en:{collection:'The collection',back:'Back to the collection',price:'Price on request',delivery:'Fabric price excludes delivery. Delivery to Ouagadougou and Bobo-Dioulasso; other cities by confirmation.',confirm:'Availability to confirm',available:'Available',unavailable:'Currently unavailable',order:'Made to order',material:'Composition',dimensions:'Dimensions',pattern:'Pattern',contact:'A question about this pagne? Contact the shop on WhatsApp.',missing:'This pagne is no longer in the collection.',retry:'The collection is temporarily unavailable. Please try again shortly.'}};
const style='max-width:1200px;margin:40px auto;padding:24px;font-family:Garamond,Georgia,serif;color:#553747;background:#fff';
const price=(p,l)=>Number.isFinite(p.price)?new Intl.NumberFormat(l==='en'?'en-GB':'fr-BF').format(p.price)+' CFA':labels[l].price;
function faq(l){const policy=commercePolicy(l);return `<section><h2>${l==='en'?'Orders and delivery':'Commandes et livraison'}</h2><p>${e(policy.confirmation)}</p><p>${e(policy.delivery)}</p><p>${e(policy.payment)}</p><a href="${deliveryPath(l)}">${e(policy.link)}</a></section>`;}
export function homeContent(document,l,collectionPage=false,editorial=null){
 const meta=editorial?editorialMetadata(editorial,l):homeMetadata(l),copy=commerceCopy(l),items=publicProducts(document).filter(p=>collectionPage||productCollectionRow(p)<=3);
 return `<main style="${style}"><h1>${collectionPage?labels[l].collection:e(copy.heading)+' <em>'+e(copy.highlight)+'</em>'}</h1><p>${collectionPage?e(collectionMetadata(l).description):e(copy.intro)}</p><p><a href="${e(collectionPath(l))}">${collectionPage?labels[l].collection:e(copy.cta)}</a></p><section id="collection"><h2>${labels[l].collection}</h2><ul style="list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px">${items.map(p=>`<li><a href="${e(productPath(p,l))}"><img src="${e(productImage(p,document.variants))}" alt="${e(photoAlt(p,p.photos[0],l))}" width="180" height="240" loading="lazy" style="object-fit:contain;max-width:100%" /><h3 class="mobile-product-title">${e(l==='en'?(p.translations?.en?.name||translatedProduct(p,l).name):p.name)}</h3></a><p>${e(price(p,l))} · ${l==='en'?'excluding delivery':'hors livraison'}</p></li>`).join('')}</ul></section>${faq(l)}<nav aria-label="${l==='en'?'About our house':'À propos de notre maison'}">${editorialLinks(l).map(link=>`<p><a href="${link.path}">${e(link.label)}</a></p>`).join('')}</nav><p><a href="https://wa.me/22677540792">WhatsApp : +226 77 54 07 92</a></p></main>`;
}
export function productContent(product,variants,l){
 const p={...translatedProduct(product,l),name:l==='en'?(product.translations?.en?.name||translatedProduct(product,l).name):product.name},s=labels[l],home=collectionPath(l);
 return `<main style="${style}"><nav aria-label="${l==='en'?'Breadcrumb':'Fil d’Ariane'}"><a href="${home}">${SHOP_NAME}</a> / <a href="${home}">${s.collection}</a></nav><h1 class="mobile-product-title">${e(p.name)}</h1><p>${e(price(p,l))}${p.unit?' / '+e(p.unit):''}</p><p>${e(s[product.availability==='on-order'?'order':product.availability]??s.confirm)}</p><p>${e(p.description)}</p><dl>${[['pattern',p.pattern],['material',p.composition],['dimensions',p.dimensions]].filter(([,v])=>v).map(([k,v])=>`<dt>${s[k]}</dt><dd>${e(v)}</dd>`).join('')}</dl><p>${e(commercePolicy(l).delivery)}</p><p>${e(commercePolicy(l).confirmation)}</p><a href="${deliveryPath(l)}">${e(commercePolicy(l).link)}</a><a href="https://wa.me/22677540792?text=${encodeURIComponent((l==='en'?'Hello, I would like information about ':'Bonjour, je souhaite un renseignement sur ')+p.name)}">${s.contact}</a><section aria-label="Photos">${p.photos.map((photo,i)=>`<figure><img src="/${e((variants[photo.src]?.display??photo.src).replace(/^\//,''))}" alt="${e(photoAlt(product,photo,l))}" width="${variants[photo.src]?.width??1000}" height="${variants[photo.src]?.height??1333}" ${i?'loading="lazy"':'fetchpriority="high"'} style="max-width:100%;height:auto;max-height:75vh;object-fit:contain" /><figcaption>${e(tr(photo.label,l))}</figcaption></figure>`).join('')}</section><p><a href="${home}">${s.back}</a></p></main>`;
}
export function renderDocument(template,document,origin,l,product,collectionPage=false,editorial=null){
 const meta=editorial?editorialMetadata(editorial,l):product?productMetadata(product,document.variants,l):collectionPage?collectionMetadata(l):homeMetadata(l);
 let html=template.replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name="(?:description|robots|googlebot|twitter:(?:title|description|image(?::alt)?))"|property="og:(?:title|description|site_name|type|locale|url|image(?::[^" ]+)?))"?[^>]*>/gi,'');
 // Drop old canonical/alternate tags and JSON-LD before writing this page's own metadata.
 html=html.replace(/<meta\b[^>]*property="og:image:(?:width|height|type)"[^>]*>/gi,'');
 html=html.replace(/<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>/gi,'').replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,'');
 const heroProduct=product??(!editorial&&!collectionPage?['pagne1','pagne2','pagne3','pagne6','pagne7'].map(id=>publicProducts(document).find(p=>p.id===id)).find(Boolean):undefined);
 const heroPhoto=heroProduct?.photos[0],variant=heroPhoto?document.variants?.[heroPhoto.src]:null;
 const criticalImage=heroPhoto?`<link rel="preload" as="image" href="${e('/'+(variant?.display??heroPhoto.src))}"${!product&&variant?` imagesrcset="${e('/'+variant.scene)} 650w, ${e('/'+variant.display)} 1000w" imagesizes="(max-width:900px) 100vw, 60vw"`:''} fetchpriority="high" />`:'';
 html=html.replace(/<link\b[^>]*rel="preload"[^>]*as="image"[^>]*>/gi,'');
 const graph=editorial?[...pageStructuredData(undefined,{},origin,l).filter(x=>['Organization','WebSite'].includes(x['@type'])),...editorialStructuredData(editorial,origin,l)]:pageStructuredData(product,document.variants,origin,l,document.products,collectionPage);
 html=html.replace('</head>',()=>metadataMarkup(meta,origin,l,product)+criticalImage+(graph.length?`\n<script id="shop-structured-data" type="application/ld+json">${jsonForHtml(graph)}</script>`:'')+'\n</head>').replace(/<html lang="[^"]*"/,`<html lang="${l}"`);
 return html.replace(/<div id="root">[\s\S]*?<\/div>/,()=>`<div id="root">${editorial?renderEditorialPage(editorial,l):product?productContent(product,document.variants,l):homeContent(document,l,collectionPage)}</div>`);
}
const response=(body,type,status=200,extra={})=>new Response(body,{status,headers:{'Content-Type':type,'Cache-Control':'public, max-age=0, must-revalidate',...extra}});
export async function publicPagesRoute(request,env){
 const url=new URL(request.url),path=url.pathname,editorial=editorialKind(path);
 if(!['GET','HEAD'].includes(request.method)||!(editorial||path==='/'||path==='/collection'||path==='/collection/'||path==='/sitemap.xml'||path==='/robots.txt'||path.startsWith('/pagnes/')||/^\/index(?:\.en)?(?:\.html)?$/.test(path)))return null;
 // Existing original photo URLs also live below /pagnes/.
 if(path.startsWith('/pagnes/')&&/\.(?:webp|png|jpe?g)$/i.test(path))return null;
 const origin=url.searchParams.has('gestion')?null:publicOrigin(env.PUBLIC_SITE_URL),l=pageLanguage(url),privateHeaders=origin?{}:{'X-Robots-Tag':'noindex, nofollow'};
 if(editorial&&path.endsWith('/'))return new Response(null,{status:301,headers:{Location:(origin??url.origin)+editorialPath(editorial,l)}});
 if(path==='/collection/')return new Response(null,{status:301,headers:{Location:(origin??url.origin)+collectionPath(l)}});
 const finish=r=>request.method==='HEAD'?new Response(null,{status:r.status,headers:r.headers}):r;
 if(/^\/index(?:\.en)?(?:\.html)?$/.test(path))return new Response(null,{status:301,headers:{Location:(origin??url.origin)+(path.includes('.en')?'/?lang=en':l==='en'?'/?lang=en':'/')}});
 if(path==='/robots.txt')return finish(response(origin?`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /order-pdfs/\nDisallow: /?gestion=\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n','text/plain; charset=utf-8',200,privateHeaders));
 try{
  if(editorial){
   const template=await env.ASSETS.fetch(new Request(new URL(l==='en'?'/index.en':'/',url),{method:'GET'}));
   if(!template.ok)throw Error('HTML template unavailable.');
   return finish(response(renderDocument(await template.text(),{products:[],variants:{}},origin,l,undefined,false,editorial),'text/html; charset=utf-8',200,{'Content-Language':l,...privateHeaders,...(url.searchParams.has('gestion')?{'X-Robots-Tag':'noindex, nofollow'}:{})}));
  }
  const document=env.DB||env.BUCKET?(await getCatalogue(env)).document:origin?null:seed;
  if(!document)throw Error('Catalogue storage unavailable.');
  const enriched={...document,products:document.products.map(p=>({...p,translations:{en:englishFor(p)}}))};
  if(path==='/sitemap.xml')return finish(response(catalogueSitemap(enriched,origin),'application/xml; charset=utf-8',200,privateHeaders));
  let product;
  if(path.startsWith('/pagnes/')){
   product=publicProducts(enriched).find(p=>p.id===productIdFromPath(path));
   if(!product)return finish(response(`<!doctype html><html lang="${l}"><head><meta name="robots" content="noindex, follow" /><title>${e(labels[l].missing)}</title></head><body><main><h1>${e(labels[l].missing)}</h1><a href="/${l==='en'?'?lang=en':''}#collection">${labels[l].back}</a></main></body></html>`,'text/html; charset=utf-8',404,{'X-Robots-Tag':'noindex, follow'}));
   const expected=new URL(productPath(product,l),url);
   if(path!==expected.pathname)return new Response(null,{status:301,headers:{Location:(origin??url.origin)+expected.pathname+expected.search}});
  }
  const template=await env.ASSETS.fetch(new Request(new URL(l==='en'?'/index.en':'/',url),{method:'GET'}));
  if(!template.ok)throw Error('HTML template unavailable.');
  return finish(response(renderDocument(await template.text(),enriched,origin,l,product,path==='/collection'),'text/html; charset=utf-8',200,{'Content-Language':l,...privateHeaders,...(url.searchParams.has('gestion')?{'X-Robots-Tag':'noindex, nofollow'}:{})}));
 }catch{
  return finish(response(labels[l].retry,'text/plain; charset=utf-8',503,{'Retry-After':'60','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}));
 }
}

import {productCollectionRow} from './collection-rows.js';
import {getCatalogue,englishFor} from './catalogue-service.js';
import seed from './catalogue-seed.js';
import {commerceCopy} from './commerce-copy.js';
import {tr} from './i18n-core.js';
import {SHOP_NAME,collectionMetadata,collectionPath,publicOrigin,pageLanguage,productPath,productIdFromPath,translatedProduct,publicProducts,productImage,homeMetadata,productMetadata,pageStructuredData,htmlEscape as e,jsonForHtml,metadataMarkup,catalogueSitemap} from './product-seo.js';
const labels={fr:{collection:'La collection',back:'Retour à la collection',price:'Prix sur demande',delivery:'Prix du pagne hors livraison. Livraison à Ouagadougou et Bobo-Dioulasso ; autres villes sur confirmation.',confirm:'Disponibilité à confirmer',available:'Disponible',unavailable:'Indisponible pour le moment',order:'Sur commande',material:'Composition',dimensions:'Dimensions',pattern:'Motif',contact:'Un renseignement sur ce pagne ? Contactez la boutique sur WhatsApp.',missing:'Ce pagne n’est plus dans la collection.',retry:'La collection est temporairement indisponible. Réessayez dans un instant.'},en:{collection:'The collection',back:'Back to the collection',price:'Price on request',delivery:'Fabric price excludes delivery. Delivery to Ouagadougou and Bobo-Dioulasso; other cities by confirmation.',confirm:'Availability to confirm',available:'Available',unavailable:'Currently unavailable',order:'Made to order',material:'Composition',dimensions:'Dimensions',pattern:'Pattern',contact:'A question about this pagne? Contact the shop on WhatsApp.',missing:'This pagne is no longer in the collection.',retry:'The collection is temporarily unavailable. Please try again shortly.'}};
const visuallyHidden='position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
const style='max-width:1200px;margin:40px auto;padding:24px;font-family:Garamond,Georgia,serif;color:#553747;background:#fff';
const price=(p,l)=>Number.isFinite(p.price)?new Intl.NumberFormat(l==='en'?'en-GB':'fr-BF').format(p.price)+' CFA':labels[l].price;
function faq(l){return l==='en'?'<section><h2>Order a Faso Dan Fani pagne</h2><h3>How do I choose and order?</h3><p>Explore the photos and details, add your favourite fabrics to your selection, then prepare an order request. The shop confirms availability before you agree.</p><h3>Where do you deliver?</h3><p>Delivery to Bobo-Dioulasso and Ouagadougou. Other cities are considered by confirmation. Fabric prices exclude delivery; the fee and timing are confirmed with you.</p><h3>Can I ask for advice?</h3><p>Contact the family shop on WhatsApp for questions about a design, its dimensions or availability.</p></section>':'<section><h2>Commander un pagne Faso Dan Fani</h2><h3>Comment choisir et commander ?</h3><p>Explorez les photos et les détails, ajoutez vos pagnes préférés à votre sélection, puis préparez votre demande de commande. La boutique confirme la disponibilité avant votre accord.</p><h3>Où livrez-vous ?</h3><p>Livraison à Bobo-Dioulasso et Ouagadougou. Les autres villes sont étudiées sur confirmation. Les prix des pagnes sont hors livraison ; les frais et le délai sont confirmés avec vous.</p><h3>Puis-je demander un conseil ?</h3><p>Contactez la boutique familiale sur WhatsApp pour toute question sur un motif, ses dimensions ou sa disponibilité.</p></section>';}
export function homeContent(document,l,collectionPage=false){
 const meta=homeMetadata(l),copy=commerceCopy(l),items=publicProducts(document).filter(p=>collectionPage||productCollectionRow(p)<=3);
 return `<main style="${style}"><h1>${collectionPage?labels[l].collection:e(copy.heading)+' <em>'+e(copy.highlight)+'</em>'}</h1><p>${collectionPage?e(collectionMetadata(l).description):e(copy.intro)}</p><p><a href="${e(collectionPath(l))}">${collectionPage?labels[l].collection:e(copy.cta)}</a></p><section id="collection"><h2>${labels[l].collection}</h2><ul style="list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px">${items.map(p=>`<li><a href="${e(productPath(p,l))}"><img src="${e(productImage(p,document.variants))}" alt="${e(translatedProduct(p,l).name)}" width="180" height="240" loading="lazy" style="object-fit:contain;max-width:100%" /></a><p>${e(price(p,l))} · ${l==='en'?'excluding delivery':'hors livraison'}</p></li>`).join('')}</ul></section>${faq(l)}<p><a href="https://wa.me/22677540792">WhatsApp : +226 77 54 07 92</a></p></main>`;
}
export function productContent(product,variants,l){
 const p=translatedProduct(product,l),s=labels[l],home=collectionPath(l);
 return `<main style="${style}"><nav aria-label="${l==='en'?'Breadcrumb':'Fil d’Ariane'}"><a href="${home}">${SHOP_NAME}</a> / <a href="${home}">${s.collection}</a></nav><h1 class="sr-only" style="${visuallyHidden}">${e(p.name)}</h1><p>Faso Dan Fani · ${e(product.colors.map(c=>tr(c,l)).join(' · '))}</p><p>${e(price(p,l))}${p.unit?' / '+e(p.unit):''}</p><p>${e(s[product.availability==='on-order'?'order':product.availability]??s.confirm)}</p><p>${e(p.description)}</p><dl>${[['pattern',p.pattern],['material',p.composition],['dimensions',p.dimensions]].filter(([,v])=>v).map(([k,v])=>`<dt>${s[k]}</dt><dd>${e(v)}</dd>`).join('')}</dl><p>${s.delivery}</p><a href="https://wa.me/22677540792?text=${encodeURIComponent((l==='en'?'Hello, I would like information about ':'Bonjour, je souhaite un renseignement sur ')+p.name)}">${s.contact}</a><section aria-label="Photos">${p.photos.map((photo,i)=>`<figure><img src="/${e((variants[photo.src]?.display??photo.src).replace(/^\//,''))}" alt="${e(p.name+' — '+tr(photo.label,l))}" width="750" height="1000" ${i?'loading="lazy"':'fetchpriority="high"'} style="max-width:100%;height:auto;max-height:75vh;object-fit:contain" /><figcaption>${e(tr(photo.label,l))}</figcaption></figure>`).join('')}</section><p><a href="${home}">${s.back}</a></p></main>`;
}
export function renderDocument(template,document,origin,l,product,collectionPage=false){
 const meta=product?productMetadata(product,document.variants,l):collectionPage?collectionMetadata(l):homeMetadata(l);
 let html=template.replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name="(?:description|robots|googlebot|twitter:(?:title|description|image(?::alt)?))"|property="og:(?:title|description|site_name|type|locale|url|image(?::[^" ]+)?))"?[^>]*>/gi,'');
 // Drop old canonical/alternate tags and JSON-LD before writing this page's own metadata.
 html=html.replace(/<meta\b[^>]*property="og:image:(?:width|height|type)"[^>]*>/gi,'');
 html=html.replace(/<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>/gi,'').replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,'');
 const graph=pageStructuredData(product,document.variants,origin,l,document.products,collectionPage);
 html=html.replace('</head>',()=>metadataMarkup(meta,origin,l,product)+(graph.length?`\n<script id="shop-structured-data" type="application/ld+json">${jsonForHtml(graph)}</script>`:'')+'\n</head>').replace(/<html lang="[^"]*"/,`<html lang="${l}"`);
 return html.replace(/<div id="root">[\s\S]*?<\/div>/,()=>`<div id="root">${product?productContent(product,document.variants,l):homeContent(document,l,collectionPage)}</div>`);
}
const response=(body,type,status=200,extra={})=>new Response(body,{status,headers:{'Content-Type':type,'Cache-Control':'public, max-age=0, must-revalidate',...extra}});
export async function publicPagesRoute(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!['GET','HEAD'].includes(request.method)||!(path==='/'||path==='/collection'||path==='/collection/'||path==='/sitemap.xml'||path==='/robots.txt'||path.startsWith('/pagnes/')||/^\/index(?:\.en)?(?:\.html)?$/.test(path)))return null;
 // Existing original photo URLs also live below /pagnes/.
 if(path.startsWith('/pagnes/')&&/\.(?:webp|png|jpe?g)$/i.test(path))return null;
 const origin=publicOrigin(env.PUBLIC_SITE_URL),l=pageLanguage(url),privateHeaders=origin?{}:{'X-Robots-Tag':'noindex, nofollow'};
 if(path==='/collection/')return new Response(null,{status:301,headers:{Location:(origin??url.origin)+collectionPath(l)}});
 const finish=r=>request.method==='HEAD'?new Response(null,{status:r.status,headers:r.headers}):r;
 if(/^\/index(?:\.en)?(?:\.html)?$/.test(path))return new Response(null,{status:301,headers:{Location:(origin??url.origin)+(path.includes('.en')?'/?lang=en':l==='en'?'/?lang=en':'/')}});
 if(path==='/robots.txt')return finish(response(origin?`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /order-pdfs/\nDisallow: /?gestion=\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n','text/plain; charset=utf-8',200,privateHeaders));
 try{
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

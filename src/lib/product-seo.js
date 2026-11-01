// Shared by the public Worker and the browser: one URL and one description per product.
export const SHOP_NAME='Maison du Faso Dan Fani';
export function publicOrigin(value){
 if(!value)return null;
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('PUBLIC_SITE_URL must be an HTTPS origin.');
 return url.origin;
}
export const pageLanguage=url=>url.searchParams.get('lang')==='en'?'en':'fr';
const slug=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'faso-dan-fani';
export function productPath(product,language='fr'){
 const path='/pagnes/'+encodeURIComponent(product.id)+'/'+slug(product.name);
 return path+(language==='en'?'?lang=en':'');
}
export function productIdFromPath(path){
 const match=path.match(/^\/pagnes\/([a-zA-Z0-9-]{1,80})(?:\/[^/]+)?\/?$/);
 return match?.[1]??null;
}
export function translatedProduct(product,language='fr'){
 if(language!=='en')return product;
 const en=product.translations?.en;
 return {...product,name:en?.name||`Faso Dan Fani ${product.number}`,description:en?.description||'Contact our family shop in Burkina Faso for more information about this Faso Dan Fani pagne.',pattern:en?.pattern||'',composition:en?.composition||'',dimensions:en?.dimensions||product.dimensions,unit:en?.unit||''};
}
export function publicProducts(document){return document.products.filter(p=>p.published!==false&&p.photos?.length>0);}
export function productImage(product,variants={}){const photo=product.photos[0];return '/'+(variants[photo.src]?.display??photo.src).replace(/^\//,'');}
export function homeMetadata(language='fr'){
 const en=language==='en';
 return {title:en?'Faso Dan Fani pagnes in Burkina Faso | '+SHOP_NAME:'Pagnes Faso Dan Fani au Burkina Faso | '+SHOP_NAME,description:en?'Discover the colours, patterns and prices of our Faso Dan Fani pagnes. Family shop in Burkina Faso, with delivery to Bobo-Dioulasso and Ouagadougou.':'Découvrez les couleurs, motifs et prix de nos pagnes Faso Dan Fani. Boutique familiale au Burkina Faso, livraison à Bobo-Dioulasso et Ouagadougou.',path:en?'/?lang=en':'/',image:'/social/rayures-lavande-v3.jpg',imageAlt:en?'Lavender and white Faso Dan Fani pagne':'Pagne Faso Dan Fani lavande et blanc',type:'website'};
}
export function productMetadata(product,variants={},language='fr'){
 const p=translatedProduct(product,language),en=language==='en';
 const detail=p.description.replace(/\s+/g,' ').trim();
 return {title:`${p.name} — Pagne Faso Dan Fani | ${SHOP_NAME}`,description:(detail+(en?' Delivery to Bobo-Dioulasso and Ouagadougou.':' Livraison à Bobo-Dioulasso et Ouagadougou.')).slice(0,300),path:productPath(product,language),image:productImage(product,variants),imageAlt:p.name,type:'product'};
}
export function structuredProduct(product,variants,origin,language='fr'){
 const p=translatedProduct(product,language),url=origin+productPath(product,language);
 const data={'@context':'https://schema.org','@type':'Product',name:p.name,description:p.description,sku:product.id,url,image:product.photos.map(photo=>origin+'/'+(variants[photo.src]?.display??photo.src).replace(/^\//,'')),...(p.composition?{material:p.composition}:{})};
 if(Number.isFinite(product.price)&&product.price>0)data.offers={'@type':'Offer',url,price:product.price,priceCurrency:'XOF',seller:{'@type':'Organization',name:SHOP_NAME},...(product.availability==='available'?{availability:'https://schema.org/InStock'}:product.availability==='unavailable'?{availability:'https://schema.org/OutOfStock'}:{})};
 return data;
}
export function pageStructuredData(product,variants,origin,language='fr'){
 if(!origin)return [];
 if(!product)return [{'@context':'https://schema.org','@type':'Organization',name:SHOP_NAME,url:origin+'/',telephone:'+22667196556',areaServed:[{'@type':'City',name:'Bobo-Dioulasso'},{'@type':'City',name:'Ouagadougou'}]}];
 return [structuredProduct(product,variants,origin,language),{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:language==='en'?'The collection':'La collection',item:origin+(language==='en'?'/?lang=en':'/')},{'@type':'ListItem',position:2,name:translatedProduct(product,language).name,item:origin+productPath(product,language)}]}];
}
export const htmlEscape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export const jsonForHtml=value=>JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026');
export function metadataMarkup(meta,origin,language='fr',product){
 const e=htmlEscape,canonical=origin?origin+meta.path:null;
 const frPath=product?productPath(product):'/',enPath=product?productPath(product,'en'):'/?lang=en';
 return `<title>${e(meta.title)}</title>\n<meta name="description" content="${e(meta.description)}" />\n<meta name="robots" content="${origin?'index, follow':'noindex, nofollow'}" />\n<meta property="og:title" content="${e(meta.title)}" />\n<meta property="og:description" content="${e(meta.description)}" />\n<meta property="og:type" content="${meta.type}" />\n<meta property="og:locale" content="${language==='en'?'en_GB':'fr_BF'}" />\n<meta property="og:image:alt" content="${e(meta.imageAlt)}" />\n<meta name="twitter:title" content="${e(meta.title)}" />\n<meta name="twitter:description" content="${e(meta.description)}" />`+(origin?`\n<link rel="canonical" href="${e(canonical)}" />\n<link rel="alternate" hreflang="fr" href="${e(origin+frPath)}" />\n<link rel="alternate" hreflang="en" href="${e(origin+enPath)}" />\n<link rel="alternate" hreflang="x-default" href="${e(origin+frPath)}" />\n<meta property="og:url" content="${e(canonical)}" />\n<meta property="og:image" content="${e(origin+meta.image)}" />\n<meta property="og:image:secure_url" content="${e(origin+meta.image)}" />\n<meta name="twitter:image" content="${e(origin+meta.image)}" />\n<meta name="twitter:image:alt" content="${e(meta.imageAlt)}" />`:'');
}
export function catalogueSitemap(document,origin){
 if(!origin)return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" />';
 const e=htmlEscape,entries=[['/','/?lang=en'],...publicProducts(document).map(p=>[productPath(p),productPath(p,'en')])];
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'+entries.flatMap(paths=>paths.map(path=>`<url><loc>${e(origin+path)}</loc><xhtml:link rel="alternate" hreflang="fr" href="${e(origin+paths[0])}" /><xhtml:link rel="alternate" hreflang="en" href="${e(origin+paths[1])}" /></url>`)).join('')+'</urlset>';
}

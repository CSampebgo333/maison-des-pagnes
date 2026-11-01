import {commerceCopy} from './commerce-copy.js';
// Shared by the public Worker and the browser: one URL and one description per product.
export const SHOP_NAME='Maison du Faso Dan Fani';
export const SITE_NAME='Faso Dan Fani';
export const SITE_ALTERNATE_NAMES=['Fasodanfani','Faso Dan-fani','Faso Danfani'];
export function websiteStructuredData(origin){return {'@context':'https://schema.org','@type':'WebSite','@id':origin+'/#website',url:origin+'/',name:SITE_NAME,alternateName:[...SITE_ALTERNATE_NAMES],inLanguage:['fr','en'],publisher:{'@id':origin+'/#organization'}};}
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
 const en=language==='en',copy=commerceCopy(language);
 return {title:copy.title,description:copy.description,path:en?'/?lang=en':'/',image:'/social/rayures-lavande-v3.jpg',imageWidth:800,imageHeight:800,imageType:'image/jpeg',imageAlt:en?'Lavender stripes — purple and white Faso Dan Fani fabric':'Rayures lavande — pagne Faso Dan Fani violet et blanc',type:'website'};
}
export function productMetadata(product,variants={},language='fr'){
 const p=translatedProduct(product,language),en=language==='en',unavailable=product.availability==='unavailable';
 const priced=Number.isFinite(product.price)?new Intl.NumberFormat(en?'en-GB':'fr-BF').format(product.price)+' CFA'+(en?' excluding delivery.':' hors livraison.'):(en?' Price on request.':' Prix sur demande.');
 const action=unavailable?(en?'Currently unavailable.':'Indisponible pour le moment.'):(en?'Browse the photos and prepare your order. Availability confirmed by the shop.':'Consultez les photos et préparez votre commande. Disponibilité confirmée par la boutique.');
 return {title:en?`${p.name} — ${unavailable?'Faso Dan Fani fabric':'Shop Faso Dan Fani'}`:`${p.name} — ${unavailable?'Pagne Faso Dan Fani':'Acheter un pagne Faso Dan Fani'}`,description:`${p.name} · Faso Dan Fani. ${priced} ${action}`,path:productPath(product,language),image:productImage(product,variants),imageAlt:p.name,type:'product'};
}
export function structuredProduct(product,variants,origin,language='fr'){
 const p=translatedProduct(product,language),url=origin+productPath(product,language);
 const data={'@context':'https://schema.org','@type':'Product',name:p.name,description:p.description,sku:product.id,'@id':url+'#product',url,image:product.photos.map(photo=>origin+'/'+(variants[photo.src]?.display??photo.src).replace(/^\//,'')),...(p.composition?{material:p.composition}:{})};
 if(Number.isFinite(product.price)&&product.price>0)data.offers={'@type':'Offer',url,price:product.price,priceCurrency:'XOF',seller:{'@type':'Organization',name:SHOP_NAME},...(product.availability==='available'?{availability:'https://schema.org/InStock'}:product.availability==='unavailable'?{availability:'https://schema.org/OutOfStock'}:{})};
 return data;
}
export function pageStructuredData(product,variants,origin,language='fr',products=[]){
 if(!origin)return [];
 if(!product){
  const meta=homeMetadata(language),imageId=origin+'/#primaryimage';
  return [{'@context':'https://schema.org','@type':'Organization','@id':origin+'/#organization',name:SHOP_NAME,url:origin+'/',telephone:'+22667196556',areaServed:[{'@type':'City',name:'Bobo-Dioulasso'},{'@type':'City',name:'Ouagadougou'}]},websiteStructuredData(origin),{'@context':'https://schema.org','@type':'CollectionPage','@id':origin+meta.path+'#webpage',url:origin+meta.path,name:meta.title,description:meta.description,inLanguage:language,isPartOf:{'@id':origin+'/#website'},primaryImageOfPage:{'@id':imageId},mainEntity:{'@type':'ItemList',itemListElement:publicProducts({products}).map((p,i)=>({'@type':'ListItem',position:i+1,name:translatedProduct(p,language).name,url:origin+productPath(p,language),image:origin+productImage(p,variants)}))}},{'@context':'https://schema.org','@type':'ImageObject','@id':imageId,url:origin+meta.image,contentUrl:origin+meta.image,width:800,height:800,caption:meta.imageAlt}];
 }
 return [structuredProduct(product,variants,origin,language),{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:language==='en'?'The collection':'La collection',item:origin+(language==='en'?'/?lang=en':'/')},{'@type':'ListItem',position:2,name:translatedProduct(product,language).name,item:origin+productPath(product,language)}]},{'@context':'https://schema.org','@type':'WebPage','@id':origin+productPath(product,language)+'#webpage',url:origin+productPath(product,language),inLanguage:language,mainEntity:{'@id':origin+productPath(product,language)+'#product'},primaryImageOfPage:{'@type':'ImageObject',contentUrl:origin+productImage(product,variants),caption:translatedProduct(product,language).name}}];
}
export const htmlEscape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export const jsonForHtml=value=>JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026');
export function metadataMarkup(meta,origin,language='fr',product){
 const e=htmlEscape,canonical=origin?origin+meta.path:null;
 const frPath=product?productPath(product):'/',enPath=product?productPath(product,'en'):'/?lang=en';
 return `<title>${e(meta.title)}</title>\n<meta name="description" content="${e(meta.description)}" />\n<meta name="robots" content="${origin?'index, follow':'noindex, nofollow'}" />${origin?'\n<meta name="googlebot" content="max-image-preview:large" />':''}\n<meta property="og:title" content="${e(meta.title)}" />\n<meta property="og:description" content="${e(meta.description)}" />\n<meta property="og:site_name" content="${e(SITE_NAME)}" />\n<meta property="og:type" content="${meta.type}" />\n<meta property="og:locale" content="${language==='en'?'en_GB':'fr_BF'}" />\n<meta property="og:image:alt" content="${e(meta.imageAlt)}" />\n<meta name="twitter:title" content="${e(meta.title)}" />\n<meta name="twitter:description" content="${e(meta.description)}" />`+(origin?`\n<link rel="canonical" href="${e(canonical)}" />\n<link rel="alternate" hreflang="fr" href="${e(origin+frPath)}" />\n<link rel="alternate" hreflang="en" href="${e(origin+enPath)}" />\n<link rel="alternate" hreflang="x-default" href="${e(origin+frPath)}" />\n<meta property="og:url" content="${e(canonical)}" />\n<meta property="og:image" content="${e(origin+meta.image)}" />\n<meta property="og:image:secure_url" content="${e(origin+meta.image)}" />\n<meta name="twitter:image" content="${e(origin+meta.image)}" />\n<meta name="twitter:image:alt" content="${e(meta.imageAlt)}" />${meta.imageWidth&&meta.imageHeight?`\n<meta property="og:image:width" content="${meta.imageWidth}" />\n<meta property="og:image:height" content="${meta.imageHeight}" />`:""}${meta.imageType?`\n<meta property="og:image:type" content="${e(meta.imageType)}" />`:""}`:'');
}
export function catalogueSitemap(document,origin){
 if(!origin)return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" />';
 const e=htmlEscape,items=publicProducts(document),entries=[{paths:['/','/?lang=en'],images:['/social/rayures-lavande-v3.jpg',...items.map(p=>productImage(p,document.variants))]},...items.map(p=>({paths:[productPath(p),productPath(p,'en')],images:p.photos.map(photo=>'/'+(document.variants?.[photo.src]?.display??photo.src).replace(/^\//,''))}))];
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+entries.flatMap(({paths,images})=>paths.map(path=>`<url><loc>${e(origin+path)}</loc><xhtml:link rel="alternate" hreflang="fr" href="${e(origin+paths[0])}" /><xhtml:link rel="alternate" hreflang="en" href="${e(origin+paths[1])}" />${[...new Set(images)].map(image=>`<image:image><image:loc>${e(origin+image)}</image:loc></image:image>`).join('')}</url>`)).join('')+'</urlset>';
}

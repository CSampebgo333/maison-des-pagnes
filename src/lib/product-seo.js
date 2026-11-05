import {editorialRoutes,editorialKind,editorialMetadata} from './editorial-pages.js';
import {productCollectionRow} from './collection-rows.js';
import {commerceCopy} from './commerce-copy.js';
// Shared by the public Worker and the browser: one URL and one description per product.
export const SHOP_NAME='Maison du Faso Dan Fani';
export const SITE_NAME=SHOP_NAME;
export const SITE_ALTERNATE_NAMES=[];
export function websiteStructuredData(origin){return {'@context':'https://schema.org','@type':'WebSite','@id':origin+'/#website',url:origin+'/',name:SITE_NAME,...(SITE_ALTERNATE_NAMES.length?{alternateName:[...SITE_ALTERNATE_NAMES]}:{}),inLanguage:['fr','en'],publisher:{'@id':origin+'/#organization'}};}
export function publicOrigin(value){
 if(!value)return null;
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('PUBLIC_SITE_URL must be an HTTPS origin.');
 return url.origin;
}
export const pageLanguage=url=>url.searchParams.get('lang')==='en'?'en':'fr';
const slug=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'faso-dan-fani';
// The colour order is curated in the catalogue: first = dominant colour.
// Keep the stable ID so two designs in the same colours never share a URL.
export function productSeoName(product,language='fr'){
 const colours=[...new Set((product.colors??[]).map(c=>String(c).trim()).filter(Boolean))].slice(0,2);
 const english={Violet:'Purple',Blanc:'White',Bleu:'Blue',Jaune:'Yellow',Noir:'Black',Vert:'Green',Gris:'Grey',Turquoise:'Turquoise',Orange:'Orange',Marron:'Brown',Rose:'Pink',Rouge:'Red',Beige:'Beige',Doré:'Gold'};
 return 'Faso Dan Fani'+(colours.length?' - '+colours.map(c=>language==='en'?(english[c]??c):c).join(' '):'');
}
export function productPath(product,language='fr'){
 const path='/pagnes/'+encodeURIComponent(product.id)+'/'+slug(productSeoName(product));
 return path+(language==='en'?'?lang=en':'');
}
export function productIdFromPath(path){
 const match=path.match(/^\/pagnes\/([a-zA-Z0-9-]{1,80})(?:\/[^/]+)?\/?$/);
 return match?.[1]??null;
}
export function translatedProduct(product,language='fr'){
 if(language!=='en')return {...product,name:productSeoName(product,language)};
 const en=product.translations?.en;
 return {...product,name:productSeoName(product,language),description:en?.description||'Contact our family shop in Burkina Faso for more information about this Faso Dan Fani pagne.',pattern:en?.pattern||'',composition:en?.composition||'',dimensions:en?.dimensions||product.dimensions,unit:en?.unit||''};
}
export function publicProducts(document){return document.products.filter(p=>p.published!==false&&p.photos?.length>0);}
export function productImage(product,variants={}){const photo=product.photos[0];return '/'+(variants[photo.src]?.display??photo.src).replace(/^\//,'');}
export function homeMetadata(language='fr'){
 const en=language==='en',copy=commerceCopy(language);
 return {title:copy.title,description:copy.description,path:en?'/?lang=en':'/',image:'/social/rayures-lavande-v3.jpg',imageWidth:800,imageHeight:800,imageType:'image/jpeg',imageAlt:en?'Lavender stripes — purple and white Faso Dan Fani fabric':'Rayures lavande — pagne Faso Dan Fani violet et blanc',type:'website'};
}
export const collectionPath=(language='fr')=>'/collection'+(language==='en'?'?lang=en':'');
export function collectionMetadata(language='fr'){
 const en=language==='en';return {...homeMetadata(language),title:en?'Faso Dan Fani pagnes: designs and prices — Our collection':'Pagnes Faso Dan Fani : modèles et prix — Notre collection',description:en?'Compare our Faso Dan Fani pagnes, their photographs, patterns and prices. Prepare an order request with our family shop in Bobo-Dioulasso.':'Comparez nos pagnes Faso Dan Fani, leurs photos, motifs et prix. Préparez votre demande de commande auprès de notre boutique familiale à Bobo-Dioulasso.',path:collectionPath(language)};
}
export function productMetadata(product,variants={},language='fr'){
 const p=translatedProduct(product,language),en=language==='en',unavailable=product.availability==='unavailable';
 const priced=Number.isFinite(product.price)?new Intl.NumberFormat(en?'en-GB':'fr-BF').format(product.price)+' CFA'+(en?' excluding delivery.':' hors livraison.'):(en?' Price on request.':' Prix sur demande.');
 const action=unavailable?(en?'Currently unavailable.':'Indisponible pour le moment.'):(en?'Browse the photos and prepare your order. Availability confirmed by the shop.':'Consultez les photos et préparez votre commande. Disponibilité confirmée par la boutique.');
 return {title:p.name.replace(' - ',' — ')+' | '+SHOP_NAME,description:`${p.name}. ${p.pattern?p.pattern+'. ':''}${priced} ${action}`,path:productPath(product,language),image:productImage(product,variants),imageAlt:p.name,type:'product'};
}
export function structuredProduct(product,variants,origin,language='fr'){
 const p=translatedProduct(product,language),url=origin+productPath(product,language);
 const data={'@context':'https://schema.org','@type':'Product',name:p.name,description:p.description,sku:product.id,'@id':url+'#product',url,image:product.photos.map(photo=>origin+'/'+(variants[photo.src]?.display??photo.src).replace(/^\//,'')),...(p.composition?{material:p.composition}:{})};
 if(Number.isFinite(product.price)&&product.price>0)data.offers={'@type':'Offer',url,price:product.price,priceCurrency:'XOF',seller:{'@type':'Organization',name:SHOP_NAME},...(product.availability==='available'?{availability:'https://schema.org/InStock'}:product.availability==='unavailable'?{availability:'https://schema.org/OutOfStock'}:{})};
 return data;
}
export function pageStructuredData(product,variants,origin,language='fr',products=[],collectionPage=false){
 if(!origin)return [];
 if(!product){
  const meta=collectionPage?collectionMetadata(language):homeMetadata(language),imageId=origin+'/#primaryimage';
  return [{'@context':'https://schema.org','@type':'Organization','@id':origin+'/#organization',name:SHOP_NAME,url:origin+'/',telephone:'+22667196556',logo:{'@type':'ImageObject',url:origin+'/icons/app-512.png'},contactPoint:[{'@type':'ContactPoint',telephone:'+22667196556',contactType:'customer service',availableLanguage:['fr','en']},{'@type':'ContactPoint',telephone:'+22674387624',contactType:'customer service',availableLanguage:['fr','en']}],areaServed:[{'@type':'City',name:'Bobo-Dioulasso'},{'@type':'City',name:'Ouagadougou'}]},websiteStructuredData(origin),{'@context':'https://schema.org','@type':collectionPage?'CollectionPage':'WebPage','@id':origin+meta.path+'#webpage',url:origin+meta.path,name:meta.title,description:meta.description,inLanguage:language,isPartOf:{'@id':origin+'/#website'},primaryImageOfPage:{'@id':imageId},mainEntity:{'@type':'ItemList',itemListElement:publicProducts({products}).filter(p=>collectionPage||productCollectionRow(p)<=3).map((p,i)=>({'@type':'ListItem',position:i+1,name:translatedProduct(p,language).name,url:origin+productPath(p,language),image:origin+productImage(p,variants)}))}},{'@context':'https://schema.org','@type':'ImageObject','@id':imageId,url:origin+meta.image,contentUrl:origin+meta.image,width:800,height:800,caption:meta.imageAlt}];
 }
 return [structuredProduct(product,variants,origin,language),websiteStructuredData(origin),{'@context':'https://schema.org','@type':'Organization','@id':origin+'/#organization',name:SHOP_NAME,url:origin+'/',telephone:'+22667196556'},{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:language==='en'?'The collection':'La collection',item:origin+collectionPath(language)},{'@type':'ListItem',position:2,name:translatedProduct(product,language).name,item:origin+productPath(product,language)}]},{'@context':'https://schema.org','@type':'WebPage','@id':origin+productPath(product,language)+'#webpage',url:origin+productPath(product,language),inLanguage:language,mainEntity:{'@id':origin+productPath(product,language)+'#product'},primaryImageOfPage:{'@type':'ImageObject',contentUrl:origin+productImage(product,variants),caption:translatedProduct(product,language).name}}];
}
export const htmlEscape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export const jsonForHtml=value=>JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026');
export function metadataMarkup(meta,origin,language='fr',product){
 const e=htmlEscape,canonical=origin?origin+meta.path:null;
 const collection=meta.path.startsWith('/collection');
 const kind=editorialKind(meta.path);
 const frPath=product?productPath(product):collection?collectionPath():kind?editorialMetadata(kind).path:'/',enPath=product?productPath(product,'en'):collection?collectionPath('en'):kind?editorialMetadata(kind,'en').path:'/?lang=en';
 return `<title>${e(meta.title)}</title>\n<meta name="description" content="${e(meta.description)}" />\n<meta name="robots" content="${origin?'index, follow':'noindex, nofollow'}" />${origin?'\n<meta name="googlebot" content="max-image-preview:large" />':''}\n<meta property="og:title" content="${e(meta.title)}" />\n<meta property="og:description" content="${e(meta.description)}" />\n<meta property="og:site_name" content="${e(SITE_NAME)}" />\n<meta property="og:type" content="${meta.type}" />\n<meta property="og:locale" content="${language==='en'?'en_GB':'fr_BF'}" />\n<meta property="og:image:alt" content="${e(meta.imageAlt)}" />\n<meta name="twitter:title" content="${e(meta.title)}" />\n<meta name="twitter:description" content="${e(meta.description)}" />`+(origin?`\n<link rel="canonical" href="${e(canonical)}" />\n<link rel="alternate" hreflang="fr" href="${e(origin+frPath)}" />\n<link rel="alternate" hreflang="en" href="${e(origin+enPath)}" />\n<link rel="alternate" hreflang="x-default" href="${e(origin+frPath)}" />\n<meta property="og:url" content="${e(canonical)}" />\n<meta property="og:image" content="${e(origin+meta.image)}" />\n<meta property="og:image:secure_url" content="${e(origin+meta.image)}" />\n<meta name="twitter:image" content="${e(origin+meta.image)}" />\n<meta name="twitter:image:alt" content="${e(meta.imageAlt)}" />${meta.imageWidth&&meta.imageHeight?`\n<meta property="og:image:width" content="${meta.imageWidth}" />\n<meta property="og:image:height" content="${meta.imageHeight}" />`:""}${meta.imageType?`\n<meta property="og:image:type" content="${e(meta.imageType)}" />`:""}`:'');
}
export function catalogueSitemap(document,origin){
 if(!origin)return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" />';
 const e=htmlEscape,items=publicProducts(document),entries=[{paths:['/','/?lang=en'],images:['/social/rayures-lavande-v3.jpg',...items.map(p=>productImage(p,document.variants))]},{paths:[collectionPath(),collectionPath('en')],images:items.map(p=>productImage(p,document.variants))},...editorialRoutes.map(path=>({paths:[path,path+'?lang=en'],images:path==='/faso-dan-fani'?['/editorial/pagnes-ouagadougou-2019.webp','/editorial/thomas-sankara-archive-1987.webp']:[]})),...items.map(p=>({paths:[productPath(p),productPath(p,'en')],images:p.photos.map(photo=>'/'+(document.variants?.[photo.src]?.display??photo.src).replace(/^\//,''))}))];
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+entries.flatMap(({paths,images})=>paths.map(path=>`<url><loc>${e(origin+path)}</loc><xhtml:link rel="alternate" hreflang="fr" href="${e(origin+paths[0])}" /><xhtml:link rel="alternate" hreflang="en" href="${e(origin+paths[1])}" />${[...new Set(images)].map(image=>`<image:image><image:loc>${e(origin+image)}</image:loc></image:image>`).join('')}</url>`)).join('')+'</urlset>';
}

// Existing catalogue views have been checked visually. Uploaded views use their own labels.
export function photoAlt(product,photo,language='fr'){
 const en=language==='en',name=productSeoName(product,language);
 const legacy=/^pagnes\/pagne\d+-[1-5]\.webp$/.test(photo.src);
 const views=en?['folded pagne, front view','partially unfolded pagne','draped pagne','close-up of the weave and pattern','folded pagne, another angle']:['pagne plié, vue de face','pagne partiellement déplié','pagne drapé','gros plan du tissage et du motif','pagne plié, autre angle'];
 return name+' — '+(legacy?views[(photo.view??1)-1]??photo.label:photo.label|| (en?'product photograph':'photo du pagne'));
}

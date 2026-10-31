import fs from 'node:fs/promises';
import shop from '../config/boutique.json' with {type:'json'};
export function seoFiles(publicUrl,language='fr'){
 let url=null;
 if(publicUrl){url=new URL(publicUrl);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('PUBLIC_SITE_URL doit être l’origine HTTPS du domaine public, sans chemin ni paramètres.');}
 const origin=url?.origin;
 const schema={'@context':'https://schema.org','@type':'Organization',name:shop.name,description:'Boutique familiale de pagnes Faso Dan Fani au Burkina Faso.',telephone:'+22667196556',areaServed:[{'@type':'City',name:'Bobo-Dioulasso'},{'@type':'City',name:'Ouagadougou'}],contactPoint:[{'@type':'ContactPoint',telephone:'+22677540792',contactType:'customer service',availableLanguage:['fr','en']}],...(origin?{url:origin+'/'}:{})};
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 const shareAlt=language==='en'?'Lavender stripes — folded purple and white Faso Dan Fani pagne, fifth photo':'Rayures lavande — pagne Faso Dan Fani violet et blanc plié, cinquième photo';
 const head=`<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>`+(origin?`\n<link rel="canonical" href="${escape(origin)}/${language==='en'?'?lang=en':''}" />\n<link rel="alternate" hreflang="fr" href="${escape(origin)}/" />\n<link rel="alternate" hreflang="en" href="${escape(origin)}/?lang=en" />\n<link rel="alternate" hreflang="x-default" href="${escape(origin)}/" />\n<meta property="og:url" content="${escape(origin)}/${language==='en'?'?lang=en':''}" />\n<meta property="og:image" content="${escape(origin)}/social/rayures-lavande-v2.jpg" />\n<meta property="og:image:alt" content="${shareAlt}" />
<meta property="og:image:width" content="1254" />
<meta property="og:image:height" content="1254" />
<meta property="og:image:type" content="image/jpeg" />
<meta name="twitter:image" content="${escape(origin)}/social/rayures-lavande-v2.jpg" />
<meta name="twitter:image:alt" content="${shareAlt}" />`:'');
 const robots=origin?`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /order-pdfs/\nDisallow: /?gestion=\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n';
 const sitemap=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${origin?`<url><loc>${escape(origin)}/</loc></url><url><loc>${escape(origin)}/?lang=en</loc></url>`:''}</urlset>`;
 return {head,robots,sitemap,indexable:Boolean(origin)};
}
export async function prepareSeo(){
 const source=await fs.readFile('dist/client/index.html','utf8');
 for(const language of ['fr','en']){
  const seo=seoFiles(process.env.PUBLIC_SITE_URL,language);let html=source;
  if(language==='en'){
   html=html.replace('lang="fr"','lang="en"').replaceAll('fr_BF','en_GB').replaceAll('Maison du Faso Dan Fani | Pagnes au Burkina Faso','Maison du Faso Dan Fani | Pagnes in Burkina Faso');
   html=html.replace(/(<meta name="description" content=")[^"]+/, '$1Discover Faso Dan Fani pagnes from our family shop in Burkina Faso. Explore the fabrics, their details and prepare an order request. Delivery to Bobo-Dioulasso and Ouagadougou.');
   html=html.replace(/(<meta property="og:title" content=")[^"]+/, '$1Maison du Faso Dan Fani | Pagnes in Burkina Faso');
   html=html.replace(/(<meta property="og:description" content=")[^"]+/, '$1Discover Faso Dan Fani pagnes. Delivery to Bobo-Dioulasso and Ouagadougou.');
   html=html.replace(/<div id="root">[\s\S]*?<\/div>/, '<div id="root"><main><h1>Maison du Faso Dan Fani</h1><p>Discover Faso Dan Fani pagnes from our family shop in Burkina Faso. Explore the colours and weaving details and prepare an order request.</p><h2>Delivery and collection</h2><p>Delivery to Bobo-Dioulasso and Ouagadougou. Other cities depend on the general situation. Prices exclude delivery. Availability, charges and timing are confirmed before you agree. Collection in Bobo-Dioulasso by arrangement.</p><h2>Contact the shop</h2><p>Phone: <a href="tel:+22667196556">+226 67 19 65 56</a> or <a href="tel:+22674387624">+226 74 38 76 24</a>.</p><p>WhatsApp: <a href="https://wa.me/22677540792">+226 77 54 07 92</a> or <a href="https://wa.me/22667196556">+226 67 19 65 56</a>.</p><noscript><p>Enable JavaScript for the collection and order form. You can still use the contact links above.</p></noscript></main></div>');
  }
  html=html.replace('<!-- PUBLIC_SEO -->',seo.head);if(seo.indexable)html=html.replace('content="noindex, nofollow"','content="index, follow"');await fs.writeFile(language==='fr'?'dist/client/index.html':'dist/client/index.en.html',html);
  if(language==='fr'){await fs.writeFile('dist/client/robots.txt',seo.robots);await fs.writeFile('dist/client/sitemap.xml',seo.sitemap);}
 }
}

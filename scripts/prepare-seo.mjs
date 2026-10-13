import fs from 'node:fs/promises';
import shop from '../config/boutique.json' with {type:'json'};
export function seoFiles(publicUrl){
 let url=null;
 if(publicUrl){url=new URL(publicUrl);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('PUBLIC_SITE_URL doit être l’origine HTTPS du domaine public, sans chemin ni paramètres.');}
 const origin=url?.origin;
 const schema={'@context':'https://schema.org','@type':'Organization',name:shop.name,description:'Boutique familiale de pagnes Faso Dan Fani au Burkina Faso.',telephone:'+22667196556',areaServed:[{'@type':'City',name:'Bobo-Dioulasso'},{'@type':'City',name:'Ouagadougou'}],contactPoint:[{'@type':'ContactPoint',telephone:'+22677540792',contactType:'customer service',availableLanguage:['fr']}],...(origin?{url:origin+'/'}:{})};
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 const head=`<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>`+(origin?`\n<link rel="canonical" href="${escape(origin)}/" />\n<meta property="og:url" content="${escape(origin)}/" />\n<meta property="og:image" content="${escape(origin)}/pagne-default.png" />\n<meta property="og:image:alt" content="Pagne Faso Dan Fani aux rayures lavande" />`:'');
 const robots=origin?`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /order-pdfs/\nDisallow: /?gestion=\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n';
 const sitemap=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${origin?`<url><loc>${escape(origin)}/</loc></url>`:''}</urlset>`;
 return {head,robots,sitemap,indexable:Boolean(origin)};
}
export async function prepareSeo(){const seo=seoFiles(process.env.PUBLIC_SITE_URL);const path='dist/client/index.html';let html=await fs.readFile(path,'utf8');html=html.replace('<!-- PUBLIC_SEO -->',seo.head);if(seo.indexable)html=html.replace('content="noindex, nofollow"','content="index, follow"');await fs.writeFile(path,html);await fs.writeFile('dist/client/robots.txt',seo.robots);await fs.writeFile('dist/client/sitemap.xml',seo.sitemap);}

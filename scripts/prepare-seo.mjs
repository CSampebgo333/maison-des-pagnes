import fs from 'node:fs/promises';
import {publicOrigin,homeMetadata,metadataMarkup,pageStructuredData,jsonForHtml,catalogueSitemap} from '../src/lib/product-seo.js';
import {renderDocument} from '../src/lib/public-pages.js';
import seed from '../src/lib/catalogue-seed.js';
import english from '../src/locales/en.json' with {type:'json'};
import {installEnglish} from '../src/lib/i18n-core.js';
export function seoFiles(publicUrl,language='fr'){
 const origin=publicOrigin(publicUrl),graph=pageStructuredData(undefined,seed.variants,origin,language,seed.products);
 const head=origin?`<script id="shop-structured-data" type="application/ld+json">${jsonForHtml(graph)}</script>\n`+metadataMarkup(homeMetadata(language),origin,language):'';
 const robots=origin?`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /order-pdfs/\nDisallow: /?gestion=\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n';
 return {head,robots,sitemap:catalogueSitemap(seed,origin),indexable:Boolean(origin)};
}
export async function prepareSeo(){
 installEnglish(english);
 const source=await fs.readFile('dist/client/index.html','utf8');
 const origin=publicOrigin(process.env.PUBLIC_SITE_URL);
 for(const language of ['fr','en']){
  const seo=seoFiles(process.env.PUBLIC_SITE_URL,language);
  // Use the same rendering and metadata for build output and live catalogue responses.
  const html=renderDocument(source,seed,origin,language).replace('<!-- PUBLIC_SEO -->','');
  await fs.writeFile(language==='fr'?'dist/client/index.html':'dist/client/index.en.html',html);
  if(language==='fr'){await fs.writeFile('dist/client/robots.txt',seo.robots);await fs.writeFile('dist/client/sitemap.xml',seo.sitemap);}
 }
}

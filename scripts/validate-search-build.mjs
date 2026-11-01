import {publicOrigin} from '../src/lib/product-seo.js';
// A public custom domain must never receive a private-preview/noindex build.
export function validatePublicSearchBuild(config,{french,english,robots}){
 const domains=config.routes?.filter(route=>route.custom_domain).map(route=>route.pattern)??[];
 if(!domains.length)return;
 const origin=publicOrigin(config.vars?.PUBLIC_SITE_URL);
 if(!origin||!domains.includes(new URL(origin).hostname))throw Error('Set PUBLIC_SITE_URL to the HTTPS origin of the deployed custom domain before publishing.');
 for(const [html,canonical] of [[french,origin+'/'],[english,origin+'/?lang=en']]){
  const head=html.split('</head>')[0];
  if(!/<meta\s+name="robots"\s+content="index, follow"/.test(head)||/<meta[^>]+content="[^"]*noindex/i.test(head)||!head.includes(`<link rel="canonical" href="${canonical}"`))throw Error('The public HTML must be indexable and declare the configured canonical URL. Rebuild with PUBLIC_SITE_URL.');
 }
 if(!robots.includes('Sitemap: '+origin+'/sitemap.xml')||/^Disallow:\s*\/\s*$/m.test(robots))throw Error('The public robots.txt must permit crawling and reference the configured sitemap.');
}

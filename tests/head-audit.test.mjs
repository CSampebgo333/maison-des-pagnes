import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderDocument} from '../src/lib/public-pages.js';
import {pageStructuredData,homeMetadata,metadataMarkup} from '../src/lib/product-seo.js';
import {seoFiles} from '../scripts/prepare-seo.mjs';
import {secureResponse} from '../src/lib/security.js';
import {validatePublicSearchBuild} from '../scripts/validate-search-build.mjs';
import seed from '../src/lib/catalogue-seed.js';
const origin='https://fasodanfani.shop',template=await readFile(new URL('../index.html',import.meta.url),'utf8');
const config={routes:[{pattern:'fasodanfani.shop',custom_domain:true}],vars:{PUBLIC_SITE_URL:origin}};
const build=()=>({french:'<head>'+metadataMarkup(homeMetadata(),origin)+'</head>',english:'<head>'+metadataMarkup(homeMetadata('en'),origin,'en')+'</head>',robots:seoFiles(origin).robots});
test('Homepage site-name data identifies the actual shop consistently before and after JavaScript',()=>{
 const built=JSON.parse(seoFiles(origin).head.match(/<script[^>]*>(.*?)<\/script>/s)[1]);
 for(const graph of [built,pageStructuredData(undefined,seed.variants,origin)]){const website=graph.find(item=>item['@type']==='WebSite'),organization=graph.find(item=>item['@type']==='Organization');assert.equal(website.name,'Maison du Faso Dan Fani');assert.equal(website.url,origin+'/');assert.equal(website.publisher['@id'],organization['@id']);assert.deepEqual(website.inLanguage,['fr','en']);}
 assert.deepEqual(pageStructuredData(undefined,seed.variants,null),[]);
});
test('Homepage sharing metadata retains the real JPEG dimensions in both languages',()=>{
 for(const language of ['fr','en']){const html=renderDocument(template,seed,origin,language);for(const [key,value] of [['width','800'],['height','800'],['type','image/jpeg']])assert.match(html,new RegExp(`property="og:image:${key}" content="${value}"`));assert.equal((html.match(/property="og:image:width"/g)||[]).length,1);assert.match(html,/social\/rayures-lavande-v3.jpg/);}
});
test('An existing genuine HTML ownership tag is preserved when page metadata is generated',()=>{
 const token='test-verification-token-not-a-real-owner';const source=template.replace('</head>',`<meta name="google-site-verification" content="${token}" /></head>`);
 for(const product of [undefined,seed.products[0]]){const html=renderDocument(source,seed,origin,'fr',product);assert.equal((html.match(/name="google-site-verification"/g)||[]).length,1);assert.ok(html.includes(`content="${token}"`));}
});
test('HTTP language headers preserve explicit page language and recognise legacy English HTML paths',()=>{
 const html=()=>new Response('<html lang="en"></html>',{headers:{'Content-Type':'text/html','Content-Language':'en'}});
 assert.equal(secureResponse(html(),new Request(origin+'/index.en'),{}).headers.get('Content-Language'),'en');
 for(const path of ['/index.en','/index.en.html','/?lang=en'])assert.equal(secureResponse(new Response('',{headers:{'Content-Type':'text/html'}}),new Request(origin+path),{}).headers.get('Content-Language'),'en');
 assert.equal(secureResponse(new Response('',{headers:{'Content-Type':'text/html'}}),new Request(origin+'/'),{}).headers.get('Content-Language'),'fr');
});
test('Public deployment accepts coherent indexable bilingual HTML and rejects absent or wrong site origin',()=>{
 assert.doesNotThrow(()=>validatePublicSearchBuild(config,build()));
 for(const value of [undefined,'','https://different.example','http://fasodanfani.shop','https://fasodanfani.shop/path'])assert.throws(()=>validatePublicSearchBuild({...config,vars:{PUBLIC_SITE_URL:value}},build()));
 assert.doesNotThrow(()=>validatePublicSearchBuild({routes:[]},{}));
});
test('Public deployment refuses noindex, wrong canonical or crawl-blocking robots output',()=>{
 for(const field of ['french','english']){let bad=build();bad[field]=bad[field].replace('index, follow','noindex, nofollow');assert.throws(()=>validatePublicSearchBuild(config,bad));bad=build();bad[field]=bad[field].replace('rel="canonical"','rel="wrong"');assert.throws(()=>validatePublicSearchBuild(config,bad));}
 for(const robots of ['User-agent: *\nDisallow: /\nSitemap: '+origin+'/sitemap.xml','User-agent: *\nAllow: /\n'])assert.throws(()=>validatePublicSearchBuild(config,{...build(),robots}));
});

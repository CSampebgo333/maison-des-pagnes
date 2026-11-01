import {useEffect} from 'react';
import {homeMetadata,productMetadata,productPath,pageStructuredData,SHOP_NAME,SITE_NAME} from './product-seo.js';
import {imageVariant} from './images';
import type {Product} from './types';
export function usePageMetadata(product:Product|undefined,language:'fr'|'en',productPage:boolean,ready:boolean){
 useEffect(()=>{
  if(productPage&&!product&&!ready)return;
  const variants=product?Object.fromEntries(product.photos.map(p=>[p.src,imageVariant(p.src)])):{};
  const meta=product?productMetadata(product,variants,language):homeMetadata(language);
  const canonical=document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const origin=canonical?new URL(canonical.href).origin:null;
  document.title=productPage&&!product?(language==='en'?'Pagne unavailable':'Pagne indisponible')+' | '+SHOP_NAME:meta.title;
  function tag(key:string,value:string,property=false){const attr=property?'property':'name';let element=document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);if(!element){element=document.createElement('meta');element.setAttribute(attr,key);document.head.append(element);}element.content=value;}
  tag('description',meta.description);tag('og:title',meta.title,true);tag('og:description',meta.description,true);tag('og:type',meta.type,true);tag('og:site_name',SITE_NAME,true);tag('og:locale',language==='en'?'en_GB':'fr_BF',true);tag('twitter:title',meta.title);tag('twitter:description',meta.description);
  if(productPage&&!product)tag('robots','noindex, follow');
  if(origin&&canonical){
   canonical.href=origin+meta.path;tag('og:url',origin+meta.path,true);tag('og:image',origin+meta.image,true);tag('og:image:secure_url',origin+meta.image,true);tag('og:image:alt',meta.imageAlt,true);tag('twitter:image',origin+meta.image);tag('twitter:image:alt',meta.imageAlt);
   for(const [key,value] of [['og:image:width',meta.imageWidth],['og:image:height',meta.imageHeight],['og:image:type',meta.imageType]] as const){if(value)tag(key,String(value),true);else document.querySelector(`meta[property="${key}"]`)?.remove();}
   for(const link of document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]'))link.href=origin+(product?productPath(product,link.hreflang==='en'?'en':'fr'):link.hreflang==='en'?'/?lang=en':'/');
   let data=document.querySelector<HTMLScriptElement>('#shop-structured-data');if(!data){data=document.createElement('script');data.type='application/ld+json';data.id='shop-structured-data';document.head.append(data);}
   data.textContent=JSON.stringify(pageStructuredData(product,variants,origin,language));
  }
 },[product,language,productPage,ready]);
}

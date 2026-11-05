import type {Product} from './types';
export type Metadata={title:string;description:string;path:string;image:string;imageAlt:string;type:string;imageWidth?:number;imageHeight?:number;imageType?:string};
export const SHOP_NAME:string;
export const SITE_NAME:string;
export const SITE_ALTERNATE_NAMES:string[];
export function websiteStructuredData(origin:string):Record<string,unknown>;
export function publicOrigin(value?:string):string|null;
export function pageLanguage(url:URL):'fr'|'en';
export function productSeoName(product:Product,language?:string):string;
export function productPath(product:Product,language?:string):string;
export function productIdFromPath(path:string):string|null;
export function translatedProduct(product:Product,language?:string):Product;
export function publicProducts(document:{products:Product[]}):Product[];
export function productImage(product:Product,variants?:Record<string,any>):string;
export function collectionPath(language?:string):string;
export function collectionMetadata(language?:string):Metadata;
export function homeMetadata(language?:string):Metadata;
export function productMetadata(product:Product,variants?:Record<string,any>,language?:string):Metadata;
export function structuredProduct(product:Product,variants:Record<string,any>,origin:string,language?:string):Record<string,unknown>;
export function htmlEscape(value:unknown):string;
export function jsonForHtml(value:unknown):string;
export function metadataMarkup(meta:Metadata,origin:string|null,language?:string,product?:Product):string;
export function catalogueSitemap(document:{products:Product[]},origin:string|null):string;

export function pageStructuredData(product:Product|undefined,variants:Record<string,any>,origin:string|null,language?:string,products?:Product[],collectionPage?:boolean):Record<string,unknown>[];

export function photoAlt(product:Product,photo:Product['photos'][number],language?:string):string;

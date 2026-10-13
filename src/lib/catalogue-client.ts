import type { Product } from './types';
import { registerImageVariants } from './images';
export type CatalogueDocument = { products: Product[]; variants: Record<string,{thumbnail:string;scene:string;display:string;width:number;height:number}>; revision: string };
export async function fetchCatalogue(): Promise<CatalogueDocument> {
 const response=await fetch('/api/catalogue',{cache:'no-store'});
 if(!response.ok)throw Error('La collection n’a pas pu être actualisée. Réessayez.');
 const result=await response.json() as CatalogueDocument;
 if(!Array.isArray(result.products)||!result.variants||typeof result.revision!=='string')throw Error('Collection invalide.');
 registerImageVariants(result.variants); return result;
}

import type {Product} from './types';
import seed from '../catalogue.json' with {type:'json'};
import {productOccasions} from './catalogue-features.ts';
import {tr} from './i18n-core.js';
export function localizeProduct(product:Product,language:string):Product{
 const initial=(seed as Product[]).find(p=>p.id===product.id);
 const english=product.translations?.en??(initial?.name===product.name&&initial?.description===product.description?initial.translations?.en:undefined);
 const sourceText=[product.name,product.description,product.pattern,...product.colors,english?.name,english?.description,english?.pattern].filter(Boolean).join(' ');
 return {...product,sourceText,occasions:productOccasions(product),...(language==='en'?{name:english?.name||`Faso Dan Fani ${product.number}`,description:english?.description||'Contact the shop for more information about this design.',pattern:english?.pattern||'',composition:english?.composition||'',dimensions:english?.dimensions||product.dimensions,unit:english?.unit||''}:{}),photos:product.photos.map(photo=>({...photo,label:language==='en'?(tr(photo.label,'en')!==photo.label?tr(photo.label,'en'):`View ${photo.view}`):photo.label}))};
}

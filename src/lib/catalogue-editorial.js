import patches from './catalogue-editorial-data.js';
export const editorialRevision='heritage-seo-2026-11';
// Three-way update: only baseline fields on unchanged photos can be replaced.
// Later administrator edits and actual inventory quantities always win.
export function reviewEditorialUpdate(document){
 if(document.editorialRevisions?.includes(editorialRevision))return {document,changes:[]};
 const changes=[];
 const products=document.products.map(product=>{
  const patch=patches.find(p=>p.id===product.id);if(!patch||JSON.stringify(product.photos.map(p=>p.src))!==JSON.stringify(patch.photos))return product;
  let next={...product};const fields=[];
  if(product.description===patch.before.description&&product.description!==patch.after.description){next.description=patch.after.description;fields.push('description');}
  const english=product.translations?.en;
  if([patch.before.description,patch.after.description].includes(product.description)&&english?.description===patch.before.description_en&&english?.description!==patch.after.description_en){next.translations={...product.translations,en:{...english,description:patch.after.description_en}};fields.push('description_en');}
  if((product.availability??null)===(patch.before.availability??null)&&product.availability!=='available'){next.availability='available';fields.push('availability');}
  if(fields.length)changes.push({id:product.id,fields});return next;
 });
 return {document:{...document,products,editorialRevisions:[...(document.editorialRevisions??[]),editorialRevision]},changes};
}

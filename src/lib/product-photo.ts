import {inspectPhoto,MAX_PHOTO_BYTES} from './custom-photo';
export async function prepareProductPhoto(file: File) {
 // Same verified file formats, size/pixel limits and orientation handling as custom orders.
 if(file.size>MAX_PHOTO_BYTES)throw Error('Choisissez une photo de 6 Mo maximum.');
 const photo=inspectPhoto(new Uint8Array(await file.arrayBuffer()),file.name);
 const rotated=photo.orientation>=5,width=rotated?photo.height:photo.width,height=rotated?photo.width:photo.height,decodeScale=Math.min(1,1000/Math.max(width,height));
 // Decode only the pixels needed by the largest derivative. Keep the original file intact.
 const bitmap=await createImageBitmap(file,{imageOrientation:'from-image',resizeWidth:Math.max(1,Math.round(width*decodeScale)),resizeHeight:Math.max(1,Math.round(height*decodeScale)),resizeQuality:'high'}).catch(()=>{throw Error('Cette photo est endommagée ou illisible. Choisissez une autre image.');});
 const form=new FormData(); form.append('original',file);
 try {
  for(const [role,side,quality,budget] of [['thumbnail',200,.72,100*1024],['scene',650,.78,300*1024],['display',1000,.82,600*1024]] as const){
   const scale=Math.min(1,side/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Ce navigateur ne peut pas préparer les photos.');
   ctx.fillStyle='#fbf8f3';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   let output:Blob|null=null;
   for(let q=quality;q>=.35;q-=.1){output=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',q));if(output&&output.size<=budget)break;}
   canvas.width=canvas.height=1;
   if(!output||output.type!=='image/webp'||output.size>budget)throw Error('La photo ne peut pas être optimisée sur ce navigateur. Essayez un JPEG ou un autre navigateur récent.');
   form.append(role,output,`${role}.webp`);
  }
 } finally {bitmap.close();}
 return form;
}

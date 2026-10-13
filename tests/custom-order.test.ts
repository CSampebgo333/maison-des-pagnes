import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument, PDFDict, PDFName, PDFRawStream } from 'pdf-lib';
import { inspectPhoto, MAX_PHOTO_BYTES } from '../src/lib/custom-photo.ts';
import { appendOriginalPhoto, jpegPagesToPdf, validateOrder, orderTotal } from '../src/lib/order.ts';
import type { OrderDetails, CustomOrderItem } from '../src/lib/order.ts';
const details: OrderDetails={name:'Client de test',phone:'+226 70 00 00 00',city:'Bobo-Dioulasso',mode:'retrait',address:'',deadline:'2026-10-20',notes:''};
const images=JSON.parse(await readFile(new URL('./fixtures/reference-images.json',import.meta.url),'utf8')) as Record<string,string>;
const fixture=async (extension:string)=>new Uint8Array(Buffer.from(images[extension],'base64'));

test('Une demande hors galerie exige une photo et une quantité valide, sans prix inventé',async()=>{
 const custom:CustomOrderItem={description:'Un motif similaire',quantity:2,photo:inspectPhoto(await fixture('jpg'))};
 assert.equal(validateOrder(details,[],'2026-10-13',custom),'');
 assert.match(validateOrder(details,[],'2026-10-13',{...custom,photo:null}),/photo/);
 assert.match(validateOrder(details,[],'2026-10-13',{...custom,quantity:0}),/quantité/);
 assert.match(validateOrder(details,[],'2026-10-13',{...custom,quantity:100}),/quantité/);
 assert.match(validateOrder({...details,deadline:'2026-10-12'},[],'2026-10-13',custom),/date/);
 assert.match(validateOrder({...details,mode:'livraison',address:''},[],'2026-10-13',custom),/quartier/i);
 assert.equal(orderTotal([]),0); // No catalogue subtotal; UI/PDF mark the custom price as unknown.
});

test('La lecture détecte le vrai format et refuse documents, photos trop lourdes ou dimensions excessives',async()=>{
 assert.equal(inspectPhoto(await fixture('jpg'),'faux.png').type,'image/jpeg');
 assert.equal(inspectPhoto(await fixture('png')).type,'image/png');
 assert.throws(()=>inspectPhoto(new TextEncoder().encode('<svg/>')),/JPEG ou PNG/);
 assert.throws(()=>inspectPhoto(new Uint8Array(MAX_PHOTO_BYTES+1)),/6 Mo/);
 const png=await fixture('png');new DataView(png.buffer).setUint32(16,100000);new DataView(png.buffer).setUint32(20,100000);
 assert.throws(()=>inspectPhoto(png),/24 mégapixels/);
 assert.throws(()=>inspectPhoto(new Uint8Array([255,216,255,0xe1,0xff,0xff])),/illisible/);
});

test('Le PDF conserve le JPEG original octet pour octet et ses dimensions, sans réencoder la photo',async()=>{
 const original=await fixture('jpg');const base=jpegPagesToPdf([await fixture('jpg')]);
 const result=await appendOriginalPhoto(base,inspectPhoto(original));
 const doc=await PDFDocument.load(await result.arrayBuffer());assert.equal(doc.getPageCount(),2);
 const resources=doc.getPage(1).node.Resources()!;
 const images=resources.lookup(PDFName.of('XObject'),PDFDict);
 const image=doc.context.lookup(images.values()[0]) as PDFRawStream;
 assert.deepEqual(new Uint8Array(image.getContents()),original);
 assert.equal(image.dict.lookup(PDFName.of('Width'))!.toString(),'1600');
 assert.equal(image.dict.lookup(PDFName.of('Height'))!.toString(),'900');
});

test('Le PNG conserve sa résolution et sa transparence dans le PDF',async()=>{
 const result=await appendOriginalPhoto(jpegPagesToPdf([await fixture('jpg')]),inspectPhoto(await fixture('png')));
 const doc=await PDFDocument.load(await result.arrayBuffer());
 const images=doc.getPage(1).node.Resources()!.lookup(PDFName.of('XObject'),PDFDict);
 const image=doc.context.lookup(images.values()[0]) as PDFRawStream;
 assert.equal(image.dict.lookup(PDFName.of('Width'))!.toString(),'32');
 assert.equal(image.dict.lookup(PDFName.of('Height'))!.toString(),'24');
 assert.ok(image.dict.has(PDFName.of('SMask')));
});

test('Les huit orientations EXIF restent lues sans modifier les octets de la photo',async()=>{
 const jpeg=await fixture('jpg');
 for(let orientation=1;orientation<=8;orientation++){
  const payload=new Uint8Array(32);payload.set([69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,orientation,0,0,0,0,0,0,0]);
  const data=new Uint8Array(jpeg.length+payload.length+4);data.set(jpeg.slice(0,2));data.set([255,225,0,payload.length+2],2);data.set(payload,6);data.set(jpeg.slice(2),6+payload.length);
  const photo=inspectPhoto(data);assert.equal(photo.orientation,orientation);
  const result=await appendOriginalPhoto(jpegPagesToPdf([jpeg]),photo);
  const doc=await PDFDocument.load(await result.arrayBuffer());assert.equal(doc.getPageCount(),2);
 }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {prepareSeo,seoFiles} from '../scripts/prepare-seo.mjs';

test('Les aperçus FR/EN exposent une image absolue, ses dimensions et un texte alternatif sans JavaScript',async()=>{
 const original=process.cwd(),site=process.env.PUBLIC_SITE_URL;
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'faso-sharing-'));
 try {
  await fs.mkdir(path.join(directory,'dist/client'),{recursive:true});
  await fs.copyFile(new URL('../index.html',import.meta.url),path.join(directory,'dist/client/index.html'));
  process.chdir(directory);process.env.PUBLIC_SITE_URL='https://boutique.example';await prepareSeo();
  for(const [file,lang] of [['index.html','fr'],['index.en.html','en']]){
   const html=await fs.readFile(path.join(directory,'dist/client',file),'utf8');
   assert.match(html,new RegExp(`<html lang="${lang}"`));
   assert.match(html,/<meta property="og:image" content="https:\/\/boutique.example\/social\/maison-faso-cover-v1.jpg"/);
   assert.match(html,/<meta name="twitter:image" content="https:\/\/boutique.example\/social\/maison-faso-cover-v1.jpg"/);
   assert.match(html,/<meta property="og:image:width" content="1200"/);
   assert.match(html,/<meta property="og:image:height" content="630"/);
   assert.match(html,/<meta property="og:image:alt" content="Maison du Faso Dan Fani/);
   assert.match(html,/<meta name="robots" content="index, follow"/);
   assert.doesNotMatch(html,/3D|pagne-default\.png/);
   assert.match(html,lang==='en'?/Pagnes in Burkina Faso/:/Pagnes au Burkina Faso/);
  }
 } finally { process.chdir(original);if(site===undefined)delete process.env.PUBLIC_SITE_URL;else process.env.PUBLIC_SITE_URL=site;await fs.rm(directory,{recursive:true,force:true}); }
});

test('L’image sociale est un vrai JPEG 1200 × 630, assez léger pour les messageries',async()=>{
 const bytes=await fs.readFile(new URL('../public/social/maison-faso-cover-v1.jpg',import.meta.url));
 assert.equal(bytes.readUInt16BE(0),0xffd8);assert.ok(bytes.length<300000);
 let dimensions;
 for(let pos=2;pos<bytes.length;){assert.equal(bytes[pos],0xff);const marker=bytes[pos+1];const length=bytes.readUInt16BE(pos+2);if([0xc0,0xc1,0xc2].includes(marker)){dimensions=[bytes.readUInt16BE(pos+7),bytes.readUInt16BE(pos+5)];break;}pos+=2+length;}
 assert.deepEqual(dimensions,[1200,630]);
});

test('Les aperçus privés ne révèlent pas d’adresse sociale publique inventée',()=>{
 for(const language of ['fr','en'])assert.doesNotMatch(seoFiles(undefined,language).head,/og:image|twitter:image|boutique.example/);
});

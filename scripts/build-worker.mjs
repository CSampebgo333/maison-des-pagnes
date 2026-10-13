import { prepareSeo } from './prepare-seo.mjs';
import fs from 'node:fs/promises';
for (const name of await fs.readdir('dist')) { if (!['client','server','.openai'].includes(name)) await fs.rm('dist/'+name,{recursive:true,force:true}); }
await fs.mkdir('dist/server',{recursive:true});
await fs.mkdir('dist/.openai',{recursive:true});
await fs.copyFile('src/lib/pdf-service.js','dist/server/index.js');
await fs.copyFile('src/lib/catalogue-service.js','dist/server/catalogue-service.js');
const products=JSON.parse(await fs.readFile('src/catalogue.json','utf8'));
const variants=JSON.parse(await fs.readFile('src/image-manifest.json','utf8'));
await fs.writeFile('dist/server/catalogue-seed.js','export default '+JSON.stringify({products,variants,revision:'initial'})+';\n');
const hosting=await fs.readFile('.openai/hosting.json','utf8').catch(()=>JSON.stringify({d1:null,r2:'BUCKET'}));
await fs.writeFile('dist/.openai/hosting.json',hosting);
await fs.writeFile('dist/server/wrangler.json',JSON.stringify({name:'maison-des-pagnes',main:'index.js',compatibility_date:'2026-10-13',assets:{directory:'../client',binding:'ASSETS',run_worker_first:true},r2_buckets:[{binding:'BUCKET',bucket_name:'site-orders'}]},null,2));

await prepareSeo();

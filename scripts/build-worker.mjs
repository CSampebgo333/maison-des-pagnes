import { prepareSeo } from './prepare-seo.mjs';
import fs from 'node:fs/promises';
for (const name of await fs.readdir('dist')) { if (!['client','server','.openai'].includes(name)) await fs.rm('dist/'+name,{recursive:true,force:true}); }
await fs.mkdir('dist/server',{recursive:true});
await fs.mkdir('dist/.openai',{recursive:true});
await fs.copyFile('src/lib/pdf-service.js','dist/server/index.js');
for(const file of ['catalogue-service.js','orders-service.js','order-management.js','admin-auth.js','initial-stock.js','security.js','backups.js','i18n-core.js'])await fs.copyFile('src/lib/'+file,'dist/server/'+file);
await fs.mkdir('dist/locales',{recursive:true});
await fs.writeFile('dist/locales/en.js','export default '+await fs.readFile('src/locales/en.json','utf8')+';\n');
for (const name of ['index.js','orders-service.js']) {
  const path='dist/server/'+name;
  const code=await fs.readFile(path,'utf8');
  await fs.writeFile(path,code.replace("'../locales/en.json' with {type:'json'}","'../locales/en.js'"));
}
await fs.cp('drizzle','dist/.openai/drizzle',{recursive:true});
const products=JSON.parse(await fs.readFile('src/catalogue.json','utf8'));
const variants=JSON.parse(await fs.readFile('src/image-manifest.json','utf8'));
await fs.writeFile('dist/server/catalogue-seed.js','export default '+JSON.stringify({products,variants,revision:'initial'})+';\n');
const hosting=await fs.readFile('.openai/hosting.json','utf8').catch(()=>JSON.stringify({d1:null,r2:'BUCKET'}));
await fs.writeFile('dist/.openai/hosting.json',hosting);
await fs.writeFile('dist/server/wrangler.json',JSON.stringify({name:'maison-des-pagnes',main:'index.js',compatibility_date:'2026-10-13',assets:{directory:'../client',binding:'ASSETS',run_worker_first:true},d1_databases:[{binding:'DB',database_name:'maison-faso',database_id:process.env.CLOUDFLARE_D1_ID??'local-placeholder',migrations_dir:'../../drizzle'}],r2_buckets:[{binding:'BUCKET',bucket_name:'site-orders'}]},null,2));

await prepareSeo();

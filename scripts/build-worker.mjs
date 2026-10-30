import { prepareSeo } from './prepare-seo.mjs';
import fs from 'node:fs/promises';
for (const name of await fs.readdir('dist')) { if (!['client','server','.openai'].includes(name)) await fs.rm('dist/'+name,{recursive:true,force:true}); }
await fs.mkdir('dist/server',{recursive:true});
await fs.mkdir('dist/.openai',{recursive:true});
await fs.copyFile('src/lib/pdf-service.js','dist/server/index.js');
for(const file of ['catalogue-service.js','orders-service.js','order-management.js','admin-auth.js','initial-stock.js','security.js','backups.js','i18n-core.js','whatsapp.js'])await fs.copyFile('src/lib/'+file,'dist/server/'+file);
await fs.mkdir('dist/locales',{recursive:true});
await fs.writeFile('dist/server/english.js','export default '+await fs.readFile('src/locales/en.json','utf8')+';\n');
for (const name of ['index.js','orders-service.js']) {
  const path='dist/server/'+name;
  const code=await fs.readFile(path,'utf8');
  await fs.writeFile(path,code.replace("'../locales/en.json' with {type:'json'}","'./english.js'"));
}
await fs.cp('drizzle','dist/.openai/drizzle',{recursive:true});
const products=JSON.parse(await fs.readFile('src/catalogue.json','utf8'));
const variants=JSON.parse(await fs.readFile('src/image-manifest.json','utf8'));
await fs.writeFile('dist/server/catalogue-seed.js','export default '+JSON.stringify({products,variants,revision:'initial'})+';\n');
const hosting=await fs.readFile('.openai/hosting.json','utf8').catch(()=>JSON.stringify({d1:null,r2:'BUCKET'}));
await fs.writeFile('dist/.openai/hosting.json',hosting);
// Keep the tracked production configuration as the source for generated output.
// Paths are relative to each config file, so relocate them for dist/server.
const workerConfig=JSON.parse(await fs.readFile('wrangler.jsonc','utf8'));
workerConfig.main='index.js';
workerConfig.assets.directory='../client';
workerConfig.d1_databases[0].migrations_dir='../../drizzle';
workerConfig.d1_databases[0].database_id=process.env.CLOUDFLARE_D1_ID??workerConfig.d1_databases[0].database_id;
for (const key of ['CATALOGUE_ADMIN_EMAIL','ACCESS_ISSUER','ACCESS_AUD','WHATSAPP_ENABLED','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_API_VERSION','WHATSAPP_TEMPLATE_FR','WHATSAPP_TEMPLATE_EN']) {
  if(process.env[key])workerConfig.vars[key]=process.env[key];
}
await fs.writeFile('dist/server/wrangler.json',JSON.stringify(workerConfig,null,2)+'\n');

await prepareSeo();

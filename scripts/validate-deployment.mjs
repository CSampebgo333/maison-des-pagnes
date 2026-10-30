import fs from 'node:fs/promises';
const config=JSON.parse(await fs.readFile('dist/server/wrangler.json','utf8'));
const id=config.d1_databases?.[0]?.database_id;
const vars=config.vars??{};
const values=[id,vars.CATALOGUE_ADMIN_EMAIL,vars.ACCESS_ISSUER,vars.ACCESS_AUD];
if(values.some(value=>typeof value!=='string'||!value||value.includes('REPLACE')) ||
 !/^[a-f0-9-]{36}$/.test(id) || !vars.CATALOGUE_ADMIN_EMAIL.includes('@') ||
 !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(vars.ACCESS_ISSUER) ||
 !/^[a-f0-9]{64}$/.test(vars.ACCESS_AUD) || vars.AUTH_MODE!=='cloudflare' || config.preview_urls!==false){
 throw new Error('Deployment settings are missing or invalid. Set CLOUDFLARE_D1_ID, CATALOGUE_ADMIN_EMAIL, ACCESS_ISSUER and ACCESS_AUD in the build environment.');
}
console.log('Deployment configuration validated.');

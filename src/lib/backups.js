import {isAdmin} from './admin-auth.js';
const TABLES=['catalogue_documents','inventory','orders','order_lines','order_events','order_notifications'];
const encoder=new TextEncoder();
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Robots-Tag':'noindex'}});
export async function createBackup(env,now=new Date()){
 if(!env.DB||!env.BUCKET)throw Error('Stockage de sauvegarde indisponible.');
 // One batch gives a coherent database snapshot. Never publish a truncated backup.
 const results=await env.DB.batch(TABLES.map(table=>env.DB.prepare(`SELECT * FROM ${table} LIMIT 10001`)));
 if(results.some(r=>r.results.length>10000))throw Error('La base dépasse la limite de sauvegarde intégrée : utiliser l’export D1 natif.');
 const tables=Object.fromEntries(TABLES.map((name,i)=>[name,results[i].results]));
 const data=encoder.encode(JSON.stringify({format:1,createdAt:now.toISOString(),tables}));
 if(data.length>20*1024*1024)throw Error('Sauvegarde trop volumineuse : utiliser l’export D1 natif.');
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(n=>n.toString(16).padStart(2,'0')).join('');
 const prefix='backups/'+now.toISOString().slice(0,10)+'/'+crypto.randomUUID(),key=prefix+'/database.json';
 await env.BUCKET.put(key,data,{httpMetadata:{contentType:'application/json'}});
 const check=await env.BUCKET.get(key);if(!check)throw Error('La sauvegarde n’a pas pu être relue.');
 const stored=new Uint8Array(await check.arrayBuffer());const verify=[...new Uint8Array(await crypto.subtle.digest('SHA-256',stored))].map(n=>n.toString(16).padStart(2,'0')).join('');if(verify!==digest)throw Error('La vérification de la sauvegarde a échoué.');
 // Immutable original uploads are copied separately, including every page of the listing.
 let cursor,files=0;const objects=[];
 for(const sourcePrefix of ['catalogue-assets/','catalogue/photos/','managed-orders/']){
  do{const page=await env.BUCKET.list({prefix:sourcePrefix,limit:100,cursor});for(const item of page.objects){
   if(files>=400)throw Error('Trop de fichiers pour la sauvegarde intégrée.');
   const object=await env.BUCKET.get(item.key);if(!object)throw Error('Un fichier de la sauvegarde a disparu.');
   const backupKey=prefix+'/files/'+item.key;await env.BUCKET.put(backupKey,object.body,{httpMetadata:object.httpMetadata});objects.push({key:item.key,backupKey,size:item.size,etag:item.etag});files++;
  }cursor=page.truncated?page.cursor:undefined;}while(cursor);
 }
 const summary={format:1,key,prefix,createdAt:now.toISOString(),bytes:data.length,sha256:digest,rows:Object.fromEntries(TABLES.map(name=>[name,tables[name].length])),files,objects};
 await env.BUCKET.put(prefix+'/manifest.json',JSON.stringify(summary),{httpMetadata:{contentType:'application/json'}});
 // Updated only after database verification AND all referenced file copies succeed.
 await env.BUCKET.put('backups/latest.json',JSON.stringify({...summary,objects:undefined}),{httpMetadata:{contentType:'application/json'}});
 await env.BUCKET.delete('backups/last-error.json');return {...summary,objects:undefined};
}
export async function scheduledBackup(env){
 try{
  const result=await createBackup(env);
  await env.DB.prepare('DELETE FROM request_limits WHERE expires_at<?').bind(Math.floor(Date.now()/1000)).run();
  // Keep 14 days. Incomplete runs are also cleaned up; preserve the latest valid snapshot.
  const cutoff=Date.now()-14*86400000;let cursor;
  do{const page=await env.BUCKET.list({prefix:'backups/',limit:100,cursor});const remove=page.objects.filter(o=>/^backups\/\d{4}-\d{2}-\d{2}\//.test(o.key)&&Date.parse(o.key.slice(8,18))<cutoff&& !o.key.startsWith(result.prefix+'/')).map(o=>o.key);if(remove.length)await env.BUCKET.delete(remove);cursor=page.truncated?page.cursor:undefined;}while(cursor);
  return result;
 }catch(error){await env.BUCKET?.put('backups/last-error.json',JSON.stringify({failedAt:new Date().toISOString(),message:error instanceof Error?error.message:'Échec de sauvegarde'}));throw error;}
}
export async function backupRoute(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/admin/backups'))return null;
 if(!await isAdmin(request,env))return json({error:'Accès réservé à la gestion.'},403);
 if(!env.BUCKET)return json({error:'Stockage indisponible.'},503);
 if(url.pathname==='/api/admin/backups'&&request.method==='GET'){
  const latest=await env.BUCKET.get('backups/latest.json'),failure=await env.BUCKET.get('backups/last-error.json');return json({latest:latest?await latest.json():null,error:failure?await failure.json():null,schedule:env.BACKUP_CRON_ENABLED==='1'?'Tous les jours à 03:00 UTC':'Planification non activée sur cet hébergement'});
 }
 if(url.pathname==='/api/admin/backups'&&request.method==='POST'){
  if(request.headers.get('Origin')!==url.origin)return json({error:'Origine non autorisée.'},403);
  try{return json(await scheduledBackup(env),201);}catch{return json({error:'La sauvegarde n’a pas abouti. Consultez son état et réessayez.'},503);}
 }
 if(url.pathname==='/api/admin/backups/download'&&request.method==='GET'){
  const pointer=await env.BUCKET.get('backups/latest.json');if(!pointer)return json({error:'Aucune sauvegarde disponible.'},404);const latest=await pointer.json(),data=await env.BUCKET.get(latest.key);if(!data)return json({error:'Sauvegarde introuvable.'},404);return new Response(data.body,{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="sauvegarde-boutique.json"','Cache-Control':'private, no-store'}});
 }
 return json({error:'Action introuvable.'},404);
}

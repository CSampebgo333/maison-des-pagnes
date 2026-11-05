import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile,rm,stat,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ordersRoute} from '../src/lib/orders-service.js';
import {createBackup,scheduledBackup} from '../src/lib/backups.js';
import {testRuntime,request,orderBody} from './helpers/runtime.mjs';
import {verifyBackup} from '../scripts/verify-backup.mjs';
const verifier=fileURLToPath(new URL('../scripts/verify-backup.mjs',import.meta.url));
test('A real current backup restores files, private costs and opted-in orders without duplicate alerts',async t=>{
 const e={...testRuntime(),WHATSAPP_ENABLED:'1',WHATSAPP_ADMIN_ENABLED:'1',WHATSAPP_ACCESS_TOKEN:'test-only',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_API_VERSION:'v99.0',WHATSAPP_TEMPLATE_FR:'test_fr',WHATSAPP_TEMPLATE_EN:'test_en'};t.after(()=>e.DB.sql.close());
 const b=orderBody({whatsappOptIn:true}),response=await ordersRoute(request('/api/orders','POST',b),e);assert.equal(response.status,201);const o=await response.json();
 e.DB.sql.prepare('INSERT INTO order_costs(order_id,production_cost,delivery_cost,other_cost,note,updated_at) VALUES(?,8000,1000,0,?,?)').run(o.id,'Private test cost',new Date().toISOString());
 e.DB.sql.prepare("UPDATE order_notifications SET state='sending' WHERE order_id=?").run(o.id);
 await e.BUCKET.put('managed-orders/'+o.id+'/pdf','test document');await e.BUCKET.put('catalogue-assets/example.png','test photo');
 const special="Tissage émeraude — l'atelier\nالقطن\0fin";e.DB.sql.prepare('UPDATE order_costs SET note=?').run(special);
 const result=await createBackup(e);assert.equal(result.filesVerified,true);assert.equal(result.rows.order_costs,1);
 const folder=await mkdtemp(join(tmpdir(),'faso-restore-'));t.after(()=>rm(folder,{recursive:true,force:true}));const database=join(folder,'database.json'),manifest=join(folder,'manifest.json'),sql=join(folder,'restore.sql');
 await writeFile(database,(await e.BUCKET.get(result.key)).bytes);await writeFile(manifest,(await e.BUCKET.get(result.prefix+'/manifest.json')).bytes);
 for(const [key,entry] of e.BUCKET.records)if(key.startsWith(result.prefix+'/files/')){const path=join(folder,key);await mkdir(dirname(path),{recursive:true});await writeFile(path,entry.bytes);}
 const run=spawnSync(process.execPath,[verifier,database,'--manifest',manifest,'--files-root',folder,'--sql-output',sql],{encoding:'utf8',env:{...process.env,PATH:folder}});assert.equal(run.status,0,run.stderr+run.stdout);assert.match(run.stdout,/Files verified: 2/);
 const restored=new DatabaseSync(':memory:');t.after(()=>restored.close());restored.exec('PRAGMA foreign_keys=ON');restored.exec(await readFile(sql,'utf8'));
 assert.equal(restored.prepare('SELECT count(*) n FROM orders').get().n,1);
 assert.equal(restored.prepare('SELECT count(*) n FROM order_notifications').get().n,1);
 assert.equal(restored.prepare('SELECT count(*) n FROM order_costs').get().n,1);
 assert.equal(restored.prepare('SELECT state FROM order_notifications').get().state,'uncertain');
 assert.equal(restored.prepare('SELECT state FROM owner_notifications').get().state,'uncertain');
 assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
 assert.deepEqual(restored.prepare('PRAGMA foreign_key_check').all(),[]);
 assert.equal((await stat(sql)).mode&0o777,0o600);
 assert.equal(restored.prepare('SELECT note FROM order_costs').get().note,special);
 const next=restored.prepare("INSERT INTO order_events(order_id,created_at,actor,summary) VALUES(?,?,?,?)").run(o.id,new Date().toISOString(),'test','After restoration').lastInsertRowid;assert.ok(Number(next)>0);
 const m=JSON.parse(await readFile(manifest,'utf8'));await writeFile(join(folder,m.objects[0].backupKey),'damaged');const damaged=spawnSync(process.execPath,[verifier,database,'--manifest',manifest,'--files-root',folder],{encoding:'utf8'});assert.notEqual(damaged.status,0);
 const twice=spawnSync(process.execPath,[verifier,database,'--sql-output',sql],{encoding:'utf8'});assert.notEqual(twice.status,0);assert.match(twice.stderr,/exists/);
});
test('Legacy five-table backups remain verifiable, while unknown or missing tables are refused',async t=>{
 const folder=await mkdtemp(join(tmpdir(),'faso-legacy-'));t.after(()=>rm(folder,{recursive:true,force:true}));const path=join(folder,'backup.json');const tables=Object.fromEntries(['catalogue_documents','inventory','orders','order_lines','order_events'].map(k=>[k,[]]));
 await writeFile(path,JSON.stringify({format:1,tables}));assert.equal(spawnSync(process.execPath,[verifier,path]).status,0);
 await writeFile(path,JSON.stringify({format:1,tables:{...tables,unknown:[]}}));assert.notEqual(spawnSync(process.execPath,[verifier,path]).status,0);
 delete tables.orders;await writeFile(path,JSON.stringify({format:1,tables}));assert.notEqual(spawnSync(process.execPath,[verifier,path]).status,0);
});
test('A corrupted copied file never replaces the latest verified backup',async t=>{
 const e=testRuntime();t.after(()=>e.DB.sql.close());const good=await createBackup(e);await e.BUCKET.put('catalogue-assets/photo.png','original');const get=e.BUCKET.get.bind(e.BUCKET);
 e.BUCKET.get=async key=>{const o=await get(key);if(o&&key.includes('/files/'))o.arrayBuffer=async()=>new TextEncoder().encode('corrupt').buffer;return o;};await assert.rejects(scheduledBackup(e),/vérifiée/);assert.equal((await (await get('backups/latest.json')).json()).prefix,good.prefix);
});

test('The portable verifier rejects inconsistent manifests, unsafe paths and invalid database records',async t=>{
 const folder=await mkdtemp(join(tmpdir(),'faso-invalid-'));t.after(()=>rm(folder,{recursive:true,force:true}));
 const backup=join(folder,'backup.json'),manifest=join(folder,'manifest.json'),filesRoot=join(folder,'files');await mkdir(filesRoot);
 const tables=Object.fromEntries(['catalogue_documents','inventory','orders','order_lines','order_events'].map(name=>[name,[]]));
 const raw=JSON.stringify({format:1,tables});await writeFile(backup,raw);
 const good={sha256:createHash('sha256').update(raw).digest('hex'),bytes:Buffer.byteLength(raw),rows:Object.fromEntries(Object.keys(tables).map(name=>[name,0])),files:0,objects:[]};
 const run=()=>verifyBackup({backup,manifest,filesRoot});
 for(const patch of [{sha256:'0'.repeat(64)},{bytes:1},{rows:{...good.rows,orders:1}},{files:1}]){
  await writeFile(manifest,JSON.stringify({...good,...patch}));assert.throws(run);
 }
 const data=Buffer.from('test photo'),outside=join(folder,'outside.jpg');await writeFile(outside,data);await symlink(outside,join(filesRoot,'link.jpg'));
 const entry={size:data.length,sha256:createHash('sha256').update(data).digest('hex')};
 for(const backupKey of ['../outside.jpg',outside,'link.jpg','folder\\outside.jpg']){
  await writeFile(manifest,JSON.stringify({...good,files:1,objects:[{...entry,backupKey}]}));assert.throws(run);
 }
 for(const inventory of [[{unexpected:'column'}],null,{},new Array(10001).fill({product_id:'test',quantity:1})]){
  await writeFile(backup,JSON.stringify({format:1,tables:{...tables,inventory}}));assert.throws(()=>verifyBackup({backup}));
 }
 await writeFile(backup,JSON.stringify({format:1,tables:{...tables,order_lines:[{order_id:'missing',product_id:'pagne',quantity:1}]}}));
 assert.throws(()=>verifyBackup({backup}),/FOREIGN KEY/);
});


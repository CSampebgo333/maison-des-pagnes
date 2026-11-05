import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ordersRoute} from '../src/lib/orders-service.js';
import {createBackup,scheduledBackup} from '../src/lib/backups.js';
import {testRuntime,request,orderBody} from './helpers/runtime.mjs';
const verifier=new URL('../scripts/verify-backup.py',import.meta.url).pathname;
test('A real current backup restores files, private costs and opted-in orders without duplicate alerts',async t=>{
 const e={...testRuntime(),WHATSAPP_ENABLED:'1',WHATSAPP_ADMIN_ENABLED:'1',WHATSAPP_ACCESS_TOKEN:'test-only',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_API_VERSION:'v99.0',WHATSAPP_TEMPLATE_FR:'test_fr',WHATSAPP_TEMPLATE_EN:'test_en'};t.after(()=>e.DB.sql.close());
 const b=orderBody({whatsappOptIn:true}),response=await ordersRoute(request('/api/orders','POST',b),e);assert.equal(response.status,201);const o=await response.json();
 e.DB.sql.prepare('INSERT INTO order_costs(order_id,production_cost,delivery_cost,other_cost,note,updated_at) VALUES(?,8000,1000,0,?,?)').run(o.id,'Private test cost',new Date().toISOString());
 e.DB.sql.prepare("UPDATE order_notifications SET state='sending' WHERE order_id=?").run(o.id);
 await e.BUCKET.put('managed-orders/'+o.id+'/pdf','test document');await e.BUCKET.put('catalogue-assets/example.png','test photo');
 const result=await createBackup(e);assert.equal(result.filesVerified,true);assert.equal(result.rows.order_costs,1);
 const folder=await mkdtemp(join(tmpdir(),'faso-restore-'));t.after(()=>rm(folder,{recursive:true,force:true}));const database=join(folder,'database.json'),manifest=join(folder,'manifest.json'),sql=join(folder,'restore.sql');
 await writeFile(database,(await e.BUCKET.get(result.key)).bytes);await writeFile(manifest,(await e.BUCKET.get(result.prefix+'/manifest.json')).bytes);
 for(const [key,entry] of e.BUCKET.records)if(key.startsWith(result.prefix+'/files/')){const path=join(folder,key);await mkdir(dirname(path),{recursive:true});await writeFile(path,entry.bytes);}
 const run=spawnSync('python3',[verifier,database,'--manifest',manifest,'--files-root',folder,'--sql-output',sql],{encoding:'utf8'});assert.equal(run.status,0,run.stderr+run.stdout);assert.match(run.stdout,/Files verified: 2/);
 const restored=spawnSync('python3',['-c',`import sqlite3,sys,json
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON');c.executescript(open(sys.argv[1]).read());print(json.dumps({'orders':c.execute('SELECT count(*) FROM orders').fetchone()[0],'notifications':c.execute('SELECT count(*) FROM order_notifications').fetchone()[0],'costs':c.execute('SELECT count(*) FROM order_costs').fetchone()[0],'state':c.execute('SELECT state FROM order_notifications').fetchone()[0],'owner':c.execute('SELECT state FROM owner_notifications').fetchone()[0],'integrity':c.execute('PRAGMA integrity_check').fetchone()[0],'fk':c.execute('PRAGMA foreign_key_check').fetchall()}))`,sql],{encoding:'utf8'});
 assert.equal(restored.status,0,restored.stderr);assert.deepEqual(JSON.parse(restored.stdout),{orders:1,notifications:1,costs:1,state:'uncertain',owner:'uncertain',integrity:'ok',fk:[]});
 const m=JSON.parse(await readFile(manifest,'utf8'));await writeFile(join(folder,m.objects[0].backupKey),'damaged');const damaged=spawnSync('python3',[verifier,database,'--manifest',manifest,'--files-root',folder],{encoding:'utf8'});assert.notEqual(damaged.status,0);
 const twice=spawnSync('python3',[verifier,database,'--sql-output',sql],{encoding:'utf8'});assert.notEqual(twice.status,0);assert.match(twice.stderr,/exists/);
});
test('Legacy five-table backups remain verifiable, while unknown or missing tables are refused',async t=>{
 const folder=await mkdtemp(join(tmpdir(),'faso-legacy-'));t.after(()=>rm(folder,{recursive:true,force:true}));const path=join(folder,'backup.json');const tables=Object.fromEntries(['catalogue_documents','inventory','orders','order_lines','order_events'].map(k=>[k,[]]));
 await writeFile(path,JSON.stringify({format:1,tables}));assert.equal(spawnSync('python3',[verifier,path]).status,0);
 await writeFile(path,JSON.stringify({format:1,tables:{...tables,unknown:[]}}));assert.notEqual(spawnSync('python3',[verifier,path]).status,0);
 delete tables.orders;await writeFile(path,JSON.stringify({format:1,tables}));assert.notEqual(spawnSync('python3',[verifier,path]).status,0);
});
test('A corrupted copied file never replaces the latest verified backup',async t=>{
 const e=testRuntime();t.after(()=>e.DB.sql.close());const good=await createBackup(e);await e.BUCKET.put('catalogue-assets/photo.png','original');const get=e.BUCKET.get.bind(e.BUCKET);
 e.BUCKET.get=async key=>{const o=await get(key);if(o&&key.includes('/files/'))o.arrayBuffer=async()=>new TextEncoder().encode('corrupt').buffer;return o;};await assert.rejects(scheduledBackup(e),/vérifiée/);assert.equal((await (await get('backups/latest.json')).json()).prefix,good.prefix);
});

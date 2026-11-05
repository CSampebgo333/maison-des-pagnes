/** Verify and export a backup into a NEW isolated database, never production. */
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,realpathSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';

const BASE=['catalogue_documents','inventory','orders','order_lines','order_events'];
const OPTIONAL=['order_notifications','owner_notifications','order_costs'];
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const MAX_BYTES=20*1024*1024;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const quote=name=>'"'+name.replaceAll('"','""')+'"';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error(message);};

function sqlValue(value){
 if(value===null)return 'NULL';
 // Hex-encoded UTF-8 also preserves quotes, newlines and embedded NULs.
 if(typeof value==='string')return "CAST(X'"+Buffer.from(value,'utf8').toString('hex')+"' AS TEXT)";
 if(typeof value==='number'&&Number.isFinite(value))return String(value);
 if(typeof value==='bigint')return String(value);
 return fail('Unsupported SQL value');
}

function exportSql(db){
 const schema=db.prepare("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid").all();
 const statements=['-- Import into a NEW empty database only. Review WhatsApp outboxes before enabling sends.','BEGIN TRANSACTION;','PRAGMA defer_foreign_keys=ON;'];
 statements.push(...schema.filter(row=>row.type==='table').map(row=>row.sql+';'));
 // All parents are loaded before their children, and triggers are added last.
 for(const table of [...BASE,...OPTIONAL]){
  const columns=db.prepare('PRAGMA table_info('+quote(table)+')').all().map(row=>row.name);
  const rows=db.prepare('SELECT * FROM '+quote(table));rows.setReadBigInts(true);
  for(const row of rows.iterate())statements.push('INSERT INTO '+quote(table)+' ('+columns.map(quote).join(',')+') VALUES ('+columns.map(name=>sqlValue(row[name])).join(',')+');');
 }
 if(db.prepare("SELECT 1 FROM sqlite_master WHERE name='sqlite_sequence'").get()){
  statements.push('DELETE FROM sqlite_sequence;');
  const sequence=db.prepare('SELECT name,seq FROM sqlite_sequence');sequence.setReadBigInts(true);
  for(const row of sequence.all())statements.push('INSERT INTO sqlite_sequence(name,seq) VALUES ('+sqlValue(row.name)+','+sqlValue(row.seq)+');');
 }
 statements.push(...schema.filter(row=>row.type==='index'||row.type==='trigger').map(row=>row.sql+';'),'COMMIT;');
 return statements.join('\n')+'\n';
}

export function verifyBackup({backup,manifest:manifestPath,filesRoot,sqlOutput}){
 if(statSync(backup).size>MAX_BYTES)fail('Backup exceeds the supported verification limit');
 const raw=readFileSync(backup);
 if(raw.length>MAX_BYTES)fail('Backup exceeds the supported verification limit');
 const document=JSON.parse(raw.toString('utf8')),tables=document?.tables;
 if(document?.format!==1||!object(tables)||!BASE.every(name=>Object.hasOwn(tables,name))||Object.keys(tables).some(name=>![...BASE,...OPTIONAL].includes(name)))fail('Unsupported or incomplete backup');
 for(const rows of Object.values(tables))if(!Array.isArray(rows)||rows.length>10000)fail('Invalid table');
 const manifest=manifestPath?JSON.parse(readFileSync(manifestPath,'utf8')):null;
 if(filesRoot&&!manifest)fail('--files-root requires --manifest');
 if(manifest){
  if(manifest.sha256!==hash(raw)||manifest.bytes!==raw.length)fail('Database checksum or length does not match the manifest');
  if(!object(manifest.rows)||Object.keys(manifest.rows).length!==Object.keys(tables).length||Object.entries(tables).some(([name,rows])=>manifest.rows[name]!==rows.length))fail('Manifest table counts do not match the database');
  if(!Array.isArray(manifest.objects)||manifest.files!==manifest.objects.length)fail('Incomplete file manifest');
 }
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('PRAGMA foreign_keys=ON');
  for(const migration of readdirSync(join(ROOT,'drizzle')).filter(name=>name.endsWith('.sql')).sort())db.exec(readFileSync(join(ROOT,'drizzle',migration),'utf8'));
  // Loading opted-in orders must not enqueue new notification events.
  const triggers=db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger'").all();
  for(const trigger of triggers)db.exec('DROP TRIGGER '+quote(trigger.name));
  db.exec('BEGIN');
  for(const table of [...BASE,...OPTIONAL]){
   const rows=tables[table]??[],columns=new Set(db.prepare('PRAGMA table_info('+quote(table)+')').all().map(row=>row.name));
   for(const row of rows){
    if(!object(row)||Object.keys(row).length===0||Object.keys(row).some(name=>!columns.has(name)))fail('Invalid columns');
    const names=Object.keys(row),values=names.map(name=>{
     const value=row[name];
     if(typeof value==='boolean')return Number(value);
     if(value===null||typeof value==='string'||typeof value==='number'&&Number.isFinite(value))return value;
     return fail('Invalid column value');
    });
    db.prepare('INSERT INTO '+quote(table)+' ('+names.map(quote).join(',')+') VALUES ('+names.map(()=>'?').join(',')+')').run(...values);
   }
   if(db.prepare('SELECT count(*) AS n FROM '+quote(table)).get().n!==rows.length)fail('Restored record count mismatch');
  }
  for(const trigger of triggers)db.exec(trigger.sql);
  db.exec('COMMIT');
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)fail('Backup failed integrity verification');
  let checkedFiles=0;
  if(filesRoot){
   const root=realpathSync(filesRoot);
   for(const item of manifest.objects){
    const key=item?.backupKey;
    if(typeof key!=='string'||!key||key.includes('\\')||isAbsolute(key))fail('Invalid backup file path');
    const path=realpathSync(resolve(root,key)),within=relative(root,path);
    if(within==='..'||within.startsWith('..'+sep)||isAbsolute(within)||!statSync(path).isFile())fail('A backup file is missing or outside the selected directory');
    if(statSync(path).size!==item.size)fail('A backup file has an invalid length');
    if(typeof item.sha256!=='string'||!/^[a-f0-9]{64}$/.test(item.sha256))fail('Full file verification requires a recent manifest with SHA-256 checksums');
    const data=readFileSync(path);
    if(data.length!==item.size||hash(data)!==item.sha256)fail('A backup file checksum is invalid');
    checkedFiles++;
   }
  }
  if(sqlOutput){
   // Only the exported copy pauses historical messages; never send during restore.
   for(const table of OPTIONAL.slice(0,2))if(Object.hasOwn(tables,table))db.exec("UPDATE "+quote(table)+" SET state='uncertain',error_code='RESTORE_REVIEW' WHERE state IN ('pending','sending')");
   writeFileSync(sqlOutput,exportSql(db),{flag:'wx',mode:0o600});
  }
  const records=Object.values(tables).reduce((total,rows)=>total+rows.length,0);
  return {records,checkedFiles};
 }finally{db.close();}
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{
  const {values,positionals}=parseArgs({options:{manifest:{type:'string'},'files-root':{type:'string'},'sql-output':{type:'string'},help:{type:'boolean'}},allowPositionals:true});
  if(values.help){console.log('Usage: node scripts/verify-backup.mjs BACKUP [--manifest FILE] [--files-root DIRECTORY] [--sql-output NEW_FILE]');}
  else{
   if(positionals.length!==1)fail('Provide one backup file. Use --help for usage.');
   const result=verifyBackup({backup:positionals[0],manifest:values.manifest,filesRoot:values['files-root'],sqlOutput:values['sql-output']});
   console.log('Backup verified: schema, '+result.records+' records, references and integrity are valid. Files verified: '+result.checkedFiles+'.');
   if(!values['files-root'])console.log('File contents were not checked: provide --manifest and --files-root for full verification.');
  }
 }catch(error){console.error(error.message);process.exitCode=1;}
}

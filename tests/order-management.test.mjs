import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {ordersRoute} from '../src/lib/orders-service.js';
import {isAdmin} from '../src/lib/admin-auth.js';
import seed from '../src/lib/catalogue-seed.js';
function database(){const sql=new DatabaseSync(':memory:');for(const name of ['0000_orders.sql','0001_security.sql','0002_order_language.sql','0003_whatsapp_notifications.sql'])sql.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));const prepare=q=>({async first(){return sql.prepare(q).get()??null;},async all(){return {results:sql.prepare(q).all()};},bind(...args){return {async first(){return sql.prepare(q).get(...args)??null;},async all(){return {results:sql.prepare(q).all(...args)};},async run(){return {meta:{changes:Number(sql.prepare(q).run(...args).changes)}};},q,args};}});return {sql,prepare,async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements){const r=sql.prepare(s.q).run(...s.args);result.push({meta:{changes:Number(r.changes)}});}sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};}
function setup(){const DB=database();DB.sql.prepare('INSERT INTO catalogue_documents(id,revision,document) VALUES(1,?,?)').run('initial',JSON.stringify(seed));return {DB,BUCKET:{async get(){return null;},async put(){}},CATALOGUE_ADMIN_EMAIL:'owner@example.test'};}
const req=(path,method='GET',body,admin=false)=>new Request('https://shop.test'+path,{method,headers:{Origin:'https://shop.test','Content-Type':'application/json',...(admin?{'oai-authenticated-user-email':'owner@example.test'}:{})},body:body?JSON.stringify(body):undefined});
const requestData=()=>({requestKey:crypto.randomUUID(),token:crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),details:{name:'Client test',phone:'+22670000000',city:'Bobo-Dioulasso',address:'Quartier test',notes:'',mode:'livraison',deadline:'2099-01-01'},items:[{id:seed.products[0].id,quantity:2,expectedPrice:seed.products[0].price}]});
async function create(e,b=requestData()){const r=await ordersRoute(req('/api/orders','POST',b),e);assert.equal(r.status,201,JSON.stringify(await r.clone().json()));return {b,order:await r.json()};}
async function patch(e,id,body){return ordersRoute(req('/api/admin/orders/'+id,'PATCH',body,true),e);}
test('Une demande est durable et idempotente ; aucun stock n’est réservé à sa création',async()=>{const e=setup(),{b,order}=await create(e);const again=await ordersRoute(req('/api/orders','POST',b),e);assert.equal(again.status,200);assert.equal((await again.json()).id,order.id);assert.equal(e.DB.sql.prepare('SELECT count(*) n FROM orders').get().n,1);assert.equal(e.DB.sql.prepare('SELECT count(*) n FROM inventory').get().n,0);const changed=await ordersRoute(req('/api/orders','POST',{...b,details:{...b.details,name:'Autre'}}),e);assert.equal(changed.status,409);});
test('Confirmation atomique : accord, stock, réservation, annulation et pas de double restitution',async()=>{const e=setup(),{order}=await create(e);const base={version:1,status:'confirmed',delivery_fee:1000,agreed_date:'2099-01-01',customer_agreed:true};assert.equal((await patch(e,order.id,base)).status,400);assert.equal(e.DB.sql.prepare('SELECT status FROM orders').get().status,'pending');e.DB.sql.prepare('INSERT INTO inventory(product_id,quantity) VALUES(?,3)').run(seed.products[0].id);assert.equal((await patch(e,order.id,{...base,customer_agreed:false})).status,400);assert.equal((await patch(e,order.id,base)).status,200);assert.equal(e.DB.sql.prepare('SELECT quantity FROM inventory').get().quantity,1);assert.equal((await patch(e,order.id,base)).status,409);assert.equal((await patch(e,order.id,{version:2,status:'cancelled'})).status,200);assert.equal(e.DB.sql.prepare('SELECT quantity FROM inventory').get().quantity,3);assert.equal((await patch(e,order.id,{version:3,status:'confirmed'})).status,400);assert.equal(e.DB.sql.prepare('SELECT quantity FROM inventory').get().quantity,3);});
test('Deux confirmations concurrentes ne peuvent pas vendre le même stock',async()=>{const e=setup(),a=await create(e),b=await create(e);e.DB.sql.prepare('INSERT INTO inventory(product_id,quantity) VALUES(?,3)').run(seed.products[0].id);const updates=await Promise.all([a,b].map(x=>patch(e,x.order.id,{version:1,status:'confirmed',delivery_fee:0,agreed_date:'2099-01-01',customer_agreed:true})));assert.deepEqual(updates.map(r=>r.status).sort(),[200,400]);assert.equal(e.DB.sql.prepare('SELECT quantity FROM inventory').get().quantity,1);});
test('Livrer ne signifie pas encaisser ; Orange Money ou Wave sont requis pour un paiement',async()=>{const e=setup(),{order}=await create(e);e.DB.sql.prepare('INSERT INTO inventory(product_id,quantity) VALUES(?,5)').run(seed.products[0].id);let version=1;for(const status of ['confirmed','preparing','ready','shipping','completed']){const r=await patch(e,order.id,{version:version++,status,delivery_fee:0,agreed_date:'2099-01-01',customer_agreed:true});assert.equal(r.status,200);}assert.equal(e.DB.sql.prepare('SELECT paid_amount FROM orders').get().paid_amount,0);assert.equal((await patch(e,order.id,{version:6,paid_amount:24000})).status,400);assert.equal((await patch(e,order.id,{version:6,paid_amount:24000,payment_method:'Wave'})).status,200);assert.equal((await patch(e,order.id,{version:7,paid_amount:999999,payment_method:'Wave'})).status,400);});
test('Suivi privé : token obligatoire et aucune coordonnée ou note interne exposée',async()=>{const e=setup(),{order,b}=await create(e);assert.equal((await ordersRoute(req('/api/orders/'+order.id),e)).status,404);const r=req('/api/orders/'+order.id);r.headers.set('Authorization','Bearer '+b.token);const response=await ordersRoute(r,e);assert.equal(response.status,200);const data=await response.json();assert.equal(data.customer,undefined);assert.equal(data.internal_note,undefined);assert.equal(data.token_hash,undefined);assert.equal((await ordersRoute(req('/api/admin/orders'),e)).status,403);});
test('Les prix clients, produits cachés et requêtes externes ne sont pas acceptés',async()=>{const e=setup(),b=requestData();b.items[0].expectedPrice=1;assert.equal((await ordersRoute(req('/api/orders','POST',b),e)).status,400);const r=req('/api/orders','POST',requestData());r.headers.set('Origin','https://other.test');assert.equal((await ordersRoute(r,e)).status,403);});
test('Le déploiement Cloudflare indépendant refuse les simples en-têtes e-mail et les JWT invalides',async()=>{const r=req('/api/admin/orders','GET',null,true);assert.equal(await isAdmin(r,{CATALOGUE_ADMIN_EMAIL:'owner@example.test',AUTH_MODE:'cloudflare'}),false);r.headers.set('Cf-Access-Jwt-Assertion','bad.token.here');assert.equal(await isAdmin(r,{CATALOGUE_ADMIN_EMAIL:'owner@example.test',AUTH_MODE:'cloudflare',ACCESS_ISSUER:'https://test.cloudflareaccess.com',ACCESS_AUD:'aud'}),false);});
test('Le stock de démonstration est borné et son initialisation ne remplace jamais un stock existant',async()=>{const e=setup();e.DB.sql.prepare('INSERT INTO inventory(product_id,quantity) VALUES(?,17)').run(seed.products[0].id);assert.equal((await ordersRoute(req('/api/admin/inventory/demo','POST',{},true),e)).status,200);const rows=e.DB.sql.prepare('SELECT * FROM inventory').all();assert.equal(rows.length,12);assert.equal(rows[0].quantity,17);for(const row of rows.slice(1)){assert.ok(row.quantity>=2&&row.quantity<=5);assert.equal(row.demo,1);}});
test('Les statistiques séparent demandes, ventes et encaissements ; export CSV lisible',async()=>{const e=setup();await create(e);const m=await ordersRoute(req('/api/admin/orders/metrics?days=30','GET',null,true),e);assert.equal(m.status,200);const d=await m.json();assert.equal(d.current.requests,1);assert.equal(d.current.confirmed,0);assert.equal(d.current.collected,0);assert.equal(d.current.sales,0);assert.equal(d.topProducts.length,0);const csv=await ordersRoute(req('/api/admin/orders/export','GET',null,true),e);assert.equal(csv.status,200);assert.match(await csv.text(),/Client test/);});
test('Une demande personnalisée ne peut être confirmée sans devis et photo',async()=>{const e=setup(),b=requestData();b.items=[];b.custom={quantity:1,description:'Modèle bleu'};const {order}=await create(e,b);assert.equal((await patch(e,order.id,{version:1,status:'confirmed',delivery_fee:0,agreed_date:'2099-01-01',customer_agreed:true})).status,400);assert.equal((await patch(e,order.id,{version:1,status:'confirmed',delivery_fee:0,custom_price:12000,agreed_date:'2099-01-01',customer_agreed:true})).status,400);});
test('Le catalogue D1 conserve ses mises à jour au lieu de relire le catalogue initial',async()=>{const {catalogueRoute}=await import('../src/lib/catalogue-service.js');const e=setup();const products=seed.products.map(p=>({...p,availability:'confirm',occasions:[]}));products[0].price=13500;const response=await catalogueRoute(req('/api/admin/catalogue','PUT',{revision:'initial',products},true),e);assert.equal(response.status,200);const publicData=await (await catalogueRoute(req('/api/catalogue'),e)).json();assert.equal(publicData.products[0].price,13500);});
test('La langue anglaise est conservée dans la commande sans dupliquer les produits ou modifier leurs prix',async()=>{const e=setup(),body={...requestData(),language:'en'};const {order}=await create(e,body);assert.equal(order.language,'en');const row=e.DB.sql.prepare('SELECT * FROM orders WHERE id=?').get(order.id);assert.equal(row.language,'en');const items=JSON.parse(row.items);assert.equal(items[0].id,body.items[0].id);assert.equal(items[0].price,body.items[0].expectedPrice);assert.equal(items[0].name_en,'Lavender stripes');const request=req('/api/orders/'+order.id);request.headers.set('Authorization','Bearer '+body.token);const tracking=await (await ordersRoute(request,e)).json();assert.equal(tracking.language,'en');assert.equal(tracking.items[0].name_en,'Lavender stripes');});

import {dispatchNotifications,notificationText,recipientNumber} from '../src/lib/whatsapp.js';
const whatsappEnv=()=>({...setup(),WHATSAPP_ENABLED:'1',WHATSAPP_ACCESS_TOKEN:'test-secret',WHATSAPP_PHONE_NUMBER_ID:'12345',WHATSAPP_API_VERSION:'v99.0',WHATSAPP_TEMPLATE_FR:'order_update_fr',WHATSAPP_TEMPLATE_EN:'order_update_en'});
test('WhatsApp : consentement explicite, reçu unique et aucun envoi pour les commandes existantes sans accord',async()=>{
 const e=whatsappEnv();await create(e);assert.equal(e.DB.sql.prepare('SELECT count(*) n FROM order_notifications').get().n,0);
 const b={...requestData(),whatsappOptIn:true};const {order}=await create(e,b);
 assert.ok(e.DB.sql.prepare('SELECT whatsapp_consent_at FROM orders WHERE id=?').get(order.id).whatsapp_consent_at);
 assert.equal((await ordersRoute(req('/api/orders','POST',b),e)).status,200);
 assert.equal(e.DB.sql.prepare('SELECT count(*) n FROM order_notifications').get().n,1);
 assert.equal((await patch(e,order.id,{version:1,internal_note:'Never send this private note'})).status,200);
 assert.equal(e.DB.sql.prepare('SELECT count(*) n FROM order_notifications').get().n,1);
 assert.equal((await patch(e,order.id,{version:2,status:'confirmed',delivery_fee:0,agreed_date:'2099-01-01',customer_agreed:true})).status,400);
 assert.equal(e.DB.sql.prepare('SELECT count(*) n FROM order_notifications').get().n,1);
 assert.equal((await patch(e,order.id,{version:2,status:'cancelled',cancellation_reason:'Internal reason'})).status,200);
 const events=e.DB.sql.prepare('SELECT * FROM order_notifications ORDER BY id').all();
 assert.equal(events.length,2);assert.equal(JSON.parse(events[0].payload).status,'pending');assert.equal(JSON.parse(events[1].payload).status,'cancelled');
 assert.ok(!events[1].payload.includes('Internal'));assert.ok(!events[1].payload.includes(b.token));assert.ok(!events[1].payload.includes(b.details.name));
});
test('WhatsApp : destinataire international, modèles FR/EN, statut terminé distinct du paiement',()=>{
 assert.equal(recipientNumber('+226 77 54 07 92'),'22677540792');assert.equal(recipientNumber('0022677540792'),'22677540792');
 assert.throws(()=>recipientNumber('77540792'));assert.throws(()=>recipientNumber('+226abc77540792'));
 const base={status:'completed',items:[],delivery_fee:0,paid_amount:0,custom:null};
 assert.match(notificationText({...base,language:'fr'}),/commande remise.*Encaissé : 0 CFA/);
 assert.match(notificationText({...base,language:'en'}),/order handed over.*Collected : 0 CFA/);
 assert.ok(!notificationText({...base,language:'en'}).includes('paid'));
});
test('WhatsApp : soumission unique malgré deux traitements concurrents ; réponse Meta ne signifie pas livraison',async()=>{
 const e=whatsappEnv();const {order}=await create(e,{...requestData(),whatsappOptIn:true,language:'en'});let sends=0;
 const transport=async(url,options)=>{
  if(url.includes('?fields='))return Response.json({display_phone_number:'+226 77 54 07 92'});
  sends++;const data=JSON.parse(options.body);assert.equal(data.to,'22670000000');assert.equal(data.template.language.code,'en');assert.equal(data.template.name,'order_update_en');assert.ok(data.template.components[0].parameters[1].text.includes('request received'));
  return Response.json({messages:[{id:'wamid.test'}]});
 };
 await Promise.all([dispatchNotifications(e,transport),dispatchNotifications(e,transport)]);
 await dispatchNotifications(e,transport);assert.equal(sends,1);
 assert.equal(e.DB.sql.prepare('SELECT state FROM order_notifications WHERE order_id=?').get(order.id).state,'submitted');
});
test('WhatsApp : échec réseau conservé à vérifier, limite 429 réessayée, mauvais expéditeur bloqué',async()=>{
 const e=whatsappEnv();await create(e,{...requestData(),whatsappOptIn:true});
 const identity=Response.json({display_phone_number:'+22677540792'});let sends=0;
 await dispatchNotifications(e,async url=>url.includes('?fields=')?identity.clone():(sends++,Response.json({error:{code:130429}},{status:429})),100000);
 let event=e.DB.sql.prepare('SELECT * FROM order_notifications').get();assert.equal(event.state,'pending');assert.equal(event.attempts,1);
 await dispatchNotifications(e,async url=>{if(url.includes('?fields='))return identity.clone();sends++;throw Error('timeout after provider accepted');},event.available_at);
 assert.equal(e.DB.sql.prepare('SELECT state FROM order_notifications').get().state,'uncertain');
 await dispatchNotifications(e,async()=>identity.clone(),99999999);assert.equal(sends,2);
 const wrong=whatsappEnv();await create(wrong,{...requestData(),whatsappOptIn:true});
 await assert.rejects(dispatchNotifications(wrong,async()=>Response.json({display_phone_number:'+12345678901'})),/sender/);
 assert.equal(wrong.DB.sql.prepare('SELECT state FROM order_notifications').get().state,'pending');
});
test('WhatsApp : arrêt privé ou par la gestion, file supprimée sans exposer les coordonnées',async()=>{
 const e=whatsappEnv(),{b,order}=await create(e,{...requestData(),whatsappOptIn:true});
 const url='/api/orders/'+order.id+'/notifications';
 assert.equal((await ordersRoute(req(url,'POST'),e)).status,404);
 const r=req(url,'POST');r.headers.set('Authorization','Bearer '+b.token);
 assert.equal((await ordersRoute(r,e)).status,200);
 assert.equal(e.DB.sql.prepare('SELECT state FROM order_notifications').get().state,'suppressed');
 assert.equal(e.DB.sql.prepare('SELECT whatsapp_opt_in FROM orders').get().whatsapp_opt_in,0);
 const second=await create(e,{...requestData(),whatsappOptIn:true});
 assert.equal((await ordersRoute(req('/api/admin/orders/'+second.order.id+'/notifications','POST',null,true),e)).status,200);
 const publicReq=req('/api/orders/'+second.order.id);publicReq.headers.set('Authorization','Bearer '+second.b.token);
 const publicData=await (await ordersRoute(publicReq,e)).json();assert.equal(publicData.whatsapp_opt_in,false);assert.equal(publicData.notifications,undefined);
});

import worker from '../src/lib/pdf-service.js';
test('WhatsApp : arrêt accessible à travers la protection HTTP du Worker ; cron distinct de la sauvegarde',async()=>{
 const e=whatsappEnv(),{b,order}=await create(e,{...requestData(),whatsappOptIn:true});
 const r=req('/api/orders/'+order.id+'/notifications','POST',{});r.headers.set('Authorization','Bearer '+b.token);
 assert.equal((await worker.fetch(r,e)).status,200);
 assert.equal(e.DB.sql.prepare('SELECT whatsapp_opt_in FROM orders').get().whatsapp_opt_in,0);
 const pending=[];await worker.scheduled({cron:'*/5 * * * *'},{BACKUP_CRON_ENABLED:'1',WHATSAPP_ENABLED:'0'},{waitUntil:p=>pending.push(p)});await Promise.all(pending);
});

import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {ordersRoute} from '../src/lib/orders-service.js';
import {catalogueRoute} from '../src/lib/catalogue-service.js';
import {operationsSnapshot} from '../src/lib/operations.js';
import {orderReply} from '../src/lib/order-replies.ts';
import {csvCell} from '../src/lib/order-filters.js';
import seed from '../src/lib/catalogue-seed.js';
import {testRuntime,request,orderBody} from './helpers/runtime.mjs';
const create=async(e,b=orderBody())=>{const r=await ordersRoute(request('/api/orders','POST',b),e);assert.equal(r.status,201,await r.clone().text());return {body:b,order:await r.json()};};
const patch=(e,id,b)=>ordersRoute(request('/api/admin/orders/'+id,'PATCH',b,true),e);
async function attach(e,id,role,token,bytes,type){return ordersRoute(new Request('https://shop.test/api/orders/'+id+'/'+role,{method:'PUT',headers:{Origin:'https://shop.test',Authorization:'Bearer '+token,'Content-Type':type},body:bytes}),e);}
test('Complete order: durable request, original PDF, stock, handover, payment and private costs',async t=>{
 const e=testRuntime();t.after(()=>e.DB.sql.close());const {body,order}=await create(e);
 const again=await ordersRoute(request('/api/orders','POST',body),e);assert.equal((await again.json()).id,order.id);
 const pdf=new TextEncoder().encode('%PDF-1.4\nA test document\n%%EOF');assert.equal((await attach(e,order.id,'pdf',body.token,pdf,'application/pdf')).status,200);
 e.DB.sql.prepare('INSERT INTO inventory(product_id,quantity) VALUES(?,3)').run(body.items[0].id);
 let version=1;
 for(const status of ['confirmed','preparing','ready','shipping','completed'])assert.equal((await patch(e,order.id,{version:version++,status,delivery_fee:1000,agreed_date:'2099-01-01',customer_agreed:true})).status,200);
 assert.equal(e.DB.sql.prepare('SELECT quantity FROM inventory').get().quantity,1);
 assert.equal(e.DB.sql.prepare('SELECT paid_amount FROM orders').get().paid_amount,0);
 const total=2*seed.products[0].price+1000;
 assert.equal((await patch(e,order.id,{version:version++,paid_amount:total,payment_method:'Wave'})).status,200);
 const costs={version:0,production_cost:15000,delivery_cost:1000,other_cost:200,note:'Note interne sur les coûts'};
 const saved=await ordersRoute(request('/api/admin/orders/'+order.id+'/costs','PUT',costs,true),e);assert.equal(saved.status,200);assert.equal((await saved.json()).version,1);
 assert.equal((await ordersRoute(request('/api/admin/orders/'+order.id+'/costs','PUT',costs,true),e)).status,409);
 const detail=await (await ordersRoute(request('/api/admin/orders/'+order.id,'GET',undefined,true),e)).json();assert.equal(detail.costs.production_cost,15000);
 const publicData=await (await ordersRoute(request('/api/orders/'+order.id,'GET',undefined,false,body.token),e)).json();assert.equal(publicData.costs,undefined);assert.equal(publicData.customer,undefined);assert.equal(publicData.paid_amount,total);
 assert.ok(!JSON.stringify(publicData).includes(costs.note));assert.equal((await operationsSnapshot(e,seed)).finance.margin,total-16200);
 const doc=await ordersRoute(request('/api/admin/orders/'+order.id+'/pdf','GET',undefined,true),e);assert.deepEqual(new Uint8Array(await doc.arrayBuffer()),pdf);
 const reply=orderReply(detail,'summary','en');assert.match(reply,/handed over/);assert.ok(!reply.includes(costs.note));assert.ok(!reply.includes(body.details.notes));
});
test('Custom pagne preserves its original photo, requires a quote and follows pickup rules',async t=>{
 const e=testRuntime();t.after(()=>e.DB.sql.close());const b=orderBody({items:[],language:'en',custom:{quantity:2,description:'A similar pagne'}});b.details.mode='retrait';const {order}=await create(e,b);
 const agree={version:1,status:'confirmed',delivery_fee:0,custom_price:18000,agreed_date:'2099-01-01',customer_agreed:true};assert.equal((await patch(e,order.id,agree)).status,400);
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/reference-images.json',import.meta.url),'utf8'));const photo=new Uint8Array(Buffer.from(fixture.png,'base64'));assert.equal((await attach(e,order.id,'photo',b.token,photo,'image/png')).status,200);
 assert.equal((await patch(e,order.id,agree)).status,200);assert.equal((await patch(e,order.id,{version:2,status:'shipping'})).status,400);
 assert.equal((await patch(e,order.id,{version:2,status:'preparing'})).status,200);assert.equal((await patch(e,order.id,{version:3,status:'ready'})).status,200);assert.equal((await patch(e,order.id,{version:4,status:'completed'})).status,200);
 const saved=await ordersRoute(request('/api/admin/orders/'+order.id+'/photo','GET',undefined,true),e);assert.deepEqual(new Uint8Array(await saved.arrayBuffer()),photo);assert.equal(e.DB.sql.prepare('SELECT count(*) n FROM inventory').get().n,0);
 const snapshot=await operationsSnapshot(e,seed);assert.equal(snapshot.finance.completed,1);assert.equal(snapshot.finance.covered,0);assert.equal(snapshot.finance.margin,0);
});
test('Daily actions distinguish agreed dates, unpaid orders, missing documents and genuine stock',async t=>{
 const e=testRuntime();t.after(()=>e.DB.sql.close());const now=new Date('2026-11-05T12:00:00Z');const cases=[];
 for(let i=0;i<4;i++)cases.push(await create(e));
 e.DB.sql.prepare('INSERT INTO inventory(product_id,quantity,demo) VALUES(?,100,0)').run(seed.products[0].id);
 for(const [i,date,status] of [[0,'2026-11-04','confirmed'],[1,'2026-11-06','confirmed'],[2,'2026-11-05','completed']])e.DB.sql.prepare('UPDATE orders SET status=?,agreed_date=?,delivery_fee=0 WHERE id=?').run(status,date,cases[i].order.id);
 e.DB.sql.prepare('UPDATE orders SET created_at=? WHERE id=?').run('2026-11-05T11:00:00.000Z',cases[3].order.id);
 e.DB.sql.prepare('UPDATE inventory SET quantity=1').run();e.DB.sql.prepare('INSERT INTO inventory(product_id,quantity,demo) VALUES(?,0,1)').run(seed.products[1].id);
 const doc=structuredClone(seed);doc.products[0].lowStockThreshold=3;
 const d=await operationsSnapshot(e,doc,now);assert.equal(d.groups.find(g=>g.kind==='overdue').count,1);assert.equal(d.groups.find(g=>g.kind==='upcoming').count,1);assert.equal(d.groups.find(g=>g.kind==='unpaid').count,1);assert.equal(d.groups.find(g=>g.kind==='documents').count,1);assert.equal(d.lowStock.length,1);assert.equal(d.lowStock[0].quantity,1);assert.ok(d.unknownStock.some(p=>p.id===seed.products[1].id&&p.demo));
 assert.equal((await ordersRoute(request('/api/admin/operations'),e)).status,403);
 assert.equal((await ordersRoute(request('/api/admin/operations','GET',undefined,true),e)).status,200);
});
test('List and CSV use identical date, city and status filters, with safe spreadsheet cells',async t=>{
 const e=testRuntime();t.after(()=>e.DB.sql.close());const a=await create(e),other=orderBody();other.details.city='Ouagadougou';await create(e,other);
 e.DB.sql.prepare('UPDATE orders SET created_at=? WHERE id=?').run('2026-11-01T09:00:00.000Z',a.order.id);
 const params='?city=Bobo&from=2026-11-01&to=2026-11-01&status=pending';const list=await (await ordersRoute(request('/api/admin/orders'+params,'GET',undefined,true),e)).json();assert.equal(list.count,1);
 const csv=await (await ordersRoute(request('/api/admin/orders/export'+params,'GET',undefined,true),e)).text();assert.ok(csv.includes(a.order.reference));assert.ok(!csv.includes('Ouagadougou'));
 assert.equal((await ordersRoute(request('/api/admin/orders?from=2026-02-31','GET',undefined,true),e)).status,400);
 assert.equal((await (await ordersRoute(request('/api/admin/orders?q=%25','GET',undefined,true),e)).json()).count,0);
 assert.equal(csvCell(' \t=1+1'),'"\' \t=1+1"');assert.equal(csvCell('+22670000000'),'"\'+22670000000"');
});
test('Low stock thresholds persist privately; reading inventory does not invent quantities',async t=>{
 const e=testRuntime();t.after(()=>e.DB.sql.close());const before=await ordersRoute(request('/api/admin/inventory','GET',undefined,true),e);assert.deepEqual(await before.json(),[]);
 const products=structuredClone(seed.products).map(p=>({...p,availability:p.availability??'confirm',occasions:p.occasions??[]}));products[0].lowStockThreshold=7;
 const r=await catalogueRoute(request('/api/admin/catalogue','PUT',{revision:seed.revision,products},true),e);assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).products[0].lowStockThreshold,7);
 const pub=await (await catalogueRoute(request('/api/catalogue'),e)).json();assert.equal(pub.products[0].lowStockThreshold,undefined);
 const snapshot=await operationsSnapshot(e,JSON.parse(e.DB.sql.prepare('SELECT document FROM catalogue_documents').get().document));assert.equal(snapshot.unknownStock.length,12);
});
test('Replies never invent acceptance, final prices, dates or payments',()=>{
 const order={reference:'TEST',status:'pending',total:12000,delivery_fee:null,custom:null,custom_price:null,agreed_date:null,paid_amount:0};
 assert.match(orderReply(order,'summary','en'),/Known subtotal/);assert.match(orderReply(order,'summary','en'),/not yet accepted/);assert.match(orderReply(order,'summary','fr'),/reste à confirmer/);assert.ok(!orderReply({...order,status:'completed'},'status','en').includes('fully paid'));
});
test('A file upload racing confirmation cannot replace the approved original document',async t=>{
 const e=testRuntime();t.after(()=>e.DB.sql.close());const {body,order}=await create(e);e.DB.sql.prepare('INSERT INTO inventory(product_id,quantity) VALUES(?,3)').run(body.items[0].id);
 const original=new TextEncoder().encode('%PDF-1.4\nOriginal test document\n%%EOF');assert.equal((await attach(e,order.id,'pdf',body.token,original,'application/pdf')).status,200);const originalKey=e.DB.sql.prepare('SELECT pdf_key FROM orders').get().pdf_key;
 const put=e.BUCKET.put.bind(e.BUCKET);let confirmed=false;e.BUCKET.put=async(...args)=>{const value=await put(...args);if(!confirmed&&args[0].startsWith('managed-orders/')){confirmed=true;assert.equal((await patch(e,order.id,{version:1,status:'confirmed',delivery_fee:0,agreed_date:'2099-01-01',customer_agreed:true})).status,200);}return value;};
 const replacement=new TextEncoder().encode('%PDF-1.4\nUnapproved replacement\n%%EOF');assert.equal((await attach(e,order.id,'pdf',body.token,replacement,'application/pdf')).status,409);assert.equal(e.DB.sql.prepare('SELECT pdf_key FROM orders').get().pdf_key,originalKey);assert.deepEqual((await e.BUCKET.get(originalKey)).bytes,original);
});
test('Concurrent cost edits use their own revision and do not enqueue client notifications',async t=>{
 const e={...testRuntime(),WHATSAPP_ENABLED:'1',WHATSAPP_ACCESS_TOKEN:'test-only',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_API_VERSION:'v99.0',WHATSAPP_TEMPLATE_FR:'test_fr',WHATSAPP_TEMPLATE_EN:'test_en'};t.after(()=>e.DB.sql.close());const {order}=await create(e,orderBody({whatsappOptIn:true}));
 const value={version:0,production_cost:8000,delivery_cost:null,other_cost:0,note:''};const results=await Promise.all([value,{...value,production_cost:9000}].map(v=>ordersRoute(request('/api/admin/orders/'+order.id+'/costs','PUT',v,true),e)));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(e.DB.sql.prepare('SELECT count(*) n FROM order_notifications').get().n,1);assert.equal(e.DB.sql.prepare('SELECT version FROM orders').get().version,1);
 assert.equal((await ordersRoute(request('/api/admin/orders/'+order.id+'/costs','PUT',{...value,version:1,production_cost:-1},true),e)).status,400);
});

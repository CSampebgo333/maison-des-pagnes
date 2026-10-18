import initialStock from './initial-stock.js';
import {isAdmin} from './admin-auth.js';
import {getCatalogue} from './catalogue-service.js';
import {customerDetails,validateUpdate,totalOf,orderStatuses} from './order-management.js';
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'}});
export async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
const publicOrder=row=>({reference:row.reference,created_at:row.created_at,status:row.status,items:JSON.parse(row.items),custom:row.custom?JSON.parse(row.custom):null,delivery_fee:row.delivery_fee,custom_price:row.custom_price,agreed_date:row.agreed_date,paid_amount:row.paid_amount,total:totalOf(row),mode:JSON.parse(row.customer).mode});
const adminOrder=row=>({...row,customer:JSON.parse(row.customer),items:JSON.parse(row.items),custom:row.custom?JSON.parse(row.custom):null,token_hash:undefined,request_key:undefined,request_hash:undefined,pdf_key:undefined,photo_key:undefined,total:totalOf(row)});
async function readJson(request,max=20000){if(Number(request.headers.get('Content-Length'))>max)throw Error('Demande trop volumineuse.');const reader=request.body?.getReader();if(!reader)throw Error('Demande manquante.');let size=0,chunks=[];for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>max){await reader.cancel();throw Error('Demande trop volumineuse.');}chunks.push(r.value);}const all=new Uint8Array(size);let at=0;for(const c of chunks){all.set(c,at);at+=c.length;}return JSON.parse(new TextDecoder().decode(all));}
const validId=s=>/^[a-f0-9-]{36}$/.test(s??'');
export async function ordersRoute(request,env){
 const url=new URL(request.url),p=url.pathname;
 if(!p.startsWith('/api/orders')&&!p.startsWith('/api/admin/orders')&&!p.startsWith('/api/admin/inventory'))return null;
 const admin=p.startsWith('/api/admin/');
 if(admin&&!await isAdmin(request,env))return json({error:'Accès réservé à la gestion.'},403);
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)return json({error:'Origine non autorisée.'},403);
 if(!env.DB)return json({error:'Le service de commandes est en cours de configuration.'},503);
 try{
  if(p==='/api/orders'&&request.method==='POST'){
   const b=await readJson(request),details=customerDetails(b.details);if(!/^[a-f0-9-]{36}$/.test(b.requestKey??'')||!/^[a-f0-9]{64}$/.test(b.token??''))throw Error('Identifiant de demande invalide.');
   const requestHash=await hash(JSON.stringify({details,items:b.items,custom:b.custom}));const previous=await env.DB.prepare('SELECT * FROM orders WHERE request_key=?').bind(b.requestKey).first();
   if(previous){if(previous.request_hash!==requestHash||previous.token_hash!==await hash(b.token))return json({error:'Cette demande existe déjà avec un autre contenu.'},409);return json({id:previous.id,...publicOrder(previous)},200);}
   if(!Array.isArray(b.items)||b.items.length>50||!b.items.length&&!b.custom)throw Error('Choisissez au moins un pagne.');
   const catalogue=await getCatalogue(env);const items=[],seen=new Set();
   for(const i of b.items){if(seen.has(i.id)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>99)throw Error('Quantités invalides.');seen.add(i.id);const product=catalogue.document.products.find(x=>x.id===i.id&&x.published!==false&&x.availability!=='unavailable');if(!product||!Number.isInteger(product.price))throw Error('Un pagne n’est plus disponible.');if(i.expectedPrice!==product.price)throw Error('Un prix a changé. Actualisez votre sélection.');items.push({id:product.id,name:product.name,price:product.price,quantity:i.quantity,photo:product.photos[0].src});}
   let custom=null;if(b.custom){if(typeof b.custom.description!=='string'||b.custom.description.length>300||!Number.isInteger(b.custom.quantity)||b.custom.quantity<1||b.custom.quantity>99)throw Error('Vérifiez la demande personnalisée.');custom={description:b.custom.description,quantity:b.custom.quantity};}
   const id=crypto.randomUUID(),now=new Date().toISOString(),reference='FDF-'+now.slice(0,10).replaceAll('-','')+'-'+id.slice(0,8).toUpperCase();
   const statements=[env.DB.prepare('INSERT INTO orders(id,reference,token_hash,request_key,request_hash,created_at,updated_at,customer,items,custom) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,reference,await hash(b.token),b.requestKey,requestHash,now,now,JSON.stringify(details),JSON.stringify(items),custom?JSON.stringify(custom):null),...items.map(i=>env.DB.prepare('INSERT INTO order_lines(order_id,product_id,quantity) VALUES(?,?,?)').bind(id,i.id,i.quantity)),env.DB.prepare('INSERT INTO order_events(order_id,created_at,actor,summary) VALUES(?,?,?,?)').bind(id,now,await isAdmin(request,env)?'gestion':'client',await isAdmin(request,env)?'Demande saisie par la gestion — à confirmer':'Demande reçue — en attente de confirmation')];
   try{await env.DB.batch(statements);}catch(e){const old=await env.DB.prepare('SELECT * FROM orders WHERE request_key=?').bind(b.requestKey).first();if(old&&old.request_hash===requestHash&&old.token_hash===await hash(b.token))return json({id:old.id,...publicOrder(old)});throw e;}
   return json({id,reference,created_at:now,status:'pending'},201);
  }
  const match=p.match(/^\/api\/orders\/([a-f0-9-]{36})(?:\/(pdf|photo))?$/);
  if(match){const row=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(match[1]).first();const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(!row||!token||row.token_hash!==await hash(token))return json({error:'Lien de suivi invalide.'},404);
   if(!match[2]&&request.method==='GET')return json(publicOrder(row));
   if(match[2]&&request.method==='PUT'){
    if(row.status!=='pending')return json({error:'Cette demande est déjà traitée.'},409);
    const role=match[2],limit=role==='pdf'?24*1024*1024:6*1024*1024,type=request.headers.get('Content-Type');if(role==='pdf'?type!=='application/pdf':!['image/jpeg','image/png'].includes(type))throw Error('Format de fichier invalide.');
    const reader=request.body?.getReader();if(!reader)throw Error('Fichier manquant.');const chunks=[];let length=0;for(;;){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>limit){await reader.cancel();throw Error('Fichier trop volumineux.');}chunks.push(r.value);}const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    if(role==='pdf'&&!new TextDecoder().decode(bytes.slice(0,5)).startsWith('%PDF-'))throw Error('PDF invalide.');
    if(role==='photo'&&!(type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216||type==='image/png'&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71))throw Error('Photo invalide.');
    if(!env.BUCKET)return json({error:'Stockage indisponible.'},503);
    const key='managed-orders/'+row.id+'/'+role;await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:type}});await env.DB.prepare(`UPDATE orders SET ${role==='pdf'?'pdf_key':'photo_key'}=? WHERE id=?`).bind(key,row.id).run();return json({saved:true});
   }
  }
  if(p==='/api/admin/inventory'&&request.method==='GET'){await env.DB.batch(Object.entries(initialStock).map(([id,q])=>env.DB.prepare('INSERT OR IGNORE INTO inventory(product_id,quantity,demo) VALUES(?,?,1)').bind(id,q)));const r=await env.DB.prepare('SELECT * FROM inventory').all();return json(r.results);}
  if(p==='/api/admin/inventory/demo'&&request.method==='POST'){
   const {document}=await getCatalogue(env);await env.DB.batch(document.products.map(product=>env.DB.prepare('INSERT OR IGNORE INTO inventory(product_id,quantity,demo) VALUES(?,?,1)').bind(product.id,2+crypto.getRandomValues(new Uint8Array(1))[0]%4)));return json({saved:true});
  }
  if(p==='/api/admin/inventory'&&request.method==='PUT'){
   const b=await readJson(request);if(typeof b.product_id!=='string'||!Number.isInteger(b.quantity)||b.quantity<0||b.quantity>100000)throw Error('Quantité invalide.');const {document}=await getCatalogue(env);if(!document.products.some(x=>x.id===b.product_id))throw Error('Pagne inconnu.');await env.DB.prepare('INSERT INTO inventory(product_id,quantity,demo) VALUES(?,?,0) ON CONFLICT(product_id) DO UPDATE SET quantity=excluded.quantity,demo=0').bind(b.product_id,b.quantity).run();return json({saved:true});
  }
  if(p==='/api/admin/orders'&&request.method==='GET'){
   const page=Math.max(0,Math.min(100000,Number(url.searchParams.get('page'))||0));const status=url.searchParams.get('status')||'';if(status&&!Object.hasOwn(orderStatuses,status))throw Error('Statut invalide.');
   const query=(url.searchParams.get('q')||'').slice(0,100);const where=' WHERE (?=\'\' OR status=?) AND (?=\'\' OR reference LIKE ? OR customer LIKE ?)';
   const args=[status,status,query,'%'+query+'%','%'+query+'%'];const rows=await env.DB.prepare('SELECT * FROM orders'+where+' ORDER BY created_at DESC LIMIT 50 OFFSET ?').bind(...args,page*50).all();const count=await env.DB.prepare('SELECT count(*) AS count FROM orders'+where).bind(...args).first();return json({orders:rows.results.map(adminOrder),count:count.count});
  }
  if(p==='/api/admin/orders/metrics'&&request.method==='GET'){
   const days=[7,30,90].includes(Number(url.searchParams.get('days')))?Number(url.searchParams.get('days')):30,now=new Date(Date.now()+1),start=new Date(now.getTime()-days*86400000).toISOString(),previous=new Date(now.getTime()-2*days*86400000).toISOString();
   const aggregate=async(a,b)=>env.DB.prepare("SELECT count(*) AS requests,coalesce(sum(CASE WHEN status NOT IN ('pending','cancelled') THEN 1 ELSE 0 END),0) AS confirmed,coalesce(sum(CASE WHEN status='completed' THEN 1 ELSE 0 END),0) AS completed,coalesce(sum(CASE WHEN status='cancelled' THEN 1 ELSE 0 END),0) AS cancelled,coalesce(sum(paid_amount),0) AS collected FROM orders WHERE created_at>=? AND created_at<?").bind(a,b).first();
   const [current,prior,attention]=await Promise.all([aggregate(start,now.toISOString()),aggregate(previous,start),env.DB.prepare("SELECT status,count(*) AS count FROM orders WHERE status NOT IN ('completed','cancelled') GROUP BY status").all()]);const active=await env.DB.prepare("SELECT * FROM orders WHERE created_at>=? AND created_at<?").bind(start,now.toISOString()).all();
   const products=new Map(),cities=new Map(),daily=new Map();let sales=0;
   for(const row of active.results){const day=row.created_at.slice(0,10);daily.set(day,(daily.get(day)??0)+1);if(!['pending','cancelled'].includes(row.status)){sales+=totalOf(row);const city=JSON.parse(row.customer).city;cities.set(city,(cities.get(city)??0)+1);for(const i of JSON.parse(row.items)){const old=products.get(i.id)??{name:i.name,quantity:0};old.quantity+=i.quantity;products.set(i.id,old);}}}
   const needs=await env.DB.prepare("SELECT coalesce(sum(CASE WHEN agreed_date<? AND status NOT IN ('pending','completed','cancelled') THEN 1 ELSE 0 END),0) AS overdue,coalesce(sum(CASE WHEN status='completed' THEN 1 ELSE 0 END),0) AS completed FROM orders").bind(now.toISOString().slice(0,10)).first();
   const finished=await env.DB.prepare("SELECT * FROM orders WHERE status='completed'").all();const outstanding=finished.results.reduce((sum,r)=>sum+Math.max(0,totalOf(r)-r.paid_amount),0);
   return json({days,current:{...current,sales},previous:prior,attention:attention.results,overdue:needs.overdue,outstanding,topProducts:[...products.values()].sort((a,b)=>b.quantity-a.quantity).slice(0,5),cities:[...cities].map(([name,count])=>({name,count})),daily:[...daily].map(([date,count])=>({date,count})),definition:'Périodes calculées selon la date de création des demandes ; encaissements cumulés actuels de ces demandes.'});
  }
  if(p==='/api/admin/orders/export'&&request.method==='GET'){
   const rows=await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10001').all();if(rows.results.length>10000)return json({error:'Export limité à 10 000 demandes. Contactez la maintenance pour un export complet.'},400);
   const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
   const csv=[['Référence','Date','Statut','Client','Téléphone','Ville','Mode','Date souhaitée','Date convenue','Total CFA','Encaissé CFA','Paiement'],...rows.results.map(r=>{const d=JSON.parse(r.customer);return [r.reference,r.created_at,orderStatuses[r.status],d.name,d.phone,d.city,d.mode,d.deadline,r.agreed_date,totalOf(r),r.paid_amount,r.payment_method];})].map(row=>row.map(cell).join(';')).join('\r\n');return new Response('\uFEFF'+csv,{headers:{'Content-Type':'text/csv;charset=utf-8','Content-Disposition':'attachment; filename="commandes.csv"','Cache-Control':'private, no-store'}});
  }
  const detail=p.match(/^\/api\/admin\/orders\/([a-f0-9-]{36})(?:\/(pdf|photo))?$/);
  if(detail){const row=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(detail[1]).first();if(!row)return json({error:'Commande introuvable.'},404);
   if(detail[2]&&request.method==='GET'){const key=detail[2]==='pdf'?row.pdf_key:row.photo_key;if(!key)return json({error:'Document non joint.'},404);const o=await env.BUCKET.get(key);if(!o)return json({error:'Document introuvable.'},404);return new Response(o.body,{headers:{'Content-Type':o.httpMetadata.contentType,'Cache-Control':'private, no-store','X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff'}});}
   if(request.method==='GET'){const history=await env.DB.prepare('SELECT created_at,actor,summary FROM order_events WHERE order_id=? ORDER BY id DESC').bind(row.id).all();return json({...adminOrder(row),history:history.results,has_pdf:!!row.pdf_key,has_photo:!!row.photo_key});}
   if(request.method==='PATCH'){
    const b=await readJson(request);if(b.version!==row.version)return json({error:'La commande a changé. Rechargez-la.'},409);
    const patch={};for(const k of ['status','delivery_fee','custom_price','agreed_date','customer_agreed','internal_note','cancellation_reason','paid_amount','payment_method'])if(Object.hasOwn(b,k))patch[k]=b[k];
    for(const k of ['internal_note','cancellation_reason'])if(Object.hasOwn(patch,k)&&(typeof patch[k]!=='string'||patch[k].length>2000))throw Error('Note trop longue.');
    if(Object.hasOwn(patch,'customer_agreed'))patch.customer_agreed=patch.customer_agreed===true||patch.customer_agreed===1?1:0;
    const n=validateUpdate(row,patch),now=new Date().toISOString();
    if(row.custom&&n.status==='confirmed'&&!row.photo_key)throw Error('La photo personnalisée doit être jointe avant confirmation.');
    const change=Object.keys(patch).filter(k=>row[k]!==n[k]);if(!change.length)return json(adminOrder(row));
    // Conditional update + event insertion are one transaction, including reservation triggers.
    await env.DB.batch([env.DB.prepare('UPDATE orders SET status=?,delivery_fee=?,custom_price=?,agreed_date=?,customer_agreed=?,internal_note=?,cancellation_reason=?,paid_amount=?,payment_method=?,updated_at=?,version=version+1 WHERE id=? AND version=?').bind(n.status,n.delivery_fee,n.custom_price,n.agreed_date,n.customer_agreed,n.internal_note,n.cancellation_reason,n.paid_amount,n.payment_method,now,row.id,row.version),env.DB.prepare('INSERT INTO order_events(order_id,created_at,actor,summary) SELECT ?,?,?,? WHERE changes()=1').bind(row.id,now,'gestion',change.map(k=>k==='status'?`Statut : ${orderStatuses[n.status]}`:k==='paid_amount'?`Encaissé : ${n.paid_amount} CFA`:`Modification : ${k}`).join(' · '))]);
    const updated=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(row.id).first();if(updated.version!==row.version+1||updated.updated_at!==now)return json({error:'Modification concurrente. Rechargez la commande.'},409);return json(adminOrder(updated));
   }
  }
  return json({error:'Action introuvable.'},404);
 }catch(e){const message=e instanceof Error?e.message:'';return json({error:message.includes('STOCK_INSUFFISANT')?'Stock insuffisant ou non renseigné. Ajustez le stock avant confirmation.':/^(Vérifiez|Choisissez|Un |Une |Cette |Ce |Avant |Le |La |Les |Photo |PDF |Format |Fichier |Quantité|Identifiant|Demande|Pagne|Note|Modification)/.test(message)&&!message.includes('SQL')?message:'Opération impossible. Réessayez ou rechargez la page.'},400);}
}

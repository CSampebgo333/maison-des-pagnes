// Read-only management queues. Dates follow Burkina Faso's UTC business day.
const ACTIVE="status IN ('confirmed','preparing','ready','shipping')";
const TOTAL="coalesce((SELECT sum(json_extract(value,'$.price')*json_extract(value,'$.quantity')) FROM json_each(orders.items)),0)+coalesce(custom_price,0)+coalesce(delivery_fee,0)";
export const hasCosts=async DB=>!!await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='order_costs'").first();
export async function operationsSnapshot(env,document,now=new Date()){
 const today=now.toISOString().slice(0,10),soon=new Date(now.getTime()+2*86400000).toISOString().slice(0,10);
 const queues=[['pending',"status='pending'",[]],['overdue',ACTIVE+' AND agreed_date<?',[today]],['upcoming',ACTIVE+' AND agreed_date>=? AND agreed_date<=?',[today,soon]],['unpaid',"status='completed' AND paid_amount<("+TOTAL+")",[]],['documents',"status='pending' AND created_at<? AND (pdf_key IS NULL OR (custom IS NOT NULL AND photo_key IS NULL))",[new Date(now.getTime()-10*60000).toISOString()]]];
 const groups=await Promise.all(queues.map(async([kind,where,args])=>{
  const [count,rows]=await Promise.all([env.DB.prepare('SELECT count(*) n FROM orders WHERE '+where).bind(...args).first(),env.DB.prepare('SELECT *,('+TOTAL+') computed_total FROM orders WHERE '+where+' ORDER BY coalesce(agreed_date,created_at),created_at LIMIT 8').bind(...args).all()]);
  return {kind,count:count.n,orders:rows.results.map(row=>{const d=JSON.parse(row.customer);return {id:row.id,reference:row.reference,status:row.status,name:d.name,city:d.city,mode:d.mode,createdAt:row.created_at,agreedDate:row.agreed_date,wantedDate:d.deadline,remaining:Math.max(0,row.computed_total-row.paid_amount)};})};
 }));
 const inventory=await env.DB.prepare('SELECT * FROM inventory').all(),byId=new Map(inventory.results.map(i=>[i.product_id,i]));
 const lowStock=[],unknownStock=[];
 for(const p of document.products.filter(p=>p.published!==false)){
  const i=byId.get(p.id),threshold=p.lowStockThreshold??2,item={id:p.id,name:p.name,photo:p.photos[0]?.src,threshold};
  if(!i||i.quantity===null||i.demo===1)unknownStock.push({...item,demo:i?.demo===1});
  else if(p.availability==='available'&&i.quantity<=threshold)lowStock.push({...item,quantity:i.quantity});
 }
 lowStock.sort((a,b)=>a.quantity-b.quantity);
 const costsReady=await hasCosts(env.DB);
 let finance=null;
 if(costsReady){finance=await env.DB.prepare(`WITH priced AS (SELECT orders.*,(${TOTAL}) total FROM orders) SELECT count(*) completed,count(CASE WHEN c.production_cost IS NOT NULL AND c.delivery_cost IS NOT NULL THEN 1 END) covered,coalesce(sum(CASE WHEN c.production_cost IS NOT NULL AND c.delivery_cost IS NOT NULL THEN p.total-c.production_cost-c.delivery_cost-c.other_cost ELSE 0 END),0) margin FROM priced p LEFT JOIN order_costs c ON c.order_id=p.id WHERE p.status='completed'`).first();}
 return {asOf:now.toISOString(),today,groups,lowStock,unknownStock,costsReady,finance};
}
export async function saveOrderCosts(env,row,body){
 if(!await hasCosts(env.DB))return {status:503,error:'La mise à jour de la base est nécessaire pour gérer les coûts.'};
 const old=await env.DB.prepare('SELECT * FROM order_costs WHERE order_id=?').bind(row.id).first();
 if(!Number.isInteger(body.version)||body.version!==(old?.version??0))return {status:409,error:'Les coûts ont changé. Rechargez la commande.'};
 for(const key of ['production_cost','delivery_cost','other_cost'])if(body[key]!==null&&(!Number.isInteger(body[key])||body[key]<0||body[key]>100000000))throw Error('Vérifiez les coûts en CFA.');
 if(body.other_cost===null||typeof body.note!=='string'||body.note.length>500)throw Error('Vérifiez la note et les coûts.');
 const now=new Date().toISOString();
 const result=await env.DB.batch([env.DB.prepare('INSERT INTO order_costs(order_id,production_cost,delivery_cost,other_cost,note,version,updated_at) VALUES(?,?,?,?,?,1,?) ON CONFLICT(order_id) DO UPDATE SET production_cost=excluded.production_cost,delivery_cost=excluded.delivery_cost,other_cost=excluded.other_cost,note=excluded.note,version=order_costs.version+1,updated_at=excluded.updated_at WHERE order_costs.version=?').bind(row.id,body.production_cost,body.delivery_cost,body.other_cost,body.note.trim(),now,body.version),env.DB.prepare("INSERT INTO order_events(order_id,created_at,actor,summary) SELECT ?,?,'gestion','Coûts internes mis à jour' WHERE changes()=1").bind(row.id,now)]);
 if(!result[0].meta.changes)return {status:409,error:'Les coûts ont changé. Rechargez la commande.'};
 return {status:200,costs:await env.DB.prepare('SELECT * FROM order_costs WHERE order_id=?').bind(row.id).first()};
}

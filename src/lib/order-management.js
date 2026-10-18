export const orderStatuses={pending:'À confirmer',confirmed:'Confirmée — à préparer',preparing:'En préparation',ready:'Prête',shipping:'En livraison',completed:'Terminée',cancelled:'Annulée'};
export const transitions={pending:['confirmed','cancelled'],confirmed:['preparing','cancelled'],preparing:['ready','cancelled'],ready:['shipping','completed','cancelled'],shipping:['completed','cancelled'],completed:[],cancelled:[]};
export function totalOf(order){const items=typeof order.items==='string'?JSON.parse(order.items):order.items;return items.reduce((n,i)=>n+i.price*i.quantity,0)+(order.custom_price??0)+(order.delivery_fee??0);}
export function validateUpdate(old,patch){
 const next={...old,...patch};
 if(!Object.hasOwn(orderStatuses,next.status)||next.status!==old.status&&!transitions[old.status].includes(next.status))throw Error('Ce changement de statut n’est pas autorisé.');
 for(const k of ['paid_amount','delivery_fee','custom_price'])if(next[k]!==null&&(!Number.isInteger(next[k])||next[k]<0||next[k]>100000000))throw Error('Vérifiez les montants en CFA.');
 if(next.paid_amount>old.paid_amount&&next.status!=='completed')throw Error('Le paiement se renseigne à la remise du produit : terminez la commande avant de confirmer l’encaissement.');
 if(next.paid_amount>0&&!['Orange Money','Wave'].includes(next.payment_method))throw Error('Choisissez Orange Money ou Wave.');
 if(next.paid_amount>totalOf(next))throw Error('Le montant encaissé dépasse le montant total.');
 if(next.agreed_date&&(typeof next.agreed_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(next.agreed_date)||!Number.isFinite(Date.parse(next.agreed_date))||new Date(next.agreed_date).toISOString().slice(0,10)!==next.agreed_date))throw Error('Vérifiez la date convenue.');
 if(old.status==='pending'&&next.status==='confirmed'&&(!next.customer_agreed||next.delivery_fee===null||!next.agreed_date||old.custom&&next.custom_price===null))throw Error('Avant confirmation, renseignez les frais (0 si aucun), la date, le prix personnalisé éventuel et l’accord du client.');
 if(next.status==='shipping'&&JSON.parse(old.customer).mode==='retrait')throw Error('Une commande en retrait ne passe pas en livraison.');
 return next;
}
export function customerDetails(value){
 const d={};for(const [key,max] of Object.entries({name:80,phone:25,city:80,address:240,deadline:10,notes:500,mode:10})) {if(typeof value?.[key]!=='string'||value[key].length>max)throw Error('Vérifiez vos coordonnées.');d[key]=value[key].trim();}
 if(!d.name||!d.city||!['livraison','retrait'].includes(d.mode)||d.mode==='livraison'&&!d.address||!/^\+?[\d\s().-]+$/.test(d.phone)||d.phone.replace(/\D/g,'').length<8||d.phone.replace(/\D/g,'').length>15)throw Error('Vérifiez vos coordonnées.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.deadline)||!Number.isFinite(Date.parse(d.deadline))||new Date(d.deadline).toISOString().slice(0,10)!==d.deadline||d.deadline<new Date().toISOString().slice(0,10))throw Error('Vérifiez la date souhaitée.');return d;
}

// Only the server talks to Meta. Never expose the access token or a tracking token.
import {totalOf} from './order-management.js';
export const senderNumber='22677540792';
export function whatsappConfigured(env){
 return env.WHATSAPP_ENABLED==='1' && !!env.WHATSAPP_ACCESS_TOKEN &&
  /^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID??'') && /^v\d+\.\d+$/.test(env.WHATSAPP_API_VERSION??'') &&
  ['WHATSAPP_TEMPLATE_FR','WHATSAPP_TEMPLATE_EN'].every(k=>/^[a-z0-9_]+$/.test(env[k]??''));
}
export function recipientNumber(value){
 const clean=String(value??'').replace(/[\s().-]/g,'').replace(/^00/,'+');
 if(!/^\+[1-9]\d{7,14}$/.test(clean))throw Error('Vérifiez le numéro WhatsApp avec son indicatif international (+226…).');
 return clean.slice(1);
}
const messages={
 fr:{pending:'demande reçue, en attente de confirmation',confirmed:'commande confirmée',preparing:'commande en préparation',ready:'commande prête',shipping:'commande en livraison',completed:'commande remise',cancelled:'commande annulée'},
 en:{pending:'request received, awaiting confirmation',confirmed:'order confirmed',preparing:'order being prepared',ready:'order ready',shipping:'order out for delivery',completed:'order handed over',cancelled:'order cancelled'}
};
export function notificationText(order){
 const language=order.language==='en'?'en':'fr',en=language==='en';
 const parts=[messages[language][order.status]];
 if(order.status==='ready')parts.push(order.mode==='retrait'?(en?'ready for collection':'à retirer en boutique'):(en?'awaiting delivery':'en attente de livraison'));
 const known=order.delivery_fee!==null&&(!order.custom||order.custom_price!==null);
 parts.push((known?'Total':en?'Known subtotal':'Sous-total connu')+' : '+totalOf(order)+' CFA');
 if(order.agreed_date)parts.push((en?'Agreed date':'Date convenue')+' : '+order.agreed_date);
 if(order.status==='completed')parts.push((en?'Collected':'Encaissé')+' : '+order.paid_amount+' CFA');
 return parts.join(' · ');
}
export function templatePayload(event,env){
 const order=JSON.parse(event.payload),en=order.language==='en';
 return {messaging_product:'whatsapp',to:recipientNumber(event.recipient),type:'template',
  template:{name:en?env.WHATSAPP_TEMPLATE_EN:env.WHATSAPP_TEMPLATE_FR,language:{code:en?'en':'fr'},
   components:[{type:'body',parameters:[{type:'text',text:order.reference},{type:'text',text:notificationText(order)}]}]}};
}
// Claims prevent concurrent requests from submitting the same event.
// Ambiguous outcomes are held for review, never blindly retried.
export async function dispatchNotifications(env,send=fetch,now=Date.now()){
 if(!whatsappConfigured(env)||!env.DB)return;
 const endpoint='https://graph.facebook.com/'+env.WHATSAPP_API_VERSION+'/'+env.WHATSAPP_PHONE_NUMBER_ID;
 const headers={Authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN,'Content-Type':'application/json'};
 const identity=await send(endpoint+'?fields=display_phone_number',{headers,signal:AbortSignal.timeout(10000)});
 if(!identity.ok)throw Error('WhatsApp sender verification failed.');
 const number=(await identity.json()).display_phone_number;
 if(String(number??'').replace(/\D/g,'')!==senderNumber)throw Error('WhatsApp sender does not match the shop number.');
 await env.DB.prepare("UPDATE order_notifications SET state='uncertain',error_code='INTERRUPTED' WHERE state='sending' AND claimed_at<?").bind(now-120000).run();
 const pending=await env.DB.prepare("SELECT n.* FROM order_notifications n JOIN orders o ON o.id=n.order_id WHERE n.state='pending' AND n.available_at<=? AND o.whatsapp_opt_in=1 AND NOT EXISTS (SELECT 1 FROM order_notifications earlier WHERE earlier.order_id=n.order_id AND earlier.id<n.id AND earlier.state IN ('pending','sending')) ORDER BY n.id LIMIT 10").bind(now).all();
 for(const event of pending.results){
  const claim=await env.DB.prepare("UPDATE order_notifications SET state='sending',claimed_at=?,attempts=attempts+1 WHERE id=? AND state='pending' AND EXISTS(SELECT 1 FROM orders WHERE id=order_notifications.order_id AND whatsapp_opt_in=1)").bind(now,event.id).run();
  if(claim.meta.changes!==1)continue;
  let payload;try{payload=templatePayload(event,env);}catch{
   await env.DB.prepare("UPDATE order_notifications SET state='failed',error_code='INVALID_RECIPIENT' WHERE id=?").bind(event.id).run();continue;
  }
  // Check consent again immediately before handing the request to Meta.
  const order=await env.DB.prepare('SELECT whatsapp_opt_in FROM orders WHERE id=?').bind(event.order_id).first();
  if(!order?.whatsapp_opt_in){await env.DB.prepare("UPDATE order_notifications SET state='suppressed' WHERE id=?").bind(event.id).run();continue;}
  let state='uncertain',code='NETWORK',id=null;
  try{
   const response=await send(endpoint+'/messages',{method:'POST',headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
   const result=await response.json().catch(()=>null);
   if(response.ok&&typeof result?.messages?.[0]?.id==='string'){state='submitted';id=result.messages[0].id;code=null;}
   else if(response.status===429){state=event.attempts<4?'pending':'failed';code='RATE_LIMIT';}
   else if(response.status>=400&&response.status<500){state='failed';code='META_'+String(Number(result?.error?.code)||response.status);}
   else code='META_UNCERTAIN';
  }catch{/* Provider may have accepted the message: do not duplicate it. */}
  await env.DB.prepare('UPDATE order_notifications SET state=?,error_code=?,message_id=?,available_at=? WHERE id=?').bind(state,code,id,now+Math.min(3600000,60000*2**event.attempts),event.id).run();
 }
}

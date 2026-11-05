// Server-only. This destination is for the owner's alerts, not public contact links.
export function ownerRecipient(env){const raw=String(env.WHATSAPP_ADMIN_RECIPIENT??'').replace(/[\s().+-]/g,'');return /^[1-9]\d{7,14}$/.test(raw)?raw:null;}
export function ownerNotificationsConfigured(env){return !!ownerRecipient(env)&&env.WHATSAPP_ADMIN_ENABLED==='1'&&!!env.WHATSAPP_ACCESS_TOKEN&&/^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID??'')&&/^v\d+\.\d+$/.test(env.WHATSAPP_API_VERSION??'')&&/^[a-z0-9_]+$/.test(env.WHATSAPP_ADMIN_TEMPLATE??'');}
export function ownerAlertPayload(event,env){return {messaging_product:'whatsapp',to:ownerRecipient(env),type:'template',template:{name:env.WHATSAPP_ADMIN_TEMPLATE,language:{code:'fr'},components:[{type:'body',parameters:[{type:'text',text:event.reference}]}]}};}
export async function dispatchOwnerNotifications(env,send=fetch,now=Date.now()){
 if(!ownerNotificationsConfigured(env)||!env.DB)return;
 const endpoint='https://graph.facebook.com/'+env.WHATSAPP_API_VERSION+'/'+env.WHATSAPP_PHONE_NUMBER_ID;
 const headers={Authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN,'Content-Type':'application/json'};
 const identity=await send(endpoint+'?fields=display_phone_number',{headers,signal:AbortSignal.timeout(10000)});
 if(!identity.ok)throw Error('Owner alert sender verification failed.');
 const number=String((await identity.json()).display_phone_number??'').replace(/\D/g,'');
 const expected=String(env.WHATSAPP_SENDER_NUMBER??'22677540792').replace(/\D/g,'');
 if(number!==expected||number===ownerRecipient(env))throw Error('Owner alert requires the configured sender, different from the recipient.');
 await env.DB.prepare("UPDATE owner_notifications SET state='uncertain',error_code='INTERRUPTED' WHERE state='sending' AND claimed_at<?").bind(now-120000).run();
 const rows=await env.DB.prepare("SELECT order_id,reference,attempts FROM owner_notifications WHERE state='pending' AND available_at<=? ORDER BY created_at LIMIT 10").bind(now).all();
 for(const row of rows.results){
  const claim=await env.DB.prepare("UPDATE owner_notifications SET state='sending',claimed_at=?,attempts=attempts+1 WHERE order_id=? AND state='pending'").bind(now,row.order_id).run();if(claim.meta.changes!==1)continue;
  let state='uncertain',code='NETWORK',id=null;
  try{const response=await send(endpoint+'/messages',{method:'POST',headers,body:JSON.stringify(ownerAlertPayload(row,env)),signal:AbortSignal.timeout(10000)});const result=await response.json().catch(()=>null);
   if(response.ok&&typeof result?.messages?.[0]?.id==='string'){state='submitted';code=null;id=result.messages[0].id;}
   else if(response.status===429){state=row.attempts<4?'pending':'failed';code='RATE_LIMIT';}
   else if(response.status>=400&&response.status<500){state='failed';code='META_'+String(Number(result?.error?.code)||response.status);}
   else code='META_UNCERTAIN';
  }catch{/* A network timeout is ambiguous: do not blindly duplicate an accepted message. */}
  await env.DB.prepare('UPDATE owner_notifications SET state=?,error_code=?,message_id=?,available_at=? WHERE order_id=?').bind(state,code,id,now+Math.min(3600000,60000*2**row.attempts),row.order_id).run();
 }
}

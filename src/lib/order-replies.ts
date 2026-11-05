type ReplyOrder={reference:string;language?:'fr'|'en';status:string;total:number;delivery_fee:number|null;custom?:unknown;custom_price:number|null;agreed_date:string|null;paid_amount:number;customer?:{name?:string;mode?:string}};
export function orderReply(order:ReplyOrder,kind:'summary'|'status',language:'fr'|'en'){
 const en=language==='en',money=(n:number)=>new Intl.NumberFormat(en?'en-GB':'fr-FR').format(n)+' CFA';
 const states:Record<string,string>=en?{pending:'request awaiting confirmation',confirmed:'confirmed; preparation will follow',preparing:'being prepared',ready:'ready for handover',shipping:'out for delivery',completed:'handed over',cancelled:'cancelled'}:{pending:'demande à confirmer',confirmed:'confirmée, à préparer',preparing:'en préparation',ready:'prête à remettre',shipping:'en cours de livraison',completed:'remise au client',cancelled:'annulée'};
 const lines=[en?'Hello,':'Bonjour,',en?`An update on your Maison du Faso Dan Fani request ${order.reference}.`:`Voici un point sur votre demande ${order.reference} auprès de la Maison du Faso Dan Fani.`];
 lines.push((en?'Status: ':'Statut : ')+(states[order.status]??order.status)+'.');
 if(kind==='summary'){
  const incomplete=order.delivery_fee===null||!!order.custom&&order.custom_price===null;
  lines.push(incomplete?(en?`Known subtotal: ${money(order.total)}. Final total to be confirmed.`:`Sous-total connu : ${money(order.total)}. Le total définitif reste à confirmer.`):(en?`${order.status==='pending'?'Proposed total':'Agreed total'}: ${money(order.total)}.`:`Montant total ${order.status==='pending'?'proposé':'convenu'} : ${money(order.total)}.`));
  if(order.delivery_fee===null)lines.push(en?'Delivery/collection charges: to be confirmed.':'Frais de livraison ou retrait : à confirmer.');
  else lines.push((en?'Delivery/collection charges included: ':'Frais de livraison ou retrait inclus : ')+money(order.delivery_fee)+'.');
 }
 if(order.agreed_date){const day=new Date(order.agreed_date+'T12:00:00Z').toLocaleDateString(en?'en-GB':'fr-FR',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'});lines.push((en?'Agreed date: ':'Date convenue : ')+day+'.');}
 else lines.push(en?'The handover date is still to be confirmed.':'La date de remise reste à confirmer.');
 if(order.status==='pending')lines.push(en?'Your request is not yet accepted. We will confirm the availability, total and arrangements with you.':'Votre demande n’est pas encore acceptée. Nous confirmerons avec vous la disponibilité, le total et les modalités.');
 else if(order.status==='completed')lines.push((en?'Amount recorded as collected: ':'Montant enregistré comme encaissé : ')+money(order.paid_amount)+'.');
 if(order.status==='ready')lines.push(en?'Please contact us to agree the handover arrangements.':'Contactez-nous pour convenir des modalités de remise.');
 lines.push(en?'Thank you for your trust.':'Merci pour votre confiance.');return lines.join('\n\n');
}

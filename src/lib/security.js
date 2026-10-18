const encoder=new TextEncoder();
export async function requestGuard(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/'))return null;
 if(!['GET','HEAD','POST','PUT','PATCH'].includes(request.method))return deny('Méthode non autorisée.',405);
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)return deny('Origine non autorisée.',403);
 const write=!['GET','HEAD'].includes(request.method);
 const anonymous=path==='/api/orders'||path==='/api/order-pdfs';
 const category=write&&anonymous?'create':path.startsWith('/api/orders/')?'tracking':null;
 if(!category)return null;
 const address=request.headers.get('CF-Connecting-IP');
 // Independent public hosting fails closed if its abuse protection is not configured.
 if(env.AUTH_MODE==='cloudflare'&&(!env.SECURITY_SALT||!env.DB||!address))return deny('Le service est en cours de sécurisation. Réessayez plus tard.',503);
 if(!address||!env.DB||!env.SECURITY_SALT)return null;
 const period=category==='create'?3600:60,limit=category==='create'?30:90,window=Math.floor(Date.now()/1000/period);
 const digest=await crypto.subtle.digest('SHA-256',encoder.encode(env.SECURITY_SALT+'\0'+address));
 const key=category+':'+window+':'+[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
 const row=await env.DB.prepare('INSERT INTO request_limits(key,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(key,(window+1)*period).first();
 if(row.attempts>limit){const r=deny('Trop de tentatives. Patientez avant de réessayer.',429);r.headers.set('Retry-After',String(period));return r;}
 return null;
}
function deny(message,status){return new Response(JSON.stringify({error:message}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
export function secureResponse(response,request,env){
 const h=new Headers(response.headers),url=new URL(request.url);h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','no-referrer');h.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
 h.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'");
 if(h.get('Content-Type')?.includes('text/html'))h.set('Content-Language',url.searchParams.get('lang')==='en'?'en':'fr');
 if(env.AUTH_MODE==='cloudflare'&&url.protocol==='https:')h.set('Strict-Transport-Security','max-age=31536000');
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/order-pdfs/')){h.set('Cache-Control','private, no-store');h.set('X-Robots-Tag','noindex, nofollow, noarchive');}
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}

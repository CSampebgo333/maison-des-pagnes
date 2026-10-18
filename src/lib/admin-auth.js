let cachedKeys={until:0,issuer:'',keys:[]};
export async function isAdmin(request,env){
 if(!env.CATALOGUE_ADMIN_EMAIL)return false;
 if(env.AUTH_MODE!=='cloudflare')return request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.CATALOGUE_ADMIN_EMAIL.toLowerCase();
 // On the independent deployment, never trust an email header supplied by a visitor.
 try {
  if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER??'')||!env.ACCESS_AUD)return false;
  const token=request.headers.get('Cf-Access-Jwt-Assertion');if(!token)return false;
  const parts=token.split('.');if(parts.length!==3)return false;
  const decode=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
  const head=JSON.parse(new TextDecoder().decode(decode(parts[0]))),claims=JSON.parse(new TextDecoder().decode(decode(parts[1]))),now=Date.now()/1000;
  if(head.alg!=='RS256'||claims.iss!==env.ACCESS_ISSUER||!(Array.isArray(claims.aud)?claims.aud:[claims.aud]).includes(env.ACCESS_AUD)||typeof claims.exp!=='number'||claims.exp<=now||claims.nbf&&claims.nbf>now||claims.email?.toLowerCase()!==env.CATALOGUE_ADMIN_EMAIL.toLowerCase())return false;
  if(cachedKeys.until<Date.now()||cachedKeys.issuer!==env.ACCESS_ISSUER){const r=await fetch(env.ACCESS_ISSUER+'/cdn-cgi/access/certs');if(!r.ok)return false;cachedKeys={issuer:env.ACCESS_ISSUER,until:Date.now()+300000,keys:(await r.json()).keys};}
  const jwk=cachedKeys.keys.find(k=>k.kid===head.kid);if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);return crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{return false;}
}

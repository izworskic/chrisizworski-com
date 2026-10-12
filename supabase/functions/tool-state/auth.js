// Signed Vercel identities only. Preview and production use separate namespaces.
const OWNER = 'izworski-gmailcoms-projects';
const OWNER_ID = 'team_SibGYOKdlEddaSrq3xHqX8z0';
const PROJECTS = new Map([
 ['prj_F0YwIFaBlvx5G32DXyzIKhrYas5s', ['chrisizworski-com','chrisizworski']],
 ['prj_2DORRrkvxblIiKFXEbfldT7Pr7nm', ['michigan-trout-report','michigan-trout-report']],
 ['prj_DpjUcNQ2BOJdwpubwzo3IZIh87Kg', ['michigan-birding-report','michigan-birding-report']],
 ['prj_Dmq7b9KsuoBKWkNfAoGoKLd6Zb64', ['michigan-birding-daily','michigan-birding-daily']],
 ['prj_O43nIF4sfbxR8tkmTc9wFguD29ZG', ['lawn-advisor','lawn-advisor']],
]);
const cache = new Map();
const bytes = text => Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
const json = text => JSON.parse(new TextDecoder().decode(bytes(text)));
export async function authorize(token, {fetchImpl = fetch, now = Date.now()} = {}) {
 try {
  if (!token || token.length>12000) return null;
  const parts = token.split('.'); if(parts.length!==3) return null;
  const header=json(parts[0]), claims=json(parts[1]), seconds=now/1000;
  const project = PROJECTS.get(claims.project_id);
  if(!project)return null;
  if(header.alg!=='RS256'||!header.kid||claims.owner!==OWNER||claims.owner_id!==OWNER_ID
   ||claims.project!==project[0]
   ||!['production','preview'].includes(claims.environment)
   ||claims.sub!==`owner:${OWNER}:project:${project[0]}:environment:${claims.environment}`
   ||claims.aud!==`https://vercel.com/${OWNER}`
   ||![`https://oidc.vercel.com/${OWNER}`,'https://oidc.vercel.com'].includes(claims.iss)
   ||!Number.isFinite(claims.exp)||!Number.isFinite(claims.nbf)||!Number.isFinite(claims.iat)
   ||claims.exp<=seconds||claims.nbf>seconds+30||claims.iat>seconds+30||claims.exp-claims.iat>7200) return null;
  let entry=cache.get(claims.iss);
  if(!entry||entry.expiresAt<=now){
   const discovery=await fetchImpl(claims.iss+'/.well-known/openid-configuration',{signal:AbortSignal.timeout(5000)});
   if(!discovery.ok) return null;
   const config=await discovery.json(); const keysUrl=new URL(config.jwks_uri);
   if(keysUrl.protocol!=='https:'||keysUrl.hostname!=='oidc.vercel.com'||keysUrl.username||keysUrl.password) return null;
   const response=await fetchImpl(keysUrl.href,{signal:AbortSignal.timeout(5000)}); if(!response.ok)return null;
   const jwks=await response.json(); entry={keys:jwks.keys,expiresAt:now+60000}; cache.set(claims.iss,entry);
  }
  const jwk=entry.keys.find(key=>key.kid===header.kid&&key.kty==='RSA'); if(!jwk)return null;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))return null;
  return project[1]+':'+claims.environment;
 }catch{return null;}
}
export function clearCache(){cache.clear();}

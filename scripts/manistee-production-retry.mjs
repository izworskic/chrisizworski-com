/* Retry only transient public-origin failures during Manistee smoke testing.
 * Persistent 502s remain failing results. Do not synthesize or cache gauges.
 */
const TRANSIENT=new Set([429,502,503,504]);
const transientNetworkError=e=>e?.name==='TimeoutError'||e?.name==='AbortError'||e instanceof TypeError;

export async function fetchWithBoundedRetry(url,init,{
 fetchImpl=fetch,
 sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
 warn=message=>console.warn(message),
 attempts=3,
 delayMs=1500
}={}){
 if(!Number.isInteger(attempts)||attempts<1||attempts>5||
    !Number.isFinite(delayMs)||delayMs<0||delayMs>10000)
   throw new TypeError('Invalid bounded smoke retry configuration');
 for(let i=1;i<=attempts;i++){
  let response;
  try{
   response=await fetchImpl(url,typeof init==='function'?init():init);
  }catch(error){
   if(i===attempts||!transientNetworkError(error))throw error;
   warn('Manistee smoke transient request failure; retry '+i+'/'+attempts+' ('+String(error?.name||'network')+')');
   await sleep(delayMs*i);
   continue;
  }
  if(!TRANSIENT.has(response.status)||i===attempts)return response;
  // Release the connection before trying again. Never reuse a stale response.
  try{await response.body?.cancel?.();}catch{}
  warn('Manistee smoke upstream HTTP '+response.status+'; retry '+i+'/'+attempts);
  await sleep(delayMs*i);
 }
 throw new Error('Manistee smoke request exhausted without a response');
}

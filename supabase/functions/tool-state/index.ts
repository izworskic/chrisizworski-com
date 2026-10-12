import { authorize } from './auth.js';
const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), {
 status, headers: {'content-type':'application/json','cache-control':'no-store'}
});
Deno.serve(async (req: Request) => {
 if(req.method!=='POST') return reply({error:'method-not-allowed'},405);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
 const namespace=await authorize(token);
 if(!namespace)return reply({error:'unauthorized'},401);
 try{
  if(Number(req.headers.get('content-length')||0)>4*1024*1024)return reply({error:'request-too-large'},413);
  const reader=req.body?.getReader(); let size=0;const chunks:Uint8Array[]=[];
  if(!reader)return reply({error:'invalid-command'},400);
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024){await reader.cancel();return reply({error:'request-too-large'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const args=JSON.parse(new TextDecoder().decode(bytes));
  if(!Array.isArray(args)||args.length>2001)return reply({error:'invalid-command'},400);
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const response=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/tool_state_command',{
   method:'POST',headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},
   body:JSON.stringify({ns:namespace,args}),signal:AbortSignal.timeout(6000)
  });
  if(!response.ok){console.error('tool-state-rpc',response.status);return reply({error:'state-command-failed'},503);}
  return reply({result:await response.json()});
 }catch{return reply({error:'state-command-failed'},503);}
});

/*
 * Optional server-side Rust/WASM shortest-path accelerator for snowmobile
 * routing. No independent trail, closure, access, grooming or weather facts.
 * Input edges come EXCLUSIVELY from buildTrailGraph's already-closed-filtered
 * official Michigan DNR graph. Unknown/broken WASM means JS parity fallback.
 *
 * This module does not alter the API response or the official geometry.
 */
import { WASM_BASE64 } from './rust-binary.mjs';

let engine;
export function getRustEngine(){
  if(engine!==undefined)return engine;
  engine=null;
  if(!WASM_BASE64 || typeof WebAssembly==='undefined')return null;
  try{
    const bytes=Buffer.from(WASM_BASE64,'base64');
    if(bytes.length<8 || bytes.toString('hex',0,4)!=='0061736d')return null;
    const instance=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
    const e=instance.exports;
    if(!e.memory || !['sm_abi_version','sm_max_nodes','sm_max_edges','sm_edge_stride','sm_edges_ptr','sm_path_ptr','sm_solve'].every(k=>typeof e[k]==='function'))return null;
    if(e.sm_abi_version()!==1 || e.sm_edge_stride()!==16 || e.sm_max_nodes()<2 || e.sm_max_edges()<1)return null;
    const buffer=e.memory.buffer;
    const edgePtr=e.sm_edges_ptr()>>>0,pathPtr=e.sm_path_ptr()>>>0;
    if(edgePtr+e.sm_max_edges()*16>buffer.byteLength || pathPtr+e.sm_max_nodes()*4>buffer.byteLength)return null;
    // Smoke-test ABI and orientation before accepting untrusted binary bytes.
    const view=new DataView(buffer);
    view.setUint32(edgePtr,0,true);view.setUint32(edgePtr+4,1,true);view.setFloat64(edgePtr+8,1,true);
    if(e.sm_solve(2,1,0,1)!==1 || view.getUint32(pathPtr,true)!==0)return null;
    if(e.sm_solve(2,1,1,0)!==1 || view.getUint32(pathPtr,true)!==0x80000000)return null;
    engine=e;
  }catch{
    engine=null;
  }
  return engine;
}

/* Return undefined only when the JS algorithm must handle the route;
 * a validated Rust path has the existing shortestPath() result shape.
 * Never accept coordinates, closures or distances produced by WASM itself.
 */
export function shortestPathRust(graph,fromKey,toKey){
  const e=getRustEngine();
  if(!e||fromKey===toKey)return undefined;
  const nodeKeys=[...graph.nodes.keys()],edges=graph.edges;
  if(!nodeKeys.length||nodeKeys.length>e.sm_max_nodes()||edges.length>e.sm_max_edges())return undefined;
  const index=new Map(nodeKeys.map((k,i)=>[k,i]));
  const start=index.get(fromKey),goal=index.get(toKey);
  if(start===undefined||goal===undefined)return undefined;
  try{
    const buf=e.memory.buffer,view=new DataView(buf),offset=e.sm_edges_ptr()>>>0;
    if(offset+edges.length*16>buf.byteLength)return undefined;
    for(let i=0;i<edges.length;i++){
      const edge=edges[i],a=index.get(edge.fromKey),b=index.get(edge.toKey);
      if(a===undefined||b===undefined||!Number.isFinite(edge.miles)||edge.miles<0)return undefined;
      const p=offset+i*16;
      view.setUint32(p,a,true);view.setUint32(p+4,b,true);view.setFloat64(p+8,edge.miles,true);
    }
    const length=e.sm_solve(nodeKeys.length,edges.length,start,goal);
    // For no-path or invalid-input results, independently retain the JS
    // determination rather than trusting WASM to declare a trail unreachable.
    if(length<1||length>nodeKeys.length)return undefined;
    const pathPtr=e.sm_path_ptr()>>>0;
    if(pathPtr+length*4>e.memory.buffer.byteLength)return undefined;
    const result=[],pathView=new DataView(e.memory.buffer);
    let at=fromKey,miles=0;
    for(let i=0;i<length;i++){
      const code=pathView.getUint32(pathPtr+4*i,true);
      const edge=edges[code&0x7fffffff],forward=(code&0x80000000)===0;
      if(!edge)return undefined;
      const expected=forward?edge.fromKey:edge.toKey;
      const next=forward?edge.toKey:edge.fromKey;
      if(expected!==at)return undefined;
      if(edge.props?.band==='CLOSED'||edge.props?.legalState==='CLOSED'||/^closed\b/i.test(String(edge.props?.officialStatus||'')))return undefined;
      result.push({to:next,edge,forward});
      miles+=edge.miles;
      at=next;
    }
    if(at!==toKey||!Number.isFinite(miles))return undefined;
    return {miles,edges:result};
  }catch{
    return undefined;
  }
}

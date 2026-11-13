#!/usr/bin/env node
// CI verification: compiled WASM == shipped ESM payload, ABI and route safety.
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const asset=fs.readFileSync(path.join(__dirname,'../lib/snowmobile/rust-binary.mjs'),'utf8');
const match=asset.match(/export const WASM_BASE64 = ("[A-Za-z0-9+/=]+");/);
assert.ok(match,'Compiled Rust binary not committed; refusing to call this a Rust migration');
const shipped=Buffer.from(JSON.parse(match[1]),'base64');
const compiledArg=process.argv.find(a=>a.startsWith('--wasm='));
if(compiledArg)assert.deepEqual(shipped,fs.readFileSync(compiledArg.slice(7)),'Shipped Rust/WASM does not match pinned source build');
assert.equal(shipped.toString('hex',0,4),'0061736d');
const exp=new WebAssembly.Instance(new WebAssembly.Module(shipped),{}).exports;
assert.equal(exp.sm_abi_version(),1);
assert.equal(exp.sm_edge_stride(),16);
assert.equal(exp.sm_max_nodes(),4096);
assert.equal(exp.sm_max_edges(),16384);
const base=exp.sm_edges_ptr()>>>0,out=exp.sm_path_ptr()>>>0;
// Rust std collections may grow WASM linear memory during Dijkstra; always
// reacquire the ArrayBuffer after a solve rather than keeping a detached view.
const edge=(n,a,b,w)=>{const dv=new DataView(exp.memory.buffer),at=base+n*16;dv.setUint32(at,a,true);dv.setUint32(at+4,b,true);dv.setFloat64(at+8,w,true);};
const read=(index)=>new DataView(exp.memory.buffer).getUint32(out+index*4,true);
edge(0,0,1,1);edge(1,1,2,1);edge(2,0,2,7);
assert.equal(exp.sm_solve(3,3,0,2),2);
assert.deepEqual([read(0),read(1)],[0,1]);
assert.equal(exp.sm_solve(3,3,2,0),2);
assert.deepEqual([read(0),read(1)],[0x80000001,0x80000000]);
assert.equal(exp.sm_solve(3,1,0,2),-1);
edge(0,0,1,-9);assert.equal(exp.sm_solve(2,1,0,1),-2);
console.log('PASS: actual Rust/WASM binary, ABI, reverse routes, disconnections, input validation, source parity');

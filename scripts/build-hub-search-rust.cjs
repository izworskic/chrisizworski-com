#!/usr/bin/env node
// Convert the pinned rustc hub-search WASM build into the committed browser asset.
// This is real compiler output, never a JS reimplementation of the binary.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const wasmArg=process.argv.find(a=>a.startsWith('--wasm='));
if(!wasmArg)throw Error('Usage: node scripts/build-hub-search-rust.cjs --wasm=/path/hub-search.wasm');
const wasm=fs.readFileSync(wasmArg.slice(7));
if(wasm.subarray(0,4).toString('hex')!=='0061736d')throw Error('Input is not WebAssembly');
fs.writeFileSync(path.join(__dirname,'../public/assets/hub-search.wasm.b64'),wasm.toString('base64')+'\n');
console.log('Hub search Rust/WASM asset written:',wasm.length,'bytes');

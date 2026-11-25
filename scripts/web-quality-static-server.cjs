#!/usr/bin/env node
'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon'};
http.createServer((req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}
 catch{res.writeHead(400).end();return;}
 const target=path.resolve(root,'.'+pathname);
 if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 let file=target;
 try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.statSync(file).isFile())throw Error('not found');}
 catch{res.writeHead(404).end('Not found');return;}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
}).listen(4179,'127.0.0.1',()=>console.log('Web Quality static fixture server ready'));

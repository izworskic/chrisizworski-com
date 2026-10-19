// Local/CI preview: serve committed public output and the actual existing ice handler.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import ice from '../api/ice.js';
const root=path.resolve('public');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.json':'application/json'};
http.createServer(async(req,res)=>{
 try{const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/api/ice'){const response=await ice(new Request(u,{method:req.method}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
 let f=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!f.startsWith(root+path.sep))throw Error('path');
 if((await fs.stat(f)).isDirectory())f=path.join(f,'index.html');const data=await fs.readFile(f);res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT)||4177,'127.0.0.1',()=>console.log('Ice caves preview at http://127.0.0.1:4177'));

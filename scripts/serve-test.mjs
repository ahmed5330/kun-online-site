import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {canonicalLocation} from '../_worker.js';
const root=path.resolve(import.meta.dirname,'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.xml':'application/xml','.txt':'text/plain','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
export function serve(port=0){
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');const redirect=canonicalLocation('https://kun-online.com'+u.pathname+u.search);
  if(redirect){const canonical=new URL(redirect);res.writeHead(301,{Location:canonical.pathname+canonical.search});return res.end();}
  let relative;try{relative=decodeURIComponent(u.pathname);}catch{res.writeHead(400);return res.end();}
  let f=path.resolve(root,'.'+relative);
  if(!f.startsWith(root+path.sep)&&f!==root){res.writeHead(403);return res.end();}
  if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
  if(!fs.existsSync(f)&&fs.existsSync(f+'.html'))f+='.html';
  let status=200;
  if(!fs.existsSync(f)||!fs.statSync(f).isFile()){f=path.join(root,'404.html');status=404;}
  res.writeHead(status,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});
  if(req.method==='HEAD')return res.end();fs.createReadStream(f).pipe(res);
});return new Promise(resolve=>server.listen(port,'127.0.0.1',()=>resolve(server)));
}
if(process.argv[1]===import.meta.filename){const s=await serve(4173);console.log('Site preview on http://127.0.0.1:4173');}

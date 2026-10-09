import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)), PUB=path.join(ROOT,"public"), PORT=Number(process.env.PORT||8787);
const busy=new Set(["PC 02","PC 04","PC 09","PC 17","PC 28","PC 33","PS5 2"]);
const stations=[...Array.from({length:40},(_,i)=>{const n="PC "+String(i+1).padStart(2,"0");return{id:n,name:n,type:"PC",zone:"Arena "+String.fromCharCode(65+Math.floor(i/10)),status:busy.has(n)?"busy":"free"}}),...Array.from({length:4},(_,i)=>{const n="PS5 "+(i+1);return{id:n,name:n,type:"Console",zone:"Consoles",status:busy.has(n)?"busy":"free"}})];
const events=[{id:"sexta",title:"Corujão Sexta",date:"09/10/2026",time:"23:00–06:00",capacity:40},{id:"halloween",title:"Corujão Halloween",date:"30/10/2026",time:"22:00–07:00",capacity:40}];
const reserved=new Set(Array.from({length:14},(_,i)=>"halloween:PC "+String(i+1).padStart(2,"0")));
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",".svg":"image/svg+xml",".webmanifest":"application/manifest+json"};
function send(res,n,x){res.writeHead(n,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});res.end(JSON.stringify(x))}
async function body(req){let s="";for await(const c of req)s+=c;return s?JSON.parse(s):{}}
http.createServer(async(req,res)=>{try{const u=new URL(req.url,"http://localhost");
if(u.pathname==="/api/health")return send(res,200,{ok:true,version:"1.0.0",mode:"demo"});
if(u.pathname==="/api/me")return send(res,200,{user:{name:"Cliente Demo",email:"cliente@net4fun.app",remainingMinutes:522}});
if(u.pathname==="/api/stations")return send(res,200,{source:"demo",stations});
if(u.pathname==="/api/events"&&req.method==="GET")return send(res,200,{events:events.map(e=>{const taken=[...reserved].filter(x=>x.startsWith(e.id+":")).map(x=>x.split(":")[1]);return{...e,reservedCount:taken.length,freeCount:e.capacity-taken.length,stations:stations.filter(s=>s.type==="PC").map(s=>({...s,reserved:taken.includes(s.name)}))}})});
const m=u.pathname.match(/^\/api\/events\/([^/]+)\/reserve$/);if(m&&req.method==="POST"){const b=await body(req),key=decodeURIComponent(m[1])+":"+String(b.stationId||"");if(!b.stationId)return send(res,400,{error:"Escolha um PC"});if(reserved.has(key))return send(res,409,{error:"Esse PC já foi reservado"});reserved.add(key);return send(res,201,{ok:true})}
let rel=u.pathname==="/"?"/index.html":decodeURIComponent(u.pathname);if(rel.includes(".."))return send(res,403,{error:"Acesso negado"});const f=path.join(PUB,rel);if(f.startsWith(PUB)&&fs.existsSync(f)&&fs.statSync(f).isFile()){const ext=path.extname(f);res.writeHead(200,{"Content-Type":mime[ext]||"application/octet-stream","Cache-Control":rel==="/sw.js"||ext===".html"||ext===".webmanifest"?"no-cache":"public, max-age=3600"});return fs.createReadStream(f).pipe(res)}send(res,404,{error:"Não encontrado"})}catch(e){console.error(e);send(res,500,{error:"Erro interno"})}}).listen(PORT,()=>console.log("Net4Fun Hub online"));

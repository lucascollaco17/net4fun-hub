import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PUB=path.join(ROOT,"public");
const PORT=Number(process.env.PORT||8787);

const busy=new Set(["PC 02","PC 04","PC 09","PC 17","PC 28","PC 33","PS5 2"]);
const stations=[
  ...Array.from({length:40},(_,i)=>{
    const n="PC "+String(i+1).padStart(2,"0");
    const tier=i<32?"normal":"vip";
    return {id:n,name:n,type:"PC",tier,zone:tier==="vip"?"Área VIP":"Área "+String.fromCharCode(65+Math.floor(i/8)),status:busy.has(n)?"busy":"free"};
  }),
  ...Array.from({length:4},(_,i)=>{
    const n="PS5 "+(i+1);
    return {id:n,name:n,type:"Console",tier:"console",zone:"Consoles",status:busy.has(n)?"busy":"free"};
  })
];

const event={
  id:"corujao-sabado",
  title:"Corujão Net4Fun",
  schedule:"Todos os sábados",
  time:"23:00–06:00",
  capacity:40
};
const reserved=new Set(["corujao-sabado:PC 03","corujao-sabado:PC 07","corujao-sabado:PC 12","corujao-sabado:PC 34"]);
const reports=[];

const mime={
  ".html":"text/html; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".js":"application/javascript; charset=utf-8",
  ".svg":"image/svg+xml",
  ".webmanifest":"application/manifest+json"
};

function send(res,status,data){
  res.writeHead(status,{
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff"
  });
  res.end(JSON.stringify(data));
}
async function body(req){
  let s="";
  for await(const c of req){
    s+=c;
    if(s.length>100000)throw new Error("Payload grande demais");
  }
  return s?JSON.parse(s):{};
}

http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,"http://localhost");

    if(u.pathname==="/api/health")return send(res,200,{ok:true,version:"2.0.0",mode:"demo"});
    if(u.pathname==="/api/me")return send(res,200,{user:{
      name:"Cliente Demo",
      login:"cliente.demo",
      remainingMinutes:522
    }});
    if(u.pathname==="/api/stations")return send(res,200,{source:"demo",stations});

    if(u.pathname==="/api/events"&&req.method==="GET"){
      const taken=[...reserved].filter(x=>x.startsWith(event.id+":")).map(x=>x.split(":")[1]);
      return send(res,200,{events:[{
        ...event,
        reservedCount:taken.length,
        freeCount:event.capacity-taken.length,
        stations:stations.filter(s=>s.type==="PC").map(s=>({...s,reserved:taken.includes(s.name)}))
      }]});
    }

    const reserveMatch=u.pathname.match(/^\/api\/events\/([^/]+)\/reserve$/);
    if(reserveMatch&&req.method==="POST"){
      const b=await body(req);
      const eventId=decodeURIComponent(reserveMatch[1]);
      const stationId=String(b.stationId||"");
      if(eventId!==event.id)return send(res,404,{error:"Evento não encontrado"});
      if(!stationId)return send(res,400,{error:"Escolha um PC"});
      const key=eventId+":"+stationId;
      if(reserved.has(key))return send(res,409,{error:"Esse PC já foi reservado"});
      reserved.add(key);
      return send(res,201,{ok:true,reservation:{id:crypto.randomUUID(),eventId,stationId}});
    }

    if(u.pathname==="/api/support"&&req.method==="POST"){
      const b=await body(req);
      if(!String(b.message||"").trim())return send(res,400,{error:"Descreva o problema"});
      const item={id:crypto.randomUUID(),login:b.login||"cliente.demo",category:b.category||"outro",message:String(b.message).trim(),createdAt:new Date().toISOString()};
      reports.push(item);
      return send(res,201,{ok:true,id:item.id});
    }

    if(u.pathname==="/api/purchase-intent"&&req.method==="POST"){
      const b=await body(req);
      const hours=Number(b.hours||0);
      if(![1,3,5,10].includes(hours))return send(res,400,{error:"Pacote inválido"});
      return send(res,201,{ok:true,id:crypto.randomUUID(),hours,status:"demo"});
    }

    const rel=u.pathname==="/"?"/index.html":decodeURIComponent(u.pathname);
    if(rel.includes(".."))return send(res,403,{error:"Acesso negado"});
    const file=path.join(PUB,rel);
    if(file.startsWith(PUB)&&fs.existsSync(file)&&fs.statSync(file).isFile()){
      const ext=path.extname(file);
      res.writeHead(200,{
        "Content-Type":mime[ext]||"application/octet-stream",
        "Cache-Control":rel==="/sw.js"||ext===".html"||ext===".webmanifest"?"no-cache":"public, max-age=3600"
      });
      return fs.createReadStream(file).pipe(res);
    }

    send(res,404,{error:"Não encontrado"});
  }catch(e){
    console.error(e);
    if(!res.headersSent)send(res,500,{error:"Erro interno"});
    else res.end();
  }
}).listen(PORT,()=>console.log("Net4Fun Hub v2 online"));
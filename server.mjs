import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {Pool} from "pg";

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PUB=path.join(ROOT,"public");
const PORT=Number(process.env.PORT||8787);

const busy=new Set(["PC 02","PC 04","PC 09","PC 17","PC 28","PC 33","PS5 2"]);
const stations=[
  ...Array.from({length:38},(_,i)=>{
    const n="PC "+String(i+1).padStart(2,"0");
    const tier=i<32?"normal":"vip";
    return {id:n,name:n,type:"PC",tier,zone:tier==="vip"?"Área VIP":"Área "+String.fromCharCode(65+Math.floor(i/8)),status:busy.has(n)?"busy":"free"};
  }),
  ...Array.from({length:6},(_,i)=>{
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

const defaults={
  reservations:["corujao-sabado:PC 03","corujao-sabado:PC 07","corujao-sabado:PC 12","corujao-sabado:PC 34"],
  reports:[],
  games:{
    pc:["Counter-Strike 2","VALORANT","League of Legends","Fortnite","GTA V","Minecraft","Rocket League","Roblox","Dota 2","Overwatch 2"],
    console:["EA SPORTS FC","GTA V","Fortnite","Mortal Kombat","Call of Duty","Tekken","Rocket League","Minecraft"]
  },
  suggestions:[],
  announcements:[],
  demoPassword:"demo1234"
};
const memoryState=JSON.parse(JSON.stringify(defaults));
const adminTokens=new Map();

const pool=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL}):null;
let databaseReady=false;

async function initDb(){
  if(!pool)return;
  try{
    await pool.query("CREATE TABLE IF NOT EXISTS net4fun_state (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    for(const [key,value] of Object.entries(defaults)){
      await pool.query(
        "INSERT INTO net4fun_state(key,value) VALUES($1,$2::jsonb) ON CONFLICT(key) DO NOTHING",
        [key,JSON.stringify(value)]
      );
    }
    databaseReady=true;
    console.log("[storage] Postgres conectado");
  }catch(err){
    databaseReady=false;
    console.error("[storage] Postgres indisponível, usando memória:",err.message);
  }
}
async function getState(key){
  if(databaseReady){
    const r=await pool.query("SELECT value FROM net4fun_state WHERE key=$1",[key]);
    if(r.rows[0])return r.rows[0].value;
  }
  return memoryState[key];
}
async function setState(key,value){
  memoryState[key]=value;
  if(databaseReady){
    await pool.query(
      "INSERT INTO net4fun_state(key,value,updated_at) VALUES($1,$2::jsonb,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()",
      [key,JSON.stringify(value)]
    );
  }
}
function adminAuthorized(req){
  const raw=String(req.headers.authorization||"");
  const token=raw.startsWith("Bearer ")?raw.slice(7):"";
  return token&&adminTokens.has(token);
}

const mime={
  ".html":"text/html; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".js":"application/javascript; charset=utf-8",
  ".svg":"image/svg+xml",
  ".webp":"image/webp",
  ".png":"image/png",
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

const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,"http://localhost");
    console.log("[request]",req.method,u.pathname);

    if(u.pathname==="/api/health")return send(res,200,{ok:true,version:"3.3.0",mode:"demo",storage:databaseReady?"postgres":"memory"});

    if(u.pathname==="/api/me"){
      const demoPassword=await getState("demoPassword");
      return send(res,200,{user:{
        name:"Cliente Demo",
        login:"cliente.demo",
        remainingMinutes:522,
        normalMinutes:522,
        vipMinutes:180,
        demoPassword
      }});
    }

    if(u.pathname==="/api/stations")return send(res,200,{source:"demo",stations});

    if(u.pathname==="/api/games"&&req.method==="GET"){
      return send(res,200,{games:await getState("games")});
    }

    if(u.pathname==="/api/announcements"&&req.method==="GET"){
      const announcements=await getState("announcements");
      return send(res,200,{announcements:[...announcements].reverse()});
    }

    if(u.pathname==="/api/events"&&req.method==="GET"){
      const reservations=await getState("reservations");
      const taken=reservations.filter(x=>x.startsWith(event.id+":")).map(x=>x.split(":")[1]);
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
      const reservations=await getState("reservations");
      const key=eventId+":"+stationId;
      if(reservations.includes(key))return send(res,409,{error:"Esse PC já foi reservado"});
      reservations.push(key);
      await setState("reservations",reservations);
      return send(res,201,{ok:true,reservation:{id:crypto.randomUUID(),eventId,stationId}});
    }

    if(u.pathname==="/api/support"&&req.method==="POST"){
      const b=await body(req);
      if(!String(b.message||"").trim())return send(res,400,{error:"Descreva o problema"});
      const reports=await getState("reports");
      const item={id:crypto.randomUUID(),login:b.login||"cliente.demo",category:b.category||"outro",message:String(b.message).trim(),createdAt:new Date().toISOString()};
      reports.unshift(item);
      await setState("reports",reports);
      return send(res,201,{ok:true,id:item.id});
    }

    if(u.pathname==="/api/suggestions"&&req.method==="POST"){
      const b=await body(req);
      const type=String(b.type||"game");
      const message=String(b.message||"").trim();
      const game=String(b.game||"").trim();
      const platform=String(b.platform||"pc").toLowerCase();
      if(type==="game"){
        if(!game)return send(res,400,{error:"Informe o nome do jogo"});
        if(!["pc","console"].includes(platform))return send(res,400,{error:"Plataforma inválida"});
      }else if(!message){
        return send(res,400,{error:"Escreva sua sugestão"});
      }
      const suggestions=await getState("suggestions");
      const item={
        id:crypto.randomUUID(),
        type,
        game:type==="game"?game:null,
        platform:type==="game"?platform:null,
        message,
        login:String(b.login||"cliente.demo"),
        status:"pending",
        createdAt:new Date().toISOString()
      };
      suggestions.unshift(item);
      await setState("suggestions",suggestions);
      return send(res,201,{ok:true,suggestion:item});
    }

    if(u.pathname==="/api/admin/login"&&req.method==="POST"){
      const b=await body(req);
      const login=String(b.login||"").trim().toLowerCase();
      const password=String(b.password||"");
      if(!/^[a-z0-9]+\.[a-z0-9]+\.adm$/i.test(login))return send(res,401,{error:"Use o padrão nome.sobrenome.adm"});
      if(password!=="admin123")return send(res,401,{error:"Senha de teste incorreta"});
      const token=crypto.randomUUID();
      adminTokens.set(token,{login,createdAt:Date.now()});
      return send(res,200,{ok:true,token,admin:{login}});
    }

    if(u.pathname==="/api/admin/suggestions"&&req.method==="GET"){
      if(!adminAuthorized(req))return send(res,401,{error:"Acesso administrativo necessário"});
      return send(res,200,{suggestions:await getState("suggestions")});
    }

    const suggestionAction=u.pathname.match(/^\/api\/admin\/suggestions\/([^/]+)\/(approve|reject)$/);
    if(suggestionAction&&req.method==="POST"){
      if(!adminAuthorized(req))return send(res,401,{error:"Acesso administrativo necessário"});
      const id=decodeURIComponent(suggestionAction[1]);
      const action=suggestionAction[2];
      const suggestions=await getState("suggestions");
      const item=suggestions.find(x=>x.id===id);
      if(!item)return send(res,404,{error:"Sugestão não encontrada"});
      if(item.status!=="pending")return send(res,409,{error:"Essa sugestão já foi analisada"});
      const admin=adminTokens.get(String(req.headers.authorization||"").replace(/^Bearer /,""));
      item.status=action==="approve"?"approved":"rejected";
      item.reviewedAt=new Date().toISOString();
      item.reviewedBy=admin?.login||"admin";

      const games=await getState("games");
      const announcements=await getState("announcements");

      if(action==="approve"&&item.type==="game"){
        const list=games[item.platform];
        if(list&&!list.some(g=>g.toLowerCase()===String(item.game).toLowerCase()))list.push(item.game);
        const platformLabel=item.platform==="pc"?"PC":"Console";
        announcements.push({
          id:crypto.randomUUID(),
          kind:"game-added",
          title:"Novo jogo disponível!",
          message:item.game+" foi adicionado à biblioteca de "+platformLabel+".",
          game:item.game,
          platform:item.platform,
          createdAt:new Date().toISOString()
        });
        await setState("games",games);
        await setState("announcements",announcements);
      }
      await setState("suggestions",suggestions);
      return send(res,200,{ok:true,suggestion:item,games});
    }

    if(u.pathname==="/api/purchase-intent"&&req.method==="POST"){
      const b=await body(req);
      const hours=Number(b.hours||0);
      const type=String(b.type||"normal");
      const allowed={normal:{1:4,3:11,5:18},vip:{1:7,3:18,5:32}};
      if(!allowed[type]||!allowed[type][hours])return send(res,400,{error:"Pacote inválido"});
      return send(res,201,{ok:true,id:crypto.randomUUID(),type,hours,price:allowed[type][hours],status:"demo"});
    }

    if(u.pathname==="/api/password"&&req.method==="POST"){
      const b=await body(req);
      const password=String(b.password||"");
      if(password.length<4)return send(res,400,{error:"Senha muito curta"});
      await setState("demoPassword",password);
      return send(res,200,{ok:true,status:"demo"});
    }

    const rel=u.pathname==="/"?"/index.html":decodeURIComponent(u.pathname);
    if(rel.includes(".."))return send(res,403,{error:"Acesso negado"});
    const file=path.join(PUB,rel);
    if(file.startsWith(PUB)&&fs.existsSync(file)&&fs.statSync(file).isFile()){
      const ext=path.extname(file);
      res.writeHead(200,{
        "Content-Type":mime[ext]||"application/octet-stream",
        "Cache-Control":"no-store, no-cache, must-revalidate, max-age=0",
        "Pragma":"no-cache",
        "Expires":"0"
      });
      return fs.createReadStream(file).pipe(res);
    }

    send(res,404,{error:"Não encontrado"});
  }catch(e){
    console.error(e);
    if(!res.headersSent)send(res,500,{error:"Erro interno"});
    else res.end();
  }
});

await initDb();
server.listen(PORT,()=>console.log("Net4Fun Hub v3.3 online - storage:",databaseReady?"postgres":"memory"));

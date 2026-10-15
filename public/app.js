let s={
  tab:new URLSearchParams(location.search).get("tab")||"home",
  stations:[],
  events:[],
  me:null,
  device:"pc",
  selectedEventPc:null,
  showPassword:false,
  installPrompt:null
};

const A=document.querySelector("#app");
const q=(u,o)=>fetch(u,o).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||"Erro");return j});
const mins=n=>String(Math.floor((n||0)/60)).padStart(2,"0")+"h "+String((n||0)%60).padStart(2,"0")+"min";
const money=v=>Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

function toast(t,ms=3000){
  const d=document.createElement("div");
  d.className="toast";
  d.textContent=t;
  document.body.append(d);
  setTimeout(()=>d.remove(),ms);
}

async function load(){
  try{
    const [m,p,e]=await Promise.all([q("/api/me"),q("/api/stations"),q("/api/events")]);
    s.me=m.user;
    s.stations=p.stations||[];
    s.events=e.events||[];
    render();
  }catch(e){toast(e.message)}
}

function normalMinutes(){return s.me?.normalMinutes ?? s.me?.remainingMinutes ?? 0}
function vipMinutes(){return s.me?.vipMinutes ?? 0}
function statusLabel(status){return status==="busy"?"Em uso":"Liberado"}
function count(type,status){
  return s.stations.filter(p=>(type==="pc"?p.type==="PC":p.type==="Console")&&(!status||p.status===status)).length;
}
function byName(name){return s.stations.find(p=>p.name===name)}

function header(){
  return '<header class="app-header">'+
    '<div class="brand-panel"><img src="/net4fun-logo.webp?v=16" alt="Net4Fun"></div>'+
    '<div class="balance-stack">'+
      '<div class="balance"><span>Horas normais</span><strong>'+mins(normalMinutes())+'</strong></div>'+
      '<div class="balance vip-balance"><span>Horas VIP</span><strong>'+mins(vipMinutes())+'</strong></div>'+
    '</div>'+
  '</header>';
}

const pcGames=["Counter-Strike 2","VALORANT","League of Legends","Fortnite","GTA V","Minecraft","Rocket League","Roblox","Dota 2","Overwatch 2"];
const consoleGames=["EA SPORTS FC","GTA V","Fortnite","Mortal Kombat","Call of Duty","Tekken","Rocket League","Minecraft"];

function gameLibrary(){
  const games=s.device==="pc"?pcGames:consoleGames;
  return '<section class="library-card">'+
    '<div class="section-kicker">Biblioteca de jogos</div>'+
    '<div class="game-strip" aria-label="Biblioteca de jogos">'+
      games.map((g,i)=>'<article class="game-card"><div class="game-mark">'+String(i+1).padStart(2,"0")+'</div><strong>'+g+'</strong><small>'+(s.device==="pc"?"PC":"Console")+'</small></article>').join("")+
    '</div>'+
  '</section>';
}

function pcSeat(name,inactive=false){
  const p=byName(name);
  const cls=inactive?"inactive":(p?.status==="busy"?"busy":"free");
  return '<button class="map-pc '+cls+'" '+(inactive?'disabled':'')+' title="'+name+(inactive?"":(" • "+statusLabel(p?.status)))+'"><span>'+name.replace("PC ","")+'</span></button>';
}
function pcRange(a,b,inactive=false){
  let out="";
  for(let i=a;i<=b;i++)out+=pcSeat("PC "+String(i).padStart(2,"0"),inactive);
  return out;
}
function ps5Seat(name,cls,inactive=false){
  const p=byName(name);
  const state=inactive?"inactive":(p?.status==="busy"?"busy":"free");
  return '<div class="map-ps5 '+cls+' '+state+'" title="'+name+(inactive?"":(" • "+statusLabel(p?.status)))+'"><i></i><span><b>PS5</b><em>'+(inactive?"":statusLabel(p?.status))+'</em></span></div>';
}

function floorPlan(mode){
  const pcInactive=mode==="console";
  const psInactive=mode==="pc";
  return '<div class="floor-scroll"><div class="floor">'+
    '<div class="zone bathrooms"></div>'+
    '<div class="zone common">ÁREA COMUM</div>'+
    '<div class="desk desk-left">'+pcRange(1,14,pcInactive)+'</div>'+
    '<div class="desk desk-center">'+pcRange(15,28,pcInactive)+'</div>'+
    '<div class="desk desk-right">'+pcRange(29,40,pcInactive)+'</div>'+
    '<div class="vip-zone vip-one">VIP</div>'+
    '<div class="vip-zone vip-two">VIP</div>'+
    '<div class="wall wall-left-top"></div>'+
    '<div class="wall wall-left-bottom"></div>'+
    '<div class="wall wall-middle-bottom"></div>'+
    '<div class="wall wall-right-bottom"></div>'+
    '<div class="zone reception">RECEPÇÃO</div>'+
    ps5Seat("PS5 1","ps-one",psInactive)+
    ps5Seat("PS5 2","ps-two",psInactive)+
    ps5Seat("PS5 3","ps-three",psInactive)+
    ps5Seat("PS5 4","ps-four",psInactive)+
    ps5Seat("PS5 5","ps-five",psInactive)+
    ps5Seat("PS5 6","ps-six",psInactive)+
    ps5Seat("PS5 7","ps-seven",psInactive)+
    ps5Seat("PS5 8","ps-eight",psInactive)+
  '</div></div>';
}

function home(){
  const isPc=s.device==="pc";
  return header()+
    '<section class="device-tabs">'+
      '<button class="'+(isPc?"active":"")+'" data-device="pc">PC</button>'+
      '<button class="'+(!isPc?"active":"")+'" data-device="console">Console</button>'+
    '</section>'+
    gameLibrary()+
    '<section class="equipment-card">'+
      '<div class="equipment-head"><div><span class="section-kicker">'+(isPc?"Computadores":"Consoles")+'</span><h2>Disponibilidade</h2></div>'+
      '<div class="status-summary"><span><i class="dot free"></i>'+count(isPc?"pc":"console","free")+' liberados</span><span><i class="dot busy"></i>'+count(isPc?"pc":"console","busy")+' em uso</span></div></div>'+
      floorPlan(s.device)+
    '</section>';
}

function nextSaturday(){
  const d=new Date();
  const day=d.getDay();
  let add=(6-day+7)%7;
  if(add===0 && d.getHours()>=23)add=7;
  d.setDate(d.getDate()+add);
  return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"});
}

function eventPc(name,e){
  const p=e.stations.find(x=>x.name===name);
  const reserved=!!p?.reserved;
  const selected=s.selectedEventPc===name;
  const cls=reserved?"reserved":selected?"selected":"free";
  const label=reserved?"Reservado":selected?"Selecionado":"Liberado";
  return '<button class="map-pc event-pc '+cls+'" data-event-pc="'+name+'" '+(reserved?'disabled':'')+' title="'+name+' • '+label+'"><span>'+name.replace("PC ","")+'</span><em>'+label+'</em></button>';
}
function eventPcRange(a,b,e){
  let out="";
  for(let i=a;i<=b;i++)out+=eventPc("PC "+String(i).padStart(2,"0"),e);
  return out;
}
function eventConsole(cls){
  return '<div class="map-ps5 event-console '+cls+' unavailable"><i></i><span><b>PS5</b><em>Indisponível</em></span></div>';
}
function eventFloor(e){
  return '<div class="floor-scroll"><div class="floor event-floor">'+
    '<div class="zone bathrooms"></div>'+
    '<div class="zone common">ÁREA COMUM</div>'+
    '<div class="desk desk-left">'+eventPcRange(1,14,e)+'</div>'+
    '<div class="desk desk-center">'+eventPcRange(15,28,e)+'</div>'+
    '<div class="desk desk-right">'+eventPcRange(29,40,e)+'</div>'+
    '<div class="vip-zone vip-one">VIP</div>'+
    '<div class="vip-zone vip-two">VIP</div>'+
    '<div class="wall wall-left-top"></div>'+
    '<div class="wall wall-left-bottom"></div>'+
    '<div class="wall wall-middle-bottom"></div>'+
    '<div class="wall wall-right-bottom"></div>'+
    '<div class="zone reception">RECEPÇÃO</div>'+
    eventConsole("ps-one")+eventConsole("ps-two")+eventConsole("ps-three")+eventConsole("ps-four")+
    eventConsole("ps-five")+eventConsole("ps-six")+eventConsole("ps-seven")+eventConsole("ps-eight")+
  '</div></div>';
}

function events(){
  const e=s.events[0];
  if(!e)return header()+'<section class="panel"><h2>Corujão</h2><p>Nenhum evento disponível.</p></section>';
  const free=e.stations.filter(x=>!x.reserved).length;
  const reserved=e.stations.filter(x=>x.reserved).length;
  return header()+
    '<section class="event-top">'+
      '<div class="event-image"><img src="/corujao-net4fun-hq-v16.webp?v=16" alt="Corujão Net4Fun"></div>'+
      '<div class="event-side">'+
        '<div class="event-date"><span class="section-kicker">Próximo Corujão</span><strong>'+nextSaturday()+'</strong><small>23:00 às 06:00</small></div>'+
        '<div class="reservation-box"><span class="section-kicker">Reserva</span>'+
          '<h3>'+(s.selectedEventPc?s.selectedEventPc:"Escolha um computador")+'</h3>'+
          '<p>'+(s.selectedEventPc?"Confirme abaixo para reservar este PC.":"Selecione abaixo um PC liberado para o próximo Corujão.")+'</p>'+
          '<div class="reservation-meta"><span>'+free+' liberados</span><span>'+reserved+' reservados</span></div>'+
          '<div class="payment-note">Pagamento da reserva: <b>a definir pela Net4Fun</b></div>'+
          (s.selectedEventPc?'<button class="primary-action" data-action="confirm-reservation">Confirmar reserva</button>':'')+
        '</div>'+
      '</div>'+
    '</section>'+
    '<section class="event-map-card"><div class="equipment-head"><div><span class="section-kicker">Mapa do Corujão</span><h2>PCs liberados e reservados</h2></div><div class="status-summary"><span><i class="dot free"></i>Liberado</span><span><i class="dot reserved"></i>Reservado</span></div></div>'+
      eventFloor(e)+
    '</section>';
}

async function confirmReservation(){
  const e=s.events[0];
  const pc=s.selectedEventPc;
  if(!e||!pc)return;
  if(!confirm("Confirmar a reserva do "+pc+" para o Corujão de "+nextSaturday()+"?"))return;
  try{
    await q("/api/events/"+encodeURIComponent(e.id)+"/reserve",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({stationId:pc})
    });
    s.selectedEventPc=null;
    toast(pc+" reservado com sucesso.");
    await load();
    s.tab="events";
    render();
  }catch(err){toast(err.message)}
}

const packages=[
  {type:"normal",hours:1,price:4},
  {type:"normal",hours:3,price:11},
  {type:"normal",hours:5,price:18},
  {type:"vip",hours:1,price:7},
  {type:"vip",hours:3,price:18},
  {type:"vip",hours:5,price:32}
];

function account(){
  const normal=packages.filter(p=>p.type==="normal");
  const vip=packages.filter(p=>p.type==="vip");
  const shown=s.showPassword?(s.me?.demoPassword||"demo1234"):"••••••••";
  return header()+
    '<section class="credentials-card">'+
      '<span class="section-kicker">Credenciais de login</span>'+
      '<div class="credential-row"><span>Login</span><strong>'+(s.me?.login||"—")+'</strong></div>'+
      '<div class="credential-row password-row"><span>Senha</span><strong>'+shown+'</strong><button class="password-toggle" data-action="toggle-password">'+(s.showPassword?"Ocultar":"Mostrar")+'</button></div>'+
      '<button class="secondary-action" data-action="password">Alterar senha</button>'+
    '</section>'+
    '<section class="hours-section">'+
      '<div class="hours-title"><span class="section-kicker">Opções para adicionar horas</span><h2>Escolha um pacote</h2></div>'+
      '<div class="package-columns">'+
        '<div class="package-column"><div class="package-column-title">Horas normais</div>'+normal.map(p=>packageCard(p)).join("")+'</div>'+
        '<div class="package-column"><div class="package-column-title">Horas VIP</div>'+vip.map(p=>packageCard(p)).join("")+'</div>'+
      '</div>'+
      '<button class="install-button" data-action="install-app">Instalar aplicativo</button>'+
      '<p class="install-help">No Android, o navegador abrirá a instalação quando disponível. No iPhone, use Compartilhar → Adicionar à Tela de Início.</p>'+
    '</section>';
}
function packageCard(p){
  return '<button class="package-card '+p.type+'" data-package="'+p.type+':'+p.hours+':'+p.price+'">'+
    '<span>'+(p.type==="normal"?"Hora normal":"Hora VIP")+'</span>'+
    '<strong>'+p.hours+' '+(p.hours===1?"hora":"horas")+'</strong>'+
    '<b>'+money(p.price)+'</b>'+
  '</button>';
}

function modal(html){
  const m=document.createElement("div");
  m.className="modal";
  m.innerHTML='<div class="modalbox">'+html+'</div>';
  document.body.append(m);
  m.addEventListener("click",e=>{if(e.target===m)m.remove()});
  return m;
}

function openPassword(){
  const m=modal('<div class="modal-head"><div><span class="section-kicker">Conta</span><h2>Alterar senha</h2></div><button class="ghost" data-close>Fechar</button></div>'+
    '<label class="field"><span>Nova senha</span><input id="newPass" type="password" autocomplete="new-password"></label>'+
    '<label class="field"><span>Confirmar nova senha</span><input id="confirmPass" type="password" autocomplete="new-password"></label>'+
    '<button class="primary-action full" id="savePass">Salvar nova senha</button>');
  m.querySelector("[data-close]").onclick=()=>m.remove();
  m.querySelector("#savePass").onclick=async()=>{
    const a=m.querySelector("#newPass").value;
    const b=m.querySelector("#confirmPass").value;
    if(a.length<4){toast("Use uma senha com pelo menos 4 caracteres.");return}
    if(a!==b){toast("As senhas não conferem.");return}
    try{
      await q("/api/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:a})});
      m.remove();
      toast("Senha atualizada no modo de demonstração.");
    }catch(e){toast(e.message)}
  };
}

async function buyPackage(type,hours,price){
  const label=type==="vip"?"VIP":"normal";
  if(!confirm("Confirmar pacote de "+hours+"h "+label+" por "+money(price)+"?"))return;
  try{
    await q("/api/purchase-intent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,hours,price})});
    toast("Pacote selecionado. Pagamento será conectado antes do lançamento.");
  }catch(e){toast(e.message)}
}

async function installApp(){
  if(s.installPrompt){
    s.installPrompt.prompt();
    try{await s.installPrompt.userChoice}catch(e){}
    s.installPrompt=null;
    return;
  }
  const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(isiOS)toast("No iPhone: toque em Compartilhar e depois em Adicionar à Tela de Início.",5000);
  else toast("Abra o menu do navegador e toque em Instalar app / Adicionar à tela inicial.",5000);
}
window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();
  s.installPrompt=e;
});

function bottomNav(){
  const items=[["home","Início"],["events","Corujão"],["account","Conta"]];
  return '<nav class="bottom-nav">'+items.map(([id,label])=>
    '<button class="'+(s.tab===id?"active":"")+'" data-tab="'+id+'">'+label+'</button>'
  ).join("")+'</nav>';
}

function render(){
  if(!["home","events","account"].includes(s.tab))s.tab="home";
  A.innerHTML='<main class="app-shell">'+(s.tab==="home"?home():s.tab==="events"?events():account())+'</main>'+bottomNav();
}

document.addEventListener("click",e=>{
  const tab=e.target.closest("[data-tab]");
  if(tab){s.tab=tab.dataset.tab;s.selectedEventPc=null;render();return}
  const device=e.target.closest("[data-device]");
  if(device){s.device=device.dataset.device;render();return}
  const seat=e.target.closest("[data-event-pc]");
  if(seat&&!seat.disabled){s.selectedEventPc=seat.dataset.eventPc;render();return}
  const action=e.target.closest("[data-action]");
  if(action?.dataset.action==="confirm-reservation"){confirmReservation();return}
  if(action?.dataset.action==="password"){openPassword();return}
  if(action?.dataset.action==="toggle-password"){s.showPassword=!s.showPassword;render();return}
  if(action?.dataset.action==="install-app"){installApp();return}
  const pkg=e.target.closest("[data-package]");
  if(pkg){
    const [type,hours,price]=pkg.dataset.package.split(":");
    buyPackage(type,Number(hours),Number(price));
  }
});

if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("/sw.js?v=16",{updateViaCache:"none"}).catch(()=>{}));
render();
load();
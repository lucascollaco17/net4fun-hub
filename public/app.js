let s={
  tab:new URLSearchParams(location.search).get("tab")||"home",
  stations:[],events:[],me:null,
  pcGroup:"normal",
  eventGroup:"normal",
  install:null,
  avatar:localStorage.getItem("net4fun-avatar")||""
};

const A=document.querySelector("#app");
const q=(u,o)=>fetch(u,o).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||"Erro");return j});
const mins=n=>String(Math.floor(n/60)).padStart(2,"0")+"h "+String(n%60).padStart(2,"0")+"min";

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
    s.me=m.user;s.stations=p.stations;s.events=e.events;
    render();
    if(new URLSearchParams(location.search).get("source")==="install")setTimeout(()=>toast("Agora toque em Instalar app."),700);
  }catch(e){toast(e.message)}
}

function st(x){return x==="busy"?"Em uso":"Liberado"}
function filterPC(group){return s.stations.filter(p=>p.type==="PC"&&(!group||p.tier===group))}
function count(group,status){
  return s.stations.filter(p=>{
    const groupMatch=group==="console"?p.type==="Console":group==="all-pc"?p.type==="PC":p.type==="PC"&&p.tier===group;
    return groupMatch&&(!status||p.status===status);
  }).length
}
function pcByName(name){return s.stations.find(p=>p.name===name)}
function seatNode(name,x,y,w=2.2,h=5.2,rot=0){
  const p=pcByName(name);
  const cls=p?.status==="busy"?"busy":"free";
  const label=p?st(p.status):"Liberado";
  return '<button class="map-seat '+cls+'" style="left:'+x+'%;top:'+y+'%;width:'+w+'%;height:'+h+'%;transform:rotate('+rot+'deg)" title="'+name+' • '+label+'" aria-label="'+name+' '+label+'"><span>'+name.replace("PC ","")+'</span></button>';
}
function floorplan(){
  const seats=[
    ["PC 01",25,3],["PC 02",29,3],["PC 03",33,3],["PC 04",37,3],["PC 05",41,3],
    ["PC 06",25,11],["PC 07",29,11],["PC 08",33,11],["PC 09",37,11],["PC 10",41,11],
    ["PC 11",49,3],["PC 12",53,3],["PC 13",49,11],["PC 14",53,11],
    ["PC 15",80,3],["PC 16",80,11],["PC 17",80,19],["PC 18",80,27],["PC 19",80,35],["PC 20",80,43],
    ["PC 21",23,48],["PC 22",23,56],["PC 23",23,64],["PC 24",23,72],
    ["PC 25",7,48],["PC 26",7,56],["PC 27",7,64],["PC 28",7,72],
    ["PC 29",31,48],["PC 30",31,56],["PC 31",31,64],["PC 32",31,72],
    ["PC 33",47,24],["PC 34",51,24],["PC 35",47,32],["PC 36",51,32],
    ["PC 37",63,24],["PC 38",67,24],["PC 39",63,32],["PC 40",67,32]
  ];
  const pcs=seats.map(a=>seatNode(...a)).join("");
  return '<div class="map-scroll"><div class="floor-map">'+
    '<div class="map-zone bathrooms">BANHEIROS</div>'+
    '<div class="map-zone common">ÁREA COMUM</div>'+
    '<div class="map-zone vip vip-one"><span>VIP</span></div>'+
    '<div class="map-zone vip vip-two"><span>VIP</span></div>'+
    '<div class="map-zone reception"><span>RECEPÇÃO</span></div>'+
    '<div class="console-zone"><div class="console-label">PS5</div>'+
      '<span class="console-station '+(pcByName("PS5 1")?.status==="busy"?"busy":"free")+'">PS5 1</span>'+
      '<span class="console-station '+(pcByName("PS5 2")?.status==="busy"?"busy":"free")+'">PS5 2</span>'+
      '<span class="console-station '+(pcByName("PS5 3")?.status==="busy"?"busy":"free")+'">PS5 3</span>'+
      '<span class="console-station '+(pcByName("PS5 4")?.status==="busy"?"busy":"free")+'">PS5 4</span>'+
    '</div>'+pcs+'<div class="floor-hint">Passe o mouse ou toque em um PC para ver o status</div>'+
  '</div></div>';
}

function pcCard(p,event){
  const r=event&&p.reserved;
  const cls=r?"reserved":p.status;
  return '<div class="pc '+cls+'" data-seat="'+(event&&!r?p.name:"")+'"><div class="pc-head"><b>'+p.name+'</b>'+(p.tier==="vip"?'<span class="vip-tag">VIP</span>':'')+'</div><small>'+p.zone+'</small><div><span class="status">'+(r?"Reservado":st(p.status))+'</span></div></div>';
}

function topbar(){
  return '<div class="topbar"><div class="brand-welcome"><img class="official-logo" src="/net4fun-logo.webp?v=6" alt="Net4Fun"><div class="welcome-block"><div class="eyebrow">Bem-vindo</div><div class="welcome">'+(s.me?.name||"Cliente")+'</div></div></div><div class="hours-card"><span>Horas disponíveis</span><strong>'+mins(s.me?.remainingMinutes||0)+'</strong></div></div>';
}

function home(){
  return topbar()+
  '<section class="home-summary">'+
    '<div class="metric"><span>PCs liberados</span><b>'+count("all-pc","free")+'</b><small>Total da loja</small></div>'+
    '<div class="metric"><span>PCs em uso</span><b>'+count("all-pc","busy")+'</b><small>Total da loja</small></div>'+
    '<div class="metric"><span>Consoles liberados</span><b>'+count("console","free")+'</b><small>PlayStation</small></div>'+
    '<div class="metric"><span>Consoles em uso</span><b>'+count("console","busy")+'</b><small>PlayStation</small></div>'+
  '</section>'+
  '<section class="card section home-map-entry"><div><div class="eyebrow">Mapa da lan house</div><h2>Veja onde estão os equipamentos liberados</h2><p class="muted">Consulte o mapa completo da Net4Fun e veja os PCs em uso e liberados.</p></div><button class="btn primary large" onclick="s.tab=\'stations\';render()">Abrir mapa</button></section>';
}

function stations(){
  return topbar()+
  '<section class="card section floor-section">'+
    '<div class="floor-header"><div><div class="eyebrow">Mapa da Net4Fun</div><h1 class="page-title">PCs & Consoles</h1><p class="muted">Mapa adaptado à disposição da lan house para localizar rapidamente cada equipamento.</p></div>'+
    '<div class="map-status"><span><i class="dot free-dot"></i><b>'+count("all-pc","free")+'</b> Liberados</span><span><i class="dot busy-dot"></i><b>'+count("all-pc","busy")+'</b> Em uso</span></div></div>'+
    '<div class="legend map-main-legend"><span><i class="dot free-dot"></i>Liberado</span><span><i class="dot busy-dot"></i>Em uso</span></div>'+
    floorplan()+
  '</section>';
}

function events(){
  const e=s.events[0];
  if(!e)return topbar()+'<section class="card section"><h2>Corujão</h2><p class="muted">Nenhum evento disponível.</p></section>';
  return topbar()+
  '<section class="corujao-hero card section">'+
    '<div class="owl-wrap"><img src="/owl.svg" alt="Corujão Net4Fun"></div>'+
    '<div class="corujao-copy"><div class="eyebrow">Evento especial</div><h1>Corujão Net4Fun</h1><div class="schedule"><strong>Todos os sábados</strong><span>23:00 às 06:00</span></div><p>Escolha antecipadamente o PC que você quer usar durante o Corujão.</p><div class="event-stats"><div><b>'+e.freeCount+'</b><span>PCs disponíveis</span></div><div><b>'+e.reservedCount+'</b><span>reservados</span></div></div><button class="btn primary large" onclick="openEvent(\''+e.id+'\')">Escolher PC</button></div>'+
  '</section>';
}

function avatarHtml(){
  if(s.avatar)return '<img src="'+s.avatar+'" alt="Foto do cliente">';
  const initials=(s.me?.name||"C").split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();
  return '<span>'+initials+'</span>';
}

function account(){
  return topbar()+
  '<section class="card section profile-card">'+
    '<div class="profile-head"><div class="avatar" id="avatarBox">'+avatarHtml()+'</div><div class="profile-main"><div class="eyebrow">Conta do cliente</div><h1>'+(s.me?.name||"Cliente")+'</h1><div class="login-row"><span>Login</span><strong>'+(s.me?.login||"—")+'</strong></div><button class="btn subtle" onclick="document.getElementById(\'avatarInput\').click()">Alterar foto</button><input id="avatarInput" class="hidden" type="file" accept="image/*" onchange="changeAvatar(this)"></div></div>'+
    '<div class="account-actions"><button class="action-card" onclick="openBuyHours()"><span class="action-icon">+</span><div><b>Adicionar horas</b><small>Comprar mais tempo para sua conta</small></div></button><button class="action-card" onclick="openReport()"><span class="action-icon">!</span><div><b>Relatar problema</b><small>Conta, PC, saldo, reserva ou compra</small></div></button></div>'+
  '</section>';
}

function bottomNav(){
  const installed=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  const items=[["home","Início"],["stations","PCs"],["events","Corujão"],["account","Conta"]];
  return '<nav class="bottom-nav">'+items.map(([id,label])=>'<button class="nav-tab '+(s.tab===id?"active":"")+'" onclick="s.tab=\''+id+'\';render()"><span>'+label+'</span></button>').join("")+(installed?'<button class="nav-tab installed" disabled><span>Instalado</span></button>':'<button class="nav-tab" onclick="install()"><span>Instalar app</span></button>')+'</nav>';
}

function render(){
  A.innerHTML='<main class="content">'+(s.tab==="home"?home():s.tab==="stations"?stations():s.tab==="events"?events():account())+'</main>'+bottomNav();
}

function changeAvatar(input){
  const file=input.files&&input.files[0];
  if(!file)return;
  if(file.size>3*1024*1024){toast("Escolha uma imagem de até 3 MB.");return}
  const reader=new FileReader();
  reader.onload=()=>{s.avatar=reader.result;localStorage.setItem("net4fun-avatar",s.avatar);render();toast("Foto atualizada.");};
  reader.readAsDataURL(file);
}

function modal(html){
  const m=document.createElement("div");
  m.className="modal";
  m.innerHTML='<div class="modalbox card">'+html+'</div>';
  document.body.append(m);
  m.addEventListener("click",e=>{if(e.target===m)m.remove()});
  return m;
}

function openBuyHours(){
  const m=modal('<div class="modal-head"><div><div class="eyebrow">Adicionar horas</div><h2>Quanto tempo você quer adicionar?</h2></div><button class="btn" data-close>Fechar</button></div><div class="hour-options">'+[1,3,5,10].map(h=>'<button onclick="buyHours('+h+',this.closest(\'.modal\'))"><b>'+h+'h</b><span>Selecionar pacote</span></button>').join("")+'</div><p class="muted modal-note">Os valores e a forma de pagamento serão definidos junto com a Net4Fun antes do lançamento.</p>');
  m.querySelector("[data-close]").onclick=()=>m.remove();
}

async function buyHours(hours,m){
  try{
    await q("/api/purchase-intent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hours})});
    m.remove();
    toast("Pacote de "+hours+"h selecionado. Fluxo de pagamento preparado para integração.");
  }catch(e){toast(e.message)}
}

function openReport(){
  const m=modal('<div class="modal-head"><div><div class="eyebrow">Suporte</div><h2>Relatar problema</h2></div><button class="btn" data-close>Fechar</button></div><label class="field"><span>Categoria</span><select id="reportCategory"><option value="pc">PC / equipamento</option><option value="conta">Conta / login</option><option value="saldo">Horas / saldo</option><option value="reserva">Reserva do Corujão</option><option value="compra">Compra de horas</option><option value="outro">Outro</option></select></label><label class="field"><span>O que aconteceu?</span><textarea id="reportMessage" rows="5" placeholder="Descreva o problema..."></textarea></label><button class="btn primary large" id="sendReport">Enviar relato</button>');
  m.querySelector("[data-close]").onclick=()=>m.remove();
  m.querySelector("#sendReport").onclick=async()=>{
    const message=m.querySelector("#reportMessage").value.trim();
    const category=m.querySelector("#reportCategory").value;
    try{
      await q("/api/support",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({login:s.me?.login,category,message})});
      m.remove();toast("Problema relatado com sucesso.");
    }catch(e){toast(e.message)}
  };
}

async function openEvent(id){
  const e=s.events.find(x=>x.id===id);
  if(!e)return;
  const draw=()=>{
    const pcs=e.stations.filter(p=>p.tier===s.eventGroup);
    const m=modal('<div class="modal-head"><div><div class="eyebrow">Corujão • sábado 23:00–06:00</div><h2>Escolha seu PC</h2></div><button class="btn" data-close>Fechar</button></div><div class="segmented wide event-tabs"><button class="'+(s.eventGroup==="normal"?"active":"")+'" data-group="normal">PCs normais</button><button class="'+(s.eventGroup==="vip"?"active":"")+'" data-group="vip">PCs VIP</button></div><div class="notice compact">A reserva vale apenas para o Corujão. Durante o funcionamento normal, o PC continua seguindo a ordem de chegada.</div><div class="grid event-grid">'+pcs.map(p=>pcCard(p,e)).join("")+'</div>');
    m.querySelector("[data-close]").onclick=()=>m.remove();
    m.querySelectorAll("[data-group]").forEach(b=>b.onclick=()=>{s.eventGroup=b.dataset.group;m.remove();draw()});
    m.querySelectorAll("[data-seat]").forEach(el=>{if(!el.dataset.seat)return;el.onclick=async()=>{
      if(!confirm("Reservar "+el.dataset.seat+" para o próximo Corujão?"))return;
      try{
        await q("/api/events/"+encodeURIComponent(id)+"/reserve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stationId:el.dataset.seat})});
        m.remove();toast("Reserva confirmada.");await load();
      }catch(err){toast(err.message)}
    }});
  };
  draw();
}

async function install(){
  if(matchMedia("(display-mode: standalone)").matches||navigator.standalone===true){toast("O Net4Fun Hub já está instalado.");return}
  if(s.install){
    s.install.prompt();
    const choice=await s.install.userChoice;
    s.install=null;
    if(choice.outcome==="accepted")toast("Instalação iniciada.");
    return;
  }
  const ua=navigator.userAgent;
  if(/iphone|ipad|ipod/i.test(ua)){toast("No Safari: Compartilhar → Adicionar à Tela de Início.",4500);return}
  if(/android/i.test(ua)){
    const target="net4fun-hub.onrender.com/?source=install";
    const fallback=encodeURIComponent("https://net4fun-hub.onrender.com/?source=install");
    location.href="intent://"+target+"#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url="+fallback+";end";
    return;
  }
  toast("Use o menu do navegador → Instalar app / Adicionar à tela inicial.",4500);
}

addEventListener("beforeinstallprompt",e=>{e.preventDefault();s.install=e;render()});
addEventListener("appinstalled",()=>{s.install=null;toast("Net4Fun Hub instalado.");render()});
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("/sw.js?v=6",{updateViaCache:"none"}).catch(e=>console.warn("SW",e)));
render();
load();
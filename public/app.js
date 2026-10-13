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
function sketchPc(name){
  const p=pcByName(name);
  const cls=p?.status==="busy"?"busy":"free";
  const label=p?st(p.status):"Liberado";
  const short=name.replace("PC ","");
  return '<button class="sketch-pc '+cls+'" title="'+name+' • '+label+'" aria-label="'+name+' '+label+'"><span>'+short+'</span></button>';
}
function pcRange(start,end){
  let html="";
  for(let i=start;i<=end;i++)html+=sketchPc("PC "+String(i).padStart(2,"0"));
  return html;
}
function sketchPs5(name,cls){
  const p=pcByName(name);
  const state=p?.status==="busy"?"busy":"free";
  const label=st(p?.status);
  return '<div class="sketch-ps5 '+cls+' '+state+'" title="'+name+' • '+label+'"><span class="ps5-stick"></span><span class="ps5-copy"><small>PS5</small><em>'+label+'</em></span></div>';
}
function floorplan(){
  return '<div class="sketch-scroll"><div class="sketch-layout"><div class="sketch-floor">'+
    '<div class="sketch-zone sketch-bathrooms"></div>'+
    '<div class="sketch-zone sketch-common">ÁREA COMUM</div>'+
    '<div class="sketch-desk sketch-desk-left">'+pcRange(1,14)+'</div>'+
    '<div class="sketch-desk sketch-desk-center">'+pcRange(15,28)+'</div>'+
    '<div class="sketch-desk sketch-desk-right">'+pcRange(29,40)+'</div>'+
    '<div class="sketch-vip sketch-vip-one">VIP</div>'+
    '<div class="sketch-vip sketch-vip-two">VIP</div>'+
    '<div class="sketch-wall sketch-wall-left-top"></div>'+
    '<div class="sketch-wall sketch-wall-left-bottom"></div>'+
    '<div class="sketch-wall sketch-wall-middle-bottom"></div>'+
    '<div class="sketch-wall sketch-wall-right-bottom"></div>'+
    '<div class="sketch-zone sketch-reception"></div>'+
    sketchPs5("PS5 1","ps5-one")+
    sketchPs5("PS5 2","ps5-two")+
    sketchPs5("PS5 3","ps5-three")+
    sketchPs5("PS5 4","ps5-four")+
    sketchPs5("PS5 5","ps5-five")+
    sketchPs5("PS5 6","ps5-six")+
    sketchPs5("PS5 7","ps5-seven")+
    sketchPs5("PS5 8","ps5-eight")+
  '</div></div></div>';
}
function eventPcByName(e,name){return e.stations.find(p=>p.name===name)}
function eventSketchPc(name,e){
  const p=eventPcByName(e,name);
  const reserved=!!p?.reserved;
  const cls=reserved?"reserved":"free";
  const label=reserved?"Reservado":"Liberado";
  const short=name.replace("PC ","");
  const seat=reserved?"":name;
  return '<button class="sketch-pc event-seat '+cls+'" data-event-seat="'+seat+'" title="'+name+' • '+label+'" aria-label="'+name+' '+label+'" '+(reserved?'disabled':'')+'><span>'+short+'</span><em>'+label+'</em></button>';
}
function eventPcRange(start,end,e){
  let html="";
  for(let i=start;i<=end;i++)html+=eventSketchPc("PC "+String(i).padStart(2,"0"),e);
  return html;
}
function eventSketchPs5(cls){
  return '<div class="sketch-ps5 event-ps5 '+cls+' unavailable" title="PS5 • Indisponível"><span class="ps5-stick"></span><span class="ps5-copy"><small>PS5</small><em>Indisponível</em></span></div>';
}
function eventFloorplan(e){
  return '<div class="sketch-scroll event-map-scroll"><div class="sketch-layout"><div class="sketch-floor event-floor">'+
    '<div class="sketch-zone sketch-bathrooms"></div>'+
    '<div class="sketch-zone sketch-common">ÁREA COMUM</div>'+
    '<div class="sketch-desk sketch-desk-left">'+eventPcRange(1,14,e)+'</div>'+
    '<div class="sketch-desk sketch-desk-center">'+eventPcRange(15,28,e)+'</div>'+
    '<div class="sketch-desk sketch-desk-right">'+eventPcRange(29,40,e)+'</div>'+
    '<div class="sketch-vip sketch-vip-one">VIP</div>'+
    '<div class="sketch-vip sketch-vip-two">VIP</div>'+
    '<div class="sketch-wall sketch-wall-left-top"></div>'+
    '<div class="sketch-wall sketch-wall-left-bottom"></div>'+
    '<div class="sketch-wall sketch-wall-middle-bottom"></div>'+
    '<div class="sketch-wall sketch-wall-right-bottom"></div>'+
    '<div class="sketch-zone sketch-reception"></div>'+
    eventSketchPs5("ps5-one")+
    eventSketchPs5("ps5-two")+
    eventSketchPs5("ps5-three")+
    eventSketchPs5("ps5-four")+
    eventSketchPs5("ps5-five")+
    eventSketchPs5("ps5-six")+
    eventSketchPs5("ps5-seven")+
    eventSketchPs5("ps5-eight")+
  '</div></div></div>';
}


function pcCard(p,event){
  const r=event&&p.reserved;
  const cls=r?"reserved":p.status;
  return '<div class="pc '+cls+'" data-seat="'+(event&&!r?p.name:"")+'"><div class="pc-head"><b>'+p.name+'</b>'+(p.tier==="vip"?'<span class="vip-tag">VIP</span>':'')+'</div><small>'+p.zone+'</small><div><span class="status">'+(r?"Reservado":st(p.status))+'</span></div></div>';
}

function topbar(){
  return '<div class="topbar"><div class="brand-welcome"><img class="official-logo" src="/net4fun-logo.webp?v=14" alt="Net4Fun"><div class="welcome-block"><div class="eyebrow">Bem-vindo</div><div class="welcome">'+(s.me?.name||"Cliente")+'</div></div></div><div class="hours-card"><span>Horas disponíveis</span><strong>'+mins(s.me?.remainingMinutes||0)+'</strong></div></div>';
}

function home(){
  return topbar()+
  '<section class="home-summary">'+
    '<div class="metric"><span>PCs liberados</span><b>'+count("all-pc","free")+'</b><small>Total da loja</small></div>'+
    '<div class="metric"><span>PCs em uso</span><b>'+count("all-pc","busy")+'</b><small>Total da loja</small></div>'+
    '<div class="metric"><span>Consoles liberados</span><b>'+count("console","free")+'</b><small>PlayStation</small></div>'+
    '<div class="metric"><span>Consoles em uso</span><b>'+count("console","busy")+'</b><small>PlayStation</small></div>'+
  '</section>'+
  '<section class="card section sketch-section home-floor-section">'+
    '<div class="eyebrow">Mapa da lan house</div>'+
    '<h2>PCs & Consoles</h2>'+
    floorplan()+
  '</section>';
}

function stations(){
  return topbar()+
  '<section class="card section sketch-section">'+
    '<div class="eyebrow">Disponibilidade</div>'+
    '<h1 class="page-title">PCs & Consoles</h1>'+
    floorplan()+
  '</section>';
}

function events(){
  const e=s.events[0];
  if(!e)return topbar()+'<section class="card section"><h2>Corujão</h2><p class="muted">Nenhum evento disponível.</p></section>';
  return topbar()+
  '<section class="corujao-hero card section">'+
    '<div class="owl-wrap"><img src="/corujao-net4fun-final.webp?v=14" alt="Corujão Net4Fun"></div>'+
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
  const items=[["home","Início"],["events","Corujão"],["account","Conta"]];
  return '<nav class="bottom-nav">'+items.map(([id,label])=>'<button class="nav-tab '+(s.tab===id?"active":"")+'" onclick="s.tab=\''+id+'\';render()"><span>'+label+'</span></button>').join("")+(installed?'<button class="nav-tab installed" disabled><span>Instalado</span></button>':'<button class="nav-tab" onclick="install()"><span>Instalar app</span></button>')+'</nav>';
}

function render(){
  if(s.tab==="stations")s.tab="home";
  A.innerHTML='<main class="content">'+(s.tab==="home"?home():s.tab==="events"?events():account())+'</main>'+bottomNav();
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
  const free=e.stations.filter(p=>!p.reserved).length;
  const reserved=e.stations.filter(p=>p.reserved).length;
  const m=modal(
    '<div class="modal-head"><div><div class="eyebrow">Corujão • sábado 23:00–06:00</div><h2>Escolha seu PC</h2></div><button class="btn" data-close>Fechar</button></div>'+
    '<div class="event-reservation-summary"><span class="event-free"><b>'+free+'</b> Liberados</span><span class="event-reserved"><b>'+reserved+'</b> Reservados</span><span class="event-unavailable">PS5 indisponível para reserva</span></div>'+
    '<div class="notice compact">Clique em um PC liberado para reservar. A reserva vale somente para o Corujão.</div>'+
    eventFloorplan(e)
  );
  m.querySelector(".modalbox").classList.add("event-reservation-modal");
  m.querySelector("[data-close]").onclick=()=>m.remove();
  m.querySelectorAll("[data-event-seat]").forEach(el=>{
    if(!el.dataset.eventSeat)return;
    el.onclick=async()=>{
      const pc=el.dataset.eventSeat;
      if(!confirm("Confirmar a reserva do "+pc+" para o próximo Corujão?"))return;
      try{
        await q("/api/events/"+encodeURIComponent(id)+"/reserve",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({stationId:pc})
        });
        m.remove();
        toast(pc+" reservado com sucesso.");
        await load();
      }catch(err){toast(err.message)}
    };
  });
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
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("/sw.js?v=14",{updateViaCache:"none"}).catch(e=>console.warn("SW",e)));
render();
load();
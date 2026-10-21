let s={
  tab:new URLSearchParams(location.search).get("tab")||"home",
  entryScreen:"splash",
  prototypeEntered:false,
  stations:[],
  events:[],
  me:null,
  device:"pc",
  selectedEventPc:null,
  showPassword:false,
  installPrompt:null,
  games:{pc:[],console:[]},
  announcements:[],
  adminToken:sessionStorage.getItem("net4funAdminToken")||null,
  adminLogin:sessionStorage.getItem("net4funAdminLogin")||null,
  isAdmin:!!sessionStorage.getItem("net4funAdminToken"),
  adminSuggestions:[]
};

const A=document.querySelector("#app");
const q=(u,o)=>fetch(u,o).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||"Erro");return j});
const mins=n=>String(Math.floor((n||0)/60)).padStart(2,"0")+"h "+String((n||0)%60).padStart(2,"0")+"min";
const money=v=>Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const adminHeaders=()=>({"Authorization":"Bearer "+s.adminToken,"Content-Type":"application/json"});

function toast(t,ms=3000){
  const d=document.createElement("div");
  d.className="toast";
  d.textContent=t;
  document.body.append(d);
  setTimeout(()=>d.remove(),ms);
}

async function load(){
  try{
    const [m,p,e,g,a]=await Promise.all([
      q("/api/me"),
      q("/api/stations"),
      q("/api/events"),
      q("/api/games"),
      q("/api/announcements")
    ]);
    s.me=m.user;
    s.stations=p.stations||[];
    s.events=e.events||[];
    s.games=g.games||{pc:[],console:[]};
    s.announcements=a.announcements||[];
    if(s.isAdmin)await loadAdminSuggestions(true);
    render();
    setTimeout(showPendingAnnouncement,80);
  }catch(e){toast(e.message)}
}


function entryScreen(){
  if(s.entryScreen==="splash"){
    return '<section class="brand-splash" aria-label="Net4Fun Hub"><img class="splash-logo" src="/net4fun-white.svg?v=23" alt="Net4Fun"><span class="splash-progress"></span></section>';
  }
  return '<main class="login-screen">'+
    '<header class="login-brands"><img class="login-net4fun" src="/net4fun-white.svg?v=23" alt="Net4Fun"><div class="ggleap-wordmark" aria-label="ggLeap"><span>gg</span>Leap</div></header>'+
    '<section class="login-card">'+
      '<span class="login-eyebrow">NET4FUN HUB</span>'+
      '<h1>Bem-vindo de volta</h1>'+
      '<p class="login-subtitle">Entre para acessar sua experiência Net4Fun.</p>'+
      '<form id="prototypeLogin" autocomplete="on">'+
        '<label class="login-field"><span>Login</span><input id="prototypeUsername" name="username" type="text" placeholder="Seu login" autocomplete="username" required></label>'+
        '<label class="login-field"><span>Senha</span><input id="prototypePassword" name="password" type="password" placeholder="Sua senha" autocomplete="current-password" required></label>'+
        '<button class="login-submit" type="submit">Entrar <span aria-hidden="true">→</span></button>'+
      '</form>'+
      '<p class="prototype-note"><span></span> Protótipo demonstrativo · acesso ilustrativo</p>'+
    '</section>'+
    '<footer class="login-footer">Uma nova forma de viver a Net4Fun.</footer>'+
  '</main>';
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
    '<div class="brand-panel"><img src="/net4fun-logo.webp?v=21" alt="Net4Fun"></div>'+
    '<div class="balance-stack">'+
      '<div class="balance"><span>Horas normais</span><strong>'+mins(normalMinutes())+'</strong></div>'+
      '<div class="balance vip-balance"><span>Horas VIP</span><strong>'+mins(vipMinutes())+'</strong></div>'+
    '</div>'+
  '</header>';
}

const defaultPcGames=["Counter-Strike 2","VALORANT","League of Legends","Fortnite","GTA V","Minecraft","Rocket League","Roblox","Dota 2","Overwatch 2"];
const defaultConsoleGames=["EA SPORTS FC","GTA V","Fortnite","Mortal Kombat","Call of Duty","Tekken","Rocket League","Minecraft"];

function gameLibrary(){
  const games=(s.games?.[s.device]?.length?s.games[s.device]:(s.device==="pc"?defaultPcGames:defaultConsoleGames));
  return '<section class="library-card">'+
    '<div class="section-kicker">Biblioteca de jogos</div>'+
    '<div class="game-strip" aria-label="Biblioteca de jogos">'+
      games.map((g,i)=>'<article class="game-card"><div class="game-mark">'+String(i+1).padStart(2,"0")+'</div><strong>'+esc(g)+'</strong><small>'+(s.device==="pc"?"PC":"Console")+'</small></article>').join("")+
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
    '<div class="zone bathrooms">BANHEIROS</div>'+
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
    '<div class="zone bathrooms">BANHEIROS</div>'+
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
      '<div class="event-image"><img src="/corujao-net4fun-final.webp?v=21" alt="Corujão Net4Fun"></div>'+
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
      (s.isAdmin
        ?'<button class="admin-access active" data-tab="admin">Painel administrativo</button>'
        :'<button class="admin-access" data-action="admin-login">Acesso ADM</button>')+
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

function suggestionBubble(){
  if(s.isAdmin||s.tab==="admin")return "";
  return '<button class="suggestion-bubble" data-action="suggestion" aria-label="Enviar sugestão"><span>💡</span><b>Sugestões</b></button>';
}

function openSuggestion(){
  const m=modal(
    '<div class="modal-head"><div><span class="section-kicker">Sua opinião importa</span><h2>Enviar sugestão</h2></div><button class="ghost" data-close>Fechar</button></div>'+
    '<label class="field"><span>Tipo de sugestão</span><select id="suggestionType"><option value="game">Adicionar um jogo</option><option value="general">Outra sugestão</option></select></label>'+
    '<div id="gameSuggestionFields">'+
      '<label class="field"><span>Nome do jogo</span><input id="suggestionGame" placeholder="Ex.: Far Cry 3"></label>'+
      '<label class="field"><span>Plataforma</span><select id="suggestionPlatform"><option value="pc">PC</option><option value="console">Console</option></select></label>'+
    '</div>'+
    '<label class="field"><span>Comentário opcional</span><textarea id="suggestionMessage" rows="4" placeholder="Conte um pouco mais sobre sua sugestão"></textarea></label>'+
    '<button class="primary-action full" id="sendSuggestion">Enviar sugestão</button>'
  );
  const type=m.querySelector("#suggestionType");
  const gameFields=m.querySelector("#gameSuggestionFields");
  type.onchange=()=>{gameFields.style.display=type.value==="game"?"block":"none"};
  m.querySelector("[data-close]").onclick=()=>m.remove();
  m.querySelector("#sendSuggestion").onclick=async()=>{
    const payload={
      type:type.value,
      game:m.querySelector("#suggestionGame").value.trim(),
      platform:m.querySelector("#suggestionPlatform").value,
      message:m.querySelector("#suggestionMessage").value.trim(),
      login:s.me?.login||"cliente.demo"
    };
    try{
      await q("/api/suggestions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      m.remove();
      toast("Sugestão enviada para a equipe da Net4Fun.");
    }catch(e){toast(e.message)}
  };
}

async function adminLogin(){
  const m=modal(
    '<div class="modal-head"><div><span class="section-kicker">Modo de teste</span><h2>Acesso administrativo</h2></div><button class="ghost" data-close>Fechar</button></div>'+
    '<p class="admin-login-hint">Use o padrão <b>nome.sobrenome.adm</b>. Senha temporária de teste: <b>admin123</b>.</p>'+
    '<label class="field"><span>Login ADM</span><input id="adminLogin" placeholder="nome.sobrenome.adm" autocomplete="username"></label>'+
    '<label class="field"><span>Senha</span><input id="adminPassword" type="password" placeholder="Senha de teste" autocomplete="current-password"></label>'+
    '<button class="primary-action full" id="enterAdmin">Entrar como administrador</button>'
  );
  m.querySelector("[data-close]").onclick=()=>m.remove();
  m.querySelector("#enterAdmin").onclick=async()=>{
    const login=m.querySelector("#adminLogin").value.trim().toLowerCase();
    const password=m.querySelector("#adminPassword").value;
    try{
      const out=await q("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({login,password})});
      s.adminToken=out.token;s.adminLogin=out.admin.login;s.isAdmin=true;
      sessionStorage.setItem("net4funAdminToken",s.adminToken);
      sessionStorage.setItem("net4funAdminLogin",s.adminLogin);
      await loadAdminSuggestions(true);
      m.remove();s.tab="admin";render();
      toast("Acesso administrativo liberado.");
    }catch(e){toast(e.message)}
  };
}

async function loadAdminSuggestions(silent=false){
  if(!s.adminToken)return;
  try{
    const out=await q("/api/admin/suggestions",{headers:adminHeaders()});
    s.adminSuggestions=out.suggestions||[];
  }catch(e){
    if(e.message.includes("administrativo")){
      s.isAdmin=false;s.adminToken=null;s.adminLogin=null;
      sessionStorage.removeItem("net4funAdminToken");
      sessionStorage.removeItem("net4funAdminLogin");
    }
    if(!silent)toast(e.message);
  }
}

function adminPage(){
  const items=s.adminSuggestions||[];
  const pending=items.filter(x=>x.status==="pending").length;
  return header()+
    '<section class="admin-panel">'+
      '<div class="admin-head"><div><span class="section-kicker">Painel administrativo</span><h2>Sugestões dos clientes</h2><p>Logado como '+esc(s.adminLogin||"admin")+'</p></div><button class="ghost" data-action="admin-logout">Sair do ADM</button></div>'+
      '<div class="admin-summary"><span><b>'+pending+'</b> pendentes</span><span><b>'+items.length+'</b> recebidas</span></div>'+
      '<div class="suggestion-list">'+
        (items.length?items.map(adminSuggestionCard).join(""):'<div class="empty-state">Nenhuma sugestão recebida ainda.</div>')+
      '</div>'+
    '</section>';
}
function adminSuggestionCard(item){
  const isGame=item.type==="game";
  const platform=item.platform==="console"?"Console":"PC";
  return '<article class="admin-suggestion '+esc(item.status)+'">'+
    '<div class="admin-suggestion-top"><span class="suggestion-kind">'+(isGame?"Jogo • "+platform:"Sugestão geral")+'</span><span class="suggestion-status">'+esc(item.status)+'</span></div>'+
    '<h3>'+esc(isGame?item.game:"Sugestão do cliente")+'</h3>'+
    (item.message?'<p>'+esc(item.message)+'</p>':'')+
    '<small>Enviado por '+esc(item.login||"cliente")+'</small>'+
    (item.status==="pending"?'<div class="admin-actions"><button class="approve" data-suggestion-action="approve" data-suggestion-id="'+esc(item.id)+'">'+(isGame?"Aprovar e adicionar":"Aprovar")+'</button><button class="reject" data-suggestion-action="reject" data-suggestion-id="'+esc(item.id)+'">Recusar</button></div>':'')+
  '</article>';
}

async function reviewSuggestion(id,action){
  try{
    const out=await q("/api/admin/suggestions/"+encodeURIComponent(id)+"/"+action,{method:"POST",headers:adminHeaders(),body:"{}"});
    if(out.games)s.games=out.games;
    await loadAdminSuggestions(true);
    render();
    toast(action==="approve"?"Sugestão aprovada.":"Sugestão recusada.");
  }catch(e){toast(e.message)}
}

function logoutAdmin(){
  s.isAdmin=false;s.adminToken=null;s.adminLogin=null;s.adminSuggestions=[];s.tab="account";
  sessionStorage.removeItem("net4funAdminToken");
  sessionStorage.removeItem("net4funAdminLogin");
  render();
}

function showPendingAnnouncement(){
  if(!s.announcements?.length||s.isAdmin)return;
  let seen=[];
  try{seen=JSON.parse(localStorage.getItem("net4funSeenAnnouncements")||"[]")}catch(e){}
  const a=s.announcements.find(x=>!seen.includes(x.id));
  if(!a)return;
  const m=modal(
    '<div class="announcement-modal"><span class="section-kicker">Novidade na Net4Fun</span><h2>'+esc(a.title)+'</h2><p>'+esc(a.message)+'</p><button class="primary-action full" data-close-announcement>Entendi</button></div>'
  );
  m.querySelector("[data-close-announcement]").onclick=()=>{
    seen.push(a.id);
    localStorage.setItem("net4funSeenAnnouncements",JSON.stringify(seen.slice(-50)));
    m.remove();
  };
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
  if(s.isAdmin)items.push(["admin","Admin"]);
  return '<nav class="bottom-nav '+(s.isAdmin?"admin-nav":"")+'">'+items.map(([id,label])=>
    '<button class="'+(s.tab===id?"active":"")+'" data-tab="'+id+'">'+label+'</button>'
  ).join("")+'</nav>';
}

function render(){
  if(!s.prototypeEntered){A.innerHTML=entryScreen();return}
  const allowed=["home","events","account"].concat(s.isAdmin?["admin"]:[]);
  if(!allowed.includes(s.tab))s.tab="home";
  const page=s.tab==="home"?home():s.tab==="events"?events():s.tab==="account"?account():adminPage();
  A.innerHTML='<main class="app-shell">'+page+'</main>'+bottomNav()+suggestionBubble();
}

document.addEventListener("submit",e=>{
  if(e.target?.id==="prototypeLogin"){
    e.preventDefault();
    const username=document.querySelector("#prototypeUsername")?.value.trim();
    const password=document.querySelector("#prototypePassword")?.value;
    if(!username||!password)return;
    s.prototypeEntered=true;
    render();
  }
});
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
  if(action?.dataset.action==="suggestion"){openSuggestion();return}
  if(action?.dataset.action==="admin-login"){adminLogin();return}
  if(action?.dataset.action==="admin-logout"){logoutAdmin();return}
  const review=e.target.closest("[data-suggestion-action]");
  if(review){reviewSuggestion(review.dataset.suggestionId,review.dataset.suggestionAction);return}
  const pkg=e.target.closest("[data-package]");
  if(pkg){
    const [type,hours,price]=pkg.dataset.package.split(":");
    buyPackage(type,Number(hours),Number(price));
  }
});

if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("/sw.js?v=21",{updateViaCache:"none"}).catch(()=>{}));
render();
window.setTimeout(()=>{if(s.entryScreen==="splash"){s.entryScreen="login";render()}},2100);
load();
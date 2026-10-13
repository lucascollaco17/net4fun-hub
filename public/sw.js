const CACHE="net4fun-v14";
const ASSETS=["/","/index.html","/style.css?v=14","/app.js?v=14","/manifest.webmanifest?v=14","/corujao-net4fun-final.webp?v=14","/net4fun-logo.webp?v=14","/app-icon-net4fun.webp?v=14"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  if(u.pathname.startsWith("/api/")){
    e.respondWith(fetch(e.request,{cache:"no-store"}).catch(()=>new Response(JSON.stringify({offline:true}),{headers:{"Content-Type":"application/json"}})));
    return;
  }
  e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{
    const copy=r.clone();
    caches.open(CACHE).then(c=>c.put(e.request,copy));
    return r;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match("/index.html"))));
});
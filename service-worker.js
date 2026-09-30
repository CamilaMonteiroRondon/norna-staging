const CACHE="norna-unified-test-v1";
const STATIC=[
  "./","index.html","sobre.html","como-funciona.html","aplicativo.html","acesso.html","mobile.html",
  "landing.css","public.js","auth.js","app.html","style.css","script.js","manifest.webmanifest",
  "assets/icon-192.png","assets/icon-512.png"
];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(u.pathname.startsWith("/api/")||e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)))});

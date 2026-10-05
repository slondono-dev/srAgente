const C = "ac-v11";
const MAPS = ["simit", "medellin", "bello", "itagui", "envigado", "sabaneta", "rionegro", "apartado", "bogota", "cundinamarca",
  "girardot", "cali", "valle", "yumbo", "popayan", "pasto", "armenia", "pereira", "dosquebradas", "manizales", "villavicencio",
  "arauca", "bucaramanga", "floridablanca", "barrancabermeja", "cucuta", "barranquilla", "atlantico", "soledad", "cartagena",
  "santamarta", "valledupar"].map(id => `maps/${id}.json`);
const SCENES = ["1-camara", "2-agente", "3-notificacion", "4-sorpresa", "5-plazos", "6-caminos", "7-vehiculo",
  "8-senalizacion", "9-audiencia", "10-consecuencias", "11-robo", "12-venta", "13-llaves"].map(n => `img/${n}-640.webp`);
const ASSETS = ["./", "index.html", "config.js", "guia.html", "carta.html", "cifras.html", "comunidad.html", "verificar.html", "base.css", "ui.js", "app.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png",
  "icon-maskable-512.png", "apple-touch-icon.png", ...MAPS, ...SCENES];
self.addEventListener("install", e => e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })
    .then(m => m || (e.request.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});

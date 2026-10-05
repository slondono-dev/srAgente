const $ = id => document.getElementById(id);
const IDS = ["simit", "medellin", "bello", "itagui", "envigado", "sabaneta", "rionegro", "apartado", "bogota", "cundinamarca",
  "girardot", "cali", "valle", "yumbo", "popayan", "pasto", "armenia", "pereira", "dosquebradas", "manizales", "villavicencio",
  "arauca", "bucaramanga", "floridablanca", "barrancabermeja", "cucuta", "barranquilla", "atlantico", "soledad", "cartagena",
  "santamarta", "valledupar"];
const fmt = n => "$\u00a0" + Math.round(n).toLocaleString("es-CO");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const corto = m => m.nombre.replace(/^(Secretaría|Instituto) de (Movilidad|Tránsito) de(l)? /, "").replace(/^SETTA /, "");
let mapas = [];

try { $("proxy").value = localStorage.getItem("servidor") || ""; } catch {}
// La placa de la última búsqueda queda escrita: la próxima vez basta con tocar Buscar.
let guardada = "";
try { guardada = localStorage.getItem("placa") || ""; } catch {}
if (guardada) { $("q").value = guardada; $("ej").textContent = "Es la placa que buscó la última vez. Toque Buscar para revisar de nuevo."; }
// Cámaras por municipio (mapa de la ANSV), resumidas cada semana en data/cifras.json.
const camaras = fetch("data/cifras.json").then(r => r.json()).then(d => d.camaras_municipio || []).catch(() => []);
$("proxy").onchange = () => { try { localStorage.setItem("servidor", $("proxy").value.trim()); } catch {} };

const listos = Promise.all(IDS.map(id => fetch(`maps/${id}.json`).then(r => r.json()).then(m => ({ id, ...m })).catch(() => null)))
  .then(ms => { mapas = ms.filter(Boolean); });

function kind(v) {
  v = v.replace(/\s|-/g, "").toUpperCase();
  if (/^[A-Z]{3}\d{3}$/.test(v) || /^[A-Z]{3}\d{2}[A-Z]$/.test(v)) return "placa";
  if (/^\d{6,10}$/.test(v)) return "cedula";
  return null;
}
function hint() {
  const k = kind($("q").value);
  if (k) $("ej").classList.remove("mal");
  $("plate").classList.toggle("id", k === "cedula");
  $("plateTag").textContent = k === "cedula" ? "CÉDULA" : "COLOMBIA";
}
$("q").oninput = hint;
$("q").onkeydown = e => { if (e.key === "Enter") $("go").click(); };
const EJ = "Ejemplo: ABC123. Son las letras y números de la placa del carro o la moto.";
// El botón nunca se ve apagado: si falta algo, se explica qué escribir.
function avisar() {
  const v = $("q").value.trim();
  $("ej").textContent = v ? "Revise lo que escribió. La placa tiene 3 letras y 3 números, como ABC123. La cédula, solo números." : "Primero escriba su placa o su cédula en el cuadro amarillo.";
  $("ej").classList.add("mal");
  $("q").focus();
}
hint();

function show(id) { ["s1", "s2", "s3"].forEach(s => $(s).hidden = s !== id); scrollTo(0, 0); }

// El navegador no puede consultar los portales directamente (CORS sin cookies), así que la web
// usa el servidor intermedio de worker/worker.js. Se puede cambiar en Ajustes.
const SERVIDOR = "https://odd-poetry-a447.jslondono145.workers.dev/";
const servidor = () => $("proxy").value.trim() || SERVIDOR;

async function consultarServidor(m, criterio, esPlaca) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(servidor(), { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portal: m.id, criterio, esPlaca }) });
    const res = await r.json();
    if (res.error) throw new Error(res.error);
    return res.regs;
  } finally { clearTimeout(t); }
}

// En la app Android la consulta la hace el teléfono (sin CORS) y responde por window.__respuesta.
const pendientes = {};
window.__respuesta = (id, res) => { const p = pendientes[id]; delete pendientes[id]; p && p(res); };
function consultarAndroid(m, criterio, esPlaca) {
  return new Promise((ok, mal) => {
    const id = m.id + ":" + Date.now();
    pendientes[id] = res => res.error ? mal(new Error(res.error)) : ok(res.regs);
    window.Android.consultar(id, m.id, criterio, esPlaca);
  });
}

async function consultar(m, criterio, esPlaca) {
  if (window.Android) return consultarAndroid(m, criterio, esPlaca);
  if (servidor()) return consultarServidor(m, criterio, esPlaca);
  throw new Error("sin servidor");
}

// Los portales no publican un formato fijo: se busca el primer campo que parezca valor o descripción.
function campo(o, re, num) {
  for (const [k, v] of Object.entries(o || {})) {
    if (!re.test(k) || v == null || v === "") continue;
    if (!num) return String(v);
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", "."));
    if (n > 0) return n;
  }
  return null;
}

// Registro nacional: datos abiertos del SIMIT (2019 a 2025) en datos.gov.co. Gratis, sin captcha y con CORS abierto.
const NACIONAL = { id: "nacional", nombre: "Registro nacional", ciudad: "Registro nacional" };
const HASTA = "diciembre de 2025";
async function consultarNacional(placa) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(`https://www.datos.gov.co/resource/72nf-y4v3.json?placa=${encodeURIComponent(placa)}&$limit=1000`, { signal: ctl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

const norma = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+d\.?c\.?$/, "").trim();
const fecha = s => { const [d, m, a] = String(s).split("/").map(Number); return a ? new Date(a, m - 1, d) : null; };
const dia = d => d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Art. 159 del Código Nacional de Tránsito: la sanción prescribe a los 3 años del hecho, salvo que haya cobro coactivo notificado.
const prescrita = f => !f.pagada && f.fecha && new Date(f.fecha.getFullYear() + 3, f.fecha.getMonth(), f.fecha.getDate()) < new Date();
const VECINOS = [["bogota", "cundinamarca"]];

$("go").onclick = async () => {
  const c = $("q").value.replace(/\s|-/g, "").toUpperCase(), tipo = kind(c);
  if (!tipo) return avisar();
  $("ej").textContent = EJ;
  show("s2");
  await listos;
  const auto = mapas.filter(m => m.modo === "auto" && m.plataforma === "quipux");
  const fuentes = tipo === "placa" ? [NACIONAL, ...auto] : auto;
  let hechos = 0;
  const faltan = new Set(fuentes);
  const avance = () => {
    $("arc").style.strokeDashoffset = 314 * (1 - hechos / fuentes.length);
    const lentas = faltan.size && faltan.size <= 3 ? ` · Esperando a ${[...faltan].map(m => m === NACIONAL ? m.nombre : corto(m)).join(", ")}` : "";
    $("now").textContent = `${hechos} de ${fuentes.length} revisadas${lentas}`;
  };
  avance();
  const res = await Promise.all(fuentes.map(m => (m === NACIONAL ? consultarNacional(c) : consultar(m, c, tipo === "placa"))
    .then(regs => ({ m, regs }), e => ({ m, error: e }))
    .finally(() => { hechos++; faltan.delete(m); avance(); })));
  resultado(c, res);
};

const mapaDe = ciudad => mapas.find(m => m.ciudad && norma(m.ciudad) === norma(ciudad));
const carta = (tipo, c, f, extra) => "carta.html?" + new URLSearchParams({ tipo, placa: c, ...(f ? { ciudad: f.ciudad, fecha: f.fecha ? iso(f.fecha) : "", valor: f.valor || "" } : {}), ...extra });

const clave = f => `${f.fecha ? iso(f.fecha) : ""}|${norma(f.ciudad)}|${f.valor}`;

async function resultado(c, res) {
  let vistas = null;
  try { vistas = JSON.parse(localStorage.getItem("vistas-" + c)); } catch {}
  const nac = res.find(r => r.m === NACIONAL);
  const ok = res.filter(r => r.regs && r.m !== NACIONAL), fallos = res.filter(r => r.error);
  // Del registro nacional: historial completo, pagadas y sin pagar.
  const hist = (nac && nac.regs || []).map(r => ({ ciudad: (mapaDe(r.ciudad) || {}).ciudad || r.ciudad, depto: r.departamento, fecha: fecha(r.fecha_multa),
    valor: +r.valor_multa || 0, pagada: r.pagado_si_no === "SI" })).sort((a, b) => b.fecha - a.fecha);
  const yaNac = new Set(hist.filter(f => !f.pagada).map(f => norma(f.ciudad)));
  // De las ciudades consultadas hoy: solo lo que no esté ya en el registro nacional de esa ciudad, para no contar dos veces.
  const hoy = ok.filter(r => !yaNac.has(norma(r.m.ciudad))).flatMap(r => r.regs.map(reg => ({ m: r.m, ciudad: r.m.ciudad, fecha: null,
    w: campo(reg, /infracci|descrip|concepto|codigo/i), valor: campo(reg, /valor|total|saldo|deuda/i, true) || 0,
    st: campo(reg, /estado/i), pagada: false, hoy: true })));
  const debe = [...hoy, ...hist.filter(f => !f.pagada)], pagadas = hist.filter(f => f.pagada);
  const total = debe.reduce((s, f) => s + f.valor, 0);
  // Nuevas: las que no estaban la última vez que se buscó esta misma placa en este celular.
  if (vistas) debe.forEach(f => f.nueva = !vistas.includes(clave(f)));
  const nuevas = debe.filter(f => f.nueva).length;
  if (nac && nac.regs || ok.length) try {
    localStorage.setItem("vistas-" + c, JSON.stringify(debe.map(clave)));
    if (kind(c) === "placa") localStorage.setItem("placa", c);
  } catch {}

  // Señales a favor de la persona.
  const avisos = [];
  const viejas = debe.filter(prescrita);
  if (viejas.length) avisos.push({ cls: "sun", t: viejas.length === 1 ? "Esta multa podría estar vencida" : `${viejas.length} multas podrían estar vencidas`,
    p: "Pasaron más de 3 años y no aparece pagada. La ley dice que ya no se puede cobrar, salvo que le hayan notificado un cobro. Puede pedir que la borren.",
    href: carta("prescripcion", c, viejas[0]), b: "Preparar la carta" });
  const porDia = {};
  hist.forEach(f => f.fecha && (porDia[iso(f.fecha)] ||= []).push(f));
  const choque = Object.values(porDia).find(fs => {
    const ds = [...new Set(fs.map(f => norma(f.depto)))];
    return ds.length > 1 && !VECINOS.some(v => ds.every(d => v.includes(d)));
  });
  if (choque) avisos.push({ cls: "red", t: "Su carro aparece en dos lugares lejanos el mismo día",
    p: `El ${dia(choque[0].fecha)}: ${[...new Set(choque.map(f => f.ciudad))].join(" y ")}. Puede ser una placa clonada.`,
    href: (f => carta("clonada", c, f, { otra: choque.find(o => norma(o.depto) !== norma(f.depto)).ciudad }))(choque.find(f => !f.pagada) || choque[0]), b: "Preparar la carta" });
  $("avisos").innerHTML = avisos.map(a => `<article class="aviso ${a.cls}"><h2>${esc(a.t)}</h2><p>${esc(a.p)}</p>
    <a class="primary" href="${esc(a.href)}">${esc(a.b)}</a></article>`).join("");

  $("who").textContent = c;
  if (debe.length) {
    $("amount").textContent = total ? fmt(total) : debe.length;
    $("title").textContent = (debe.length === 1 ? "1 multa sin pagar" : `${debe.length} multas sin pagar`)
      + (vistas ? (nuevas ? `. ${nuevas === 1 ? "1 es nueva" : nuevas + " son nuevas"} desde la última vez.` : ". Ninguna nueva desde la última vez.") : "");
  } else if (nac && nac.regs || ok.length) {
    $("amount").textContent = fmt(0);
    $("title").textContent = "No aparecen multas sin pagar" + (pagadas.length ? `. Tiene ${pagadas.length} ya ${pagadas.length === 1 ? "pagada" : "pagadas"}.` : ".");
  } else {
    $("amount").textContent = "Sin respuesta";
    $("title").textContent = "No pudimos consultar. Revise que tenga internet y toque Buscar otra vez.";
  }

  const pagar = f => (f.m || mapaDe(f.ciudad) || {}).front || linkSimit(c);
  $("fines").innerHTML = debe.map(f => `<article class="fine">
    <span class="state ${prescrita(f) ? "" : "no"}">${f.nueva ? "Nueva · " : ""}${prescrita(f) ? "Podría estar vencida" : "Sin pagar"}</span>
    <div class="mini"><span class="what">${f.fecha ? esc(dia(f.fecha)) : esc(f.w || "Comparendo")}</span><span class="amt">${f.valor ? fmt(f.valor) : ""}</span>
    <span class="where">${esc(f.ciudad)}${f.hoy ? " · consultado hoy" : ""}</span></div>
    <a class="primary" href="${esc(pagar(f))}" target="_blank" rel="noopener">Pagar en la página oficial</a>
    <a class="outline" href="${esc(carta("pruebas", c, f))}">No fui yo: pedir las fotos</a></article>`).join("");
  // Permisos de las cámaras en las ciudades de las multas sin pagar.
  const cams = await camaras;
  const deCiudad = [...new Set(debe.map(f => norma(f.ciudad)))].map(n => [debe.find(f => norma(f.ciudad) === n).ciudad, cams.find(k => norma(k.m) === n)])
    .filter(([, k]) => k && k.ven);
  $("permisos").innerHTML = deCiudad.length ? `<h2>¿La cámara tenía permiso?</h2>
    ${deCiudad.map(([ciu, k]) => `<p>En <b>${esc(ciu)}</b>, el mapa de la Agencia Nacional de Seguridad Vial muestra <b>${k.op}</b> cámaras con permiso vigente y <b>${k.ven}</b> puntos con el permiso vencido.</p>`).join("")}
    <p>Si su multa es de cámara, pida que demuestren que tenía permiso ese día.</p>
    <a class="outline" href="${esc(carta("pruebas", c, debe.find(f => norma(f.ciudad) === norma(deCiudad[0][0]))))}">Pedir las pruebas</a>` : "";
  $("permisos").hidden = !deCiudad.length;
  $("pagadas").innerHTML = pagadas.length ? `<details class="card"><summary>Ya pagadas (${pagadas.length})</summary>
    ${pagadas.map(f => `<div class="row2"><span>${esc(dia(f.fecha))}<br><span class="muted">${esc(f.ciudad)}</span></span><b>${fmt(f.valor)}</b></div>`).join("")}</details>` : "";

  // Lo que no se pudo revisar: el registro nacional llega hasta 2025, así que el SIMIT siempre aparece para lo reciente.
  const ids = new Set(ok.map(r => r.m.id));
  const pend = mapas.filter(m => !ids.has(m.id) && m.id !== "simit");
  const fila = m => `<div class="row2"><b>${esc(corto(m))}</b><a href="${esc(m.front)}" target="_blank" rel="noopener">Abrir</a></div>`;
  $("miss").innerHTML = `<b>Multas de este año</b>
    <p>${nac && nac.regs ? `El registro nacional llega hasta ${HASTA}.` : "No pudimos leer el registro nacional."} Para ver lo más reciente, revise el SIMIT, la página oficial de multas de todo el país.</p>
    <a class="primary" href="${esc(linkSimit(c))}" target="_blank" rel="noopener">Revisar en el SIMIT</a>
    ${pend.length ? `<details><summary>Otras ${pend.length} ciudades</summary>${pend.map(fila).join("")}</details>` : ""}`;
  $("seguro").hidden = !debe.length;
  if (window.Android) {
    $("alerta").hidden = false;
    $("watch").checked = window.Android.vigilando(c);
    $("watch").onchange = () => window.Android.vigilar(c, kind(c) === "placa", $("watch").checked);
  }
  show("s3");
}

// El SIMIT (todo el país) pide un captcha: se abre con la placa o cédula ya escrita para que la persona lo resuelva.
function linkSimit(c) {
  const s = mapas.find(m => m.id === "simit");
  return s ? `${s.front.split("#")[0]}#/estado-cuenta?numDocPlacaProp=${encodeURIComponent(c)}` : "https://www.fcm.org.co/simit/";
}

$("imprimir").onclick = () => { document.querySelectorAll("#pagadas details").forEach(d => d.open = true); print(); };
$("again").onclick = () => { $("q").value = ""; $("ej").textContent = EJ; $("ej").classList.remove("mal"); hint(); show("s1"); $("q").focus(); };

document.querySelectorAll("[data-talk]").forEach(b => b.onclick = () => {
  if (!$("s3").hidden) {
    const parts = [[null, `${$("amount").textContent.replace(/^\$\s/, "")} ${$("amount").textContent.startsWith("$") ? "pesos" : ""}. ${$("title").textContent}`]];
    document.querySelectorAll(".fine").forEach(f => parts.push([f, f.querySelector(".mini").innerText.replace(/\s+/g, " ")]));
    document.querySelectorAll(".aviso").forEach(a => parts.push([a, a.innerText.replace(/\s+/g, " ")]));
    parts.push([$("miss"), $("miss").querySelector("p").innerText]);
    speak(parts);
  } else speak([[null, "Escriba su placa o su cédula y toque el botón amarillo, Buscar."]]);
});

let instalar = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); instalar = e; $("instalar").hidden = false; });
$("instalar").onclick = async () => { if (!instalar) return; instalar.prompt(); await instalar.userChoice; instalar = null; $("instalar").hidden = true; };
addEventListener("appinstalled", () => { $("instalar").hidden = true; });

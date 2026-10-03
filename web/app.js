const $ = id => document.getElementById(id);
const IDS = ["simit", "medellin", "bello", "itagui", "envigado", "sabaneta", "rionegro", "apartado", "bogota", "cundinamarca",
  "girardot", "cali", "valle", "yumbo", "popayan", "pasto", "armenia", "pereira", "dosquebradas", "manizales", "villavicencio",
  "arauca", "bucaramanga", "floridablanca", "barrancabermeja", "cucuta", "barranquilla", "atlantico", "soledad", "cartagena",
  "santamarta", "valledupar"];
const fmt = n => "$\u00a0" + Math.round(n).toLocaleString("es-CO");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const corto = m => m.nombre.replace(/^(Secretaría|Instituto) de (Movilidad|Tránsito) de(l)? /, "").replace(/^SETTA /, "");
let mapas = [];

try { $("proxy").value = localStorage.getItem("proxy") || ""; } catch {}
$("proxy").onchange = () => { try { localStorage.setItem("proxy", $("proxy").value.trim()); } catch {} };

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
  $("go").disabled = !k;
  $("plate").classList.toggle("id", k === "cedula");
  $("plateTag").textContent = k === "cedula" ? "CÉDULA" : "COLOMBIA";
}
$("q").oninput = hint;
$("q").onkeydown = e => { if (e.key === "Enter" && !$("go").disabled) $("go").click(); };
hint();

function show(id) { ["s1", "s2", "s3"].forEach(s => $(s).hidden = s !== id); scrollTo(0, 0); }

// Sin proxy, el navegador solo pasa el CORS de los portales (Allow-Origin "*") sin cookies y sin la cabecera `href`;
// la sesión viaja entonces en la cabecera `token`, que sí permiten.
async function post(m, path, body, token) {
  const proxy = $("proxy").value.trim();
  const url = proxy ? proxy + encodeURIComponent(m.backend + path) : m.backend + path;
  const headers = { "Content-Type": "application/json" };
  if (proxy) headers.href = m.front;
  if (token) headers.token = token;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(url, { method: "POST", credentials: proxy ? "include" : "omit", signal: ctl.signal,
      headers, body: JSON.stringify(body) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
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
  const login = await post(m, "/avit/login/", { usuario: "ANONIMO", password: "admin", consumidor: "web" });
  if (login.rcSiteKey !== "disable") throw new Error("captcha");
  const token = campo(login, /token|ticket/i);
  console.info(m.id, "login:", Object.keys(login), token ? "con token" : "sin token");
  const r = await post(m, "/avit/home/findInfoHomePublic",
    { criterio, response: "", tipoConsulta: "0", idTipoIdentificacion: esPlaca ? "" : "2" }, token);
  const dto = r.consultaMultaOComparendoOutDTO;
  if (!dto) throw new Error("Respuesta inesperada");
  return ["informacionComparendo", "informacionMulta", "informacionComparendoAdicional"].flatMap(k => dto[k] || []);
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

$("go").onclick = async () => {
  const c = $("q").value.replace(/\s|-/g, "").toUpperCase(), tipo = kind(c);
  if (!tipo) return;
  show("s2");
  await listos;
  const auto = mapas.filter(m => m.modo === "auto" && m.plataforma === "quipux");
  let hechos = 0;
  const avance = () => {
    $("arc").style.strokeDashoffset = 314 * (1 - hechos / auto.length);
    $("now").textContent = `${hechos} de ${auto.length} ciudades`;
  };
  avance();
  const res = await Promise.all(auto.map(m => consultar(m, c, tipo === "placa")
    .then(regs => ({ m, regs }), e => ({ m, error: e }))
    .finally(() => { hechos++; avance(); })));
  resultado(c, res);
};

function resultado(c, res) {
  const ok = res.filter(r => r.regs), fallos = res.filter(r => r.error);
  const fines = ok.flatMap(r => r.regs.map(reg => ({ m: r.m,
    w: campo(reg, /infracci|descrip|concepto|codigo/i) || "Comparendo",
    a: campo(reg, /valor|total|saldo|deuda/i, true),
    st: campo(reg, /estado/i) })));
  const total = fines.reduce((s, f) => s + (f.a || 0), 0);
  $("who").textContent = c;
  if (fines.length) {
    $("amount").textContent = total ? fmt(total) : fines.length;
    $("title").textContent = fines.length === 1 ? "1 multa encontrada" : `${fines.length} multas encontradas`;
  } else if (ok.length) {
    $("amount").textContent = fmt(0);
    $("title").textContent = `Sin multas en ${ok.length} ${ok.length === 1 ? "ciudad revisada" : "ciudades revisadas"}`;
  } else {
    $("amount").textContent = "Revísalo tú";
    $("title").textContent = "Los portales no nos dejaron consultar desde aquí";
  }
  $("fines").innerHTML = fines.map(f => `<article class="fine">
    ${f.st ? `<span class="state">${esc(f.st)}</span>` : ""}
    <div class="mini"><span class="what">${esc(f.w)}</span><span class="amt">${f.a ? fmt(f.a) : ""}</span><span class="where">${esc(corto(f.m))}</span><span></span></div>
    <a class="primary" href="${esc(f.m.front)}" target="_blank" rel="noopener">Pagar</a></article>`).join("");

  // Lo que no se pudo revisar: SIMIT primero (cubre casi todo el país), luego el resto plegado.
  const ids = new Set(ok.map(r => r.m.id));
  const pend = mapas.filter(m => !ids.has(m.id));
  const fila = m => `<div class="row2"><b>${esc(m.id === "simit" ? "Todo el país (SIMIT)" : corto(m))}</b><a href="${esc(m.front)}" target="_blank" rel="noopener">Abrir</a></div>`;
  const simit = pend.find(m => m.id === "simit"), otras = pend.filter(m => m.id !== "simit");
  $("miss").innerHTML = pend.length ? `<b>Revísalo tú en la página oficial</b>${simit ? fila(simit) : ""}
    ${otras.length ? `<details><summary>Otras ${otras.length} ciudades</summary>${otras.map(fila).join("")}</details>` : ""}` : "";
  $("miss").hidden = !pend.length;
  if (window.Android) {
    $("alerta").hidden = false;
    $("watch").checked = window.Android.vigilando(c);
    $("watch").onchange = () => window.Android.vigilar(c, kind(c) === "placa", $("watch").checked);
  }
  show("s3");
}

$("again").onclick = () => { $("q").value = ""; hint(); show("s1"); $("q").focus(); };

document.querySelectorAll("[data-talk]").forEach(b => b.onclick = () => {
  if (!$("s3").hidden) {
    const parts = [[null, `${$("amount").textContent.replace(/^\$\s/, "")} ${$("amount").textContent.startsWith("$") ? "pesos" : ""}. ${$("title").textContent}`]];
    document.querySelectorAll(".fine").forEach(f => parts.push([f, f.querySelector(".mini").innerText.replace(/\s+/g, " ")]));
    if (!$("miss").hidden) parts.push([$("miss"), "Revisa tú en la página oficial del SIMIT. Toca Abrir"]);
    speak(parts);
  } else speak([[null, "Escribe tu placa o tu cédula y toca el botón amarillo, Buscar."]]);
});

let instalar = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); instalar = e; $("instalar").hidden = false; });
$("instalar").onclick = async () => { if (!instalar) return; instalar.prompt(); await instalar.userChoice; instalar = null; $("instalar").hidden = true; };
addEventListener("appinstalled", () => { $("instalar").hidden = true; });

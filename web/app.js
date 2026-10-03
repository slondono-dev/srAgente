const $ = id => document.getElementById(id);
const IDS = ["medellin", "bello", "itagui", "envigado", "cali", "rionegro", "armenia"];
let mapas = [];

try { $("proxy").value = localStorage.getItem("proxy") || ""; } catch {}
$("proxy").onchange = () => { try { localStorage.setItem("proxy", $("proxy").value.trim()); } catch {} };

Promise.all(IDS.map(id => fetch(`maps/${id}.json`).then(r => r.json()))).then(ms => {
  mapas = ms;
  $("portal").innerHTML = ms.map((m, i) => `<option value="${i}">${m.nombre}${m.modo === "auto" ? "" : " (asistido)"}</option>`).join("");
});

async function post(m, path, body) {
  const proxy = $("proxy").value.trim();
  const url = proxy ? proxy + encodeURIComponent(m.backend + path) : m.backend + path;
  const r = await fetch(url, { method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", href: m.front }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

async function consultar(m, criterio, esPlaca) {
  if (m.plataforma !== "quipux") throw new Error("Plataforma no soportada");
  const login = await post(m, "/avit/login/", { usuario: "ANONIMO", password: "admin", consumidor: "web" });
  if (login.rcSiteKey !== "disable") throw new Error("El portal pide captcha: consulta en " + m.front);
  const r = await post(m, "/avit/home/findInfoHomePublic",
    { criterio, response: "", tipoConsulta: "0", idTipoIdentificacion: esPlaca ? "" : "2" });
  const dto = r.consultaMultaOComparendoOutDTO;
  if (!dto) throw new Error("Respuesta inesperada");
  return ["informacionComparendo", "informacionMulta", "informacionComparendoAdicional"].flatMap(k => dto[k] || []);
}

$("go").onclick = async () => {
  const m = mapas[$("portal").value], c = $("criterio").value.trim().toUpperCase();
  if (!m || !c) return;
  const out = $("out");
  out.innerHTML = `<div class="card">Consultando ${m.nombre}…</div>`;
  try {
    const regs = await consultar(m, c, $("tipo").value === "placa");
    out.innerHTML = regs.length
      ? regs.map(r => `<div class="card"><pre>${JSON.stringify(r, null, 2).replace(/</g, "&lt;")}</pre></div>`).join("")
      : `<div class="card">Sin comparendos ni multas</div>`;
  } catch (e) {
    const cors = e instanceof TypeError ? " (probablemente bloqueado por CORS; usa un proxy o la app Android)" : "";
    out.innerHTML = `<div class="card err">${e.message}${cors}<br><a href="${m.front}" target="_blank">Abrir portal</a></div>`;
  }
};

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

let instalar = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); instalar = e; $("instalar").hidden = false; });
$("instalar").onclick = async () => { if (!instalar) return; instalar.prompt(); await instalar.userChoice; instalar = null; $("instalar").hidden = true; };
addEventListener("appinstalled", () => { $("instalar").hidden = true; });

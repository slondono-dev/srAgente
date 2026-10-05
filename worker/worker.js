// Servidor intermedio para la web: hace el inicio de sesión y la consulta en el portal (con su cookie)
// y devuelve los registros. Solo consulta portales que estén en maps/ del sitio publicado.
const MAPAS = "https://slondono-dev.github.io/srAgente/maps/";
const ORIGENES = ["https://slondono-dev.github.io", "http://localhost:8000"];

export default {
  async fetch(req) {
    const origen = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ORIGENES.includes(origen) ? origen : ORIGENES[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return json({ error: "Solo POST" }, 405);

    let p;
    try { p = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
    const { portal, criterio, esPlaca } = p || {};
    if (!/^[a-z]+$/.test(portal || "") || !/^[A-Z0-9]{5,10}$/.test(criterio || "")) return json({ error: "Datos inválidos" }, 400);

    const mr = await fetch(MAPAS + portal + ".json", { cf: { cacheTtl: 3600 } });
    if (!mr.ok) return json({ error: "Portal desconocido" }, 404);
    const m = await mr.json();
    if (m.plataforma !== "quipux" || m.modo !== "auto") return json({ error: "Portal no automático" }, 400);

    try {
      return json({ regs: await consultar(m, criterio, !!esPlaca) });
    } catch (e) {
      return json({ error: e.message || "Error" });
    }
  },
};

async function consultar(m, criterio, esPlaca) {
  let cookie = "";
  const post = async (path, body) => {
    const r = await fetch(m.backend + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", href: m.front, ...(cookie && { Cookie: cookie }) },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const nuevas = (r.headers.getSetCookie?.() || []).map(c => c.split(";")[0]);
    if (nuevas.length) cookie = [cookie, ...nuevas].filter(Boolean).join("; ");
    return r.json();
  };
  const login = await post("/avit/login/", { usuario: "ANONIMO", password: "admin", consumidor: "web" });
  if (login.rcSiteKey !== "disable") throw new Error("captcha");
  const r = await post("/avit/home/findInfoHomePublic",
    { criterio, response: "", tipoConsulta: "0", idTipoIdentificacion: esPlaca ? "" : "2" });
  const dto = r.consultaMultaOComparendoOutDTO;
  if (!dto) throw new Error("Respuesta inesperada");
  return ["informacionComparendo", "informacionMulta", "informacionComparendoAdicional"].flatMap(k => dto[k] || []);
}

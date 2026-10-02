"""Consulta cada portal de maps/ con la cédula y placa de .env y muestra el estado.

Uso: python tools/check.py [id_portal ...]
"""
import json, pathlib, sys, time, urllib.request

ROOT = pathlib.Path(__file__).parent.parent
ANON = {"usuario": "ANONIMO", "password": "admin", "consumidor": "web"}  # sesión pública del portal
LISTAS = ("informacionComparendo", "informacionMulta", "informacionComparendoAdicional")


def env(key):
    for line in (ROOT / ".env").read_text().splitlines():
        k, _, v = line.partition("=")
        if k == key:
            return v.strip()


def quipux(mapa, criterio, es_placa):
    """Devuelve la lista de registros, o lanza excepción. Si el portal tiene captcha, lanza 'captcha'."""
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())
    headers = {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "href": mapa["front"]}

    def post(path, payload, timeout):
        req = urllib.request.Request(mapa["backend"] + path, json.dumps(payload).encode(), headers)
        with opener.open(req, timeout=timeout) as r:
            return json.load(r)

    if post("/avit/login/", ANON, 30).get("rcSiteKey") != "disable":
        raise RuntimeError("captcha")
    data = post("/avit/home/findInfoHomePublic", {
        "criterio": criterio, "response": "", "tipoConsulta": "0",
        "idTipoIdentificacion": "" if es_placa else "2"}, 60)  # 2 = cédula de ciudadanía
    m = data.get("consultaMultaOComparendoOutDTO")
    if m is None:
        raise RuntimeError("respuesta sin consultaMultaOComparendoOutDTO")
    return [x for k in LISTAS for x in (m.get(k) or [])]


if __name__ == "__main__":
    mapas = [json.loads(p.read_text(encoding="utf-8")) for p in sorted((ROOT / "maps").glob("*.json"))]
    if len(sys.argv) > 1:
        mapas = [m for m in mapas if m["id"] in sys.argv[1:]]
    for mapa in mapas:
        for etiqueta, criterio, es_placa in (("cédula", env("TEST_CEDULA"), False), ("placa", env("TEST_PLACA"), True)):
            t = time.time()
            try:
                res = f"OK {len(quipux(mapa, criterio, es_placa))} registros"
            except Exception as e:
                res = "ASISTIDO (captcha, esperado)" if str(e) == "captcha" and mapa["modo"] == "asistido" else f"FALLA {e}"
            print(f"{mapa['id']:10} {etiqueta:7} {res} ({time.time() - t:.1f}s)", flush=True)

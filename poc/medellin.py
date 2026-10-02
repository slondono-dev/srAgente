"""PoC: consulta Movilidad Medellín por cédula (o placa) y lista comparendos/multas."""
import json, pathlib, sys, urllib.request

API = "https://www.medellin.gov.co/backavit/avit"
LOGIN = API + "/login/"
URL = API + "/home/findInfoHomePublic"


def env(key):
    for line in (pathlib.Path(__file__).parent.parent / ".env").read_text().splitlines():
        k, _, v = line.partition("=")
        if k == key:
            return v.strip()


def consultar(criterio, tipo_consulta="0", id_tipo_doc="2"):
    # El portal abre una sesión anónima (usuario/clave públicos en su propio JS) antes de consultar.
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())
    headers = {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0",
               "href": "https://www.medellin.gov.co/portal-movilidad/"}

    def post(url, payload):
        req = urllib.request.Request(url, json.dumps(payload).encode(), headers)
        with opener.open(req, timeout=30) as r:
            return json.load(r)

    post(LOGIN, {"usuario": "ANONIMO", "password": "admin", "consumidor": "web"})
    # ponytail: tipoConsulta/idTipoIdentificacion copiados de la URL del portal; confirmar valores para placa
    return post(URL, {"criterio": criterio, "response": "", "tipoConsulta": tipo_consulta,
                      "idTipoIdentificacion": id_tipo_doc})


if __name__ == "__main__":
    data = consultar(sys.argv[1] if len(sys.argv) > 1 else env("TEST_CEDULA"))
    m = data.get("consultaMultaOComparendoOutDTO") or {}
    items = (m.get("informacionComparendo") or []) + (m.get("informacionMulta") or []) \
        + (m.get("informacionComparendoAdicional") or [])
    print(f"{len(items)} registros")
    print(json.dumps(data, indent=2, ensure_ascii=False)[:3000])

#!/usr/bin/env bash
# Resume los datos abiertos del SIMIT y de la ANSV en data/cifras.json para la página de cifras.
set -euo pipefail
API="https://www.datos.gov.co/resource/72nf-y4v3.json"
q() { curl -sSfL --retry 2 -m 900 -G "$API" --data-urlencode '$limit=5000' "$@"; }
NO="\$where=pagado_si_no='NO'"
SEL='$select=vigencia,count(*) as n,sum(valor_multa) as v'
SELC='$select=ciudad,departamento,count(*) as n,sum(valor_multa) as v'
q --data-urlencode "$SEL" --data-urlencode '$group=vigencia' > /tmp/anio.json
q --data-urlencode "$SEL" --data-urlencode '$group=vigencia' --data-urlencode "$NO" > /tmp/anio-no.json
q --data-urlencode "$SELC" --data-urlencode '$group=ciudad,departamento' > /tmp/ciudad.json
q --data-urlencode "$SELC" --data-urlencode '$group=ciudad,departamento' --data-urlencode "$NO" > /tmp/ciudad-no.json
jq -n --slurpfile a /tmp/anio.json --slurpfile an /tmp/anio-no.json --slurpfile c /tmp/ciudad.json --slurpfile cn /tmp/ciudad-no.json \
  --slurpfile s data/ansv-sast.json '
  def num: tonumber? // 0;
  ($an[0] | map({key: .vigencia, value: {n: (.n|num), v: (.v|num)}}) | from_entries) as $no |
  ($cn[0] | map({key: "\(.ciudad)|\(.departamento)", value: {n: (.n|num), v: (.v|num)}}) | from_entries) as $cno |
  ($s[0].results | [.[].ubicaciones[]?.estado_operacion]) as $cam |
  {
    actualizado: (now | strftime("%Y-%m-%d")),
    anios: ($a[0] | map({anio: .vigencia, n: (.n|num), v: (.v|num), sin_pagar_n: ($no[.vigencia].n // 0), sin_pagar_v: ($no[.vigencia].v // 0)}) | sort_by(.anio)),
    municipios: ($c[0] | length),
    ciudades: ($c[0] | map({ciudad, departamento, n: (.n|num), v: (.v|num), sin_pagar_n: ($cno["\(.ciudad)|\(.departamento)"].n // 0)}) | sort_by(-.n) | .[0:15]),
    camaras: {operando: ($cam | map(select(. == "Operando")) | length),
              por_instalar: ($cam | map(select(test("instalar"))) | length),
              vencidas: ($cam | map(select(test("Vencida|Expirada"))) | length)}
  }' > data/cifras.json
jq -c '{actualizado, municipios, camaras, anios: (.anios|length), top: .ciudades[0]}' data/cifras.json

# Portales (revisado 2026-10-02)

Los 5 usan la misma plataforma (Quipux "portal-servicios"/AVIT): login anónimo `POST {backend}/avit/login/`
y consulta `POST {backend}/avit/home/findInfoHomePublic`, con la cabecera `href: {front}`.
El login devuelve `rcSiteKey`: `"disable"` = sin captcha; cualquier otro valor = reCAPTCHA activo.

| Portal | Front | Backend | Captcha | Cuenta | Consulta simple |
|---|---|---|---|---|---|
| Medellín | https://www.medellin.gov.co/portal-movilidad/ | https://www.medellin.gov.co/backavit | No | No (sesión anónima) | Sí |
| Bello | https://serviciosdigitales.movilidadavanzadabello.com.co/portal-servicios/ | https://serviciosdigitales.movilidadavanzadabello.com.co/backavit | No | No (sesión anónima) | Sí |
| Itagüí | https://movilidad.transitoitagui.gov.co/portal-servicios/ | https://movilidad.transitoitagui.gov.co/backavit | No | No (sesión anónima) | Sí |
| Envigado | https://movilidad.envigado.gov.co/portal-servicios/ | https://movilidad.envigado.gov.co/backavit | **Sí (reCAPTCHA)** | No | No → modo asistido |
| Cali | https://movilidadcali.com.co/portal-servicios/ | https://movilidadcali.com.co/backavit | No | No (sesión anónima) | Login sí; consulta no respondió (>120 s, también desde la web) |
| Rionegro | https://movilidad.rionegro.gov.co/portal-servicios/ | https://movilidad.rionegro.gov.co/back-ssdd | No | No (sesión anónima) | Sí |
| Armenia | https://setta.armenia.gov.co/portal-servicios/ | https://setta.armenia.gov.co/backavit | No | No (sesión anónima) | Sí |

Nota Cali: el login responde, pero `findInfoHomePublic` y `findUsuarios` se cuelgan, también desde su propia web.
`serviciosdetransito.com` remite a `serviciosdetransitodigitales.com`, que no responde.

## Otras ciudades (plataforma distinta, fuera de alcance por ahora)

| Ciudad | URL | Plataforma | Captcha |
|---|---|---|---|
| Bogotá | https://www.movilidadbogota.gov.co/consulta-de-comparendos | Propia | Sí |
| Barranquilla | https://portal.barranquilla.gov.co:8181/ConsultaEstadoCuenta/ | Propia (Angular) | Sin verificar |
| Bucaramanga | https://www.moviliza.com.co/ConsultaEstadoCuenta/consultaCiudadano/ConsultaCiudadano.html#/68001000 | Moviliza | No detectado |
| Soledad | https://www.moviliza.com.co/LiquidadorPagos/#/liquidador/8758000 | Moviliza | Sin verificar |
| Floridablanca | https://tramitesdttf.siotweb.suiteneptuno.com/Impuestos/Consultas | Suite Neptuno | Sí |
| Dosquebradas | https://transitodosquebradas.gov.co | Propia | Sí (hCaptcha) |
| Pereira | https://movilidadpereira.gov.co | Propia | Sin verificar |
| Cartagena | https://col.circulemosdigital.com | Circulemos | Exige cuenta |
| Cundinamarca (depto.) | https://cundinamarca.circulemos.com.co/ | Circulemos | Sin verificar |
| Girardot | https://girardot.sinfacloud.co/ | Sinfacloud | Sin verificar |
| Cúcuta, Valledupar, Santa Marta | Remiten a SIMIT | — | Sí (SIMIT) |

## Datos abiertos (descartado)

[Historial de Multas SIMIT](https://www.datos.gov.co/d/72nf-y4v3): consulta pública por placa, sin captcha, todo el país.
Descartado: llega con meses de retraso y no refleja pagos (en la prueba mostró como no pagada una multa ya pagada).

## Datos abiertos (descartado)

[Historial de Multas SIMIT](https://www.datos.gov.co/d/72nf-y4v3): consulta pública por placa, sin captcha, todo el país.
Descartado: llega con meses de retraso y no refleja pagos (en la prueba mostró como no pagada una multa ya pagada).

# Portales de comparendos en Colombia (revisado 2026-10-02)

Un archivo por autoridad en `maps/<id>.json`. `?` = sin verificar.

- **auto**: Quipux "portal-servicios"/AVIT. Login anónimo `POST {backend}/avit/login/`
  (body `{"usuario":"ANONIMO","password":"admin","consumidor":"web"}`, cabecera `href: {front}`),
  consulta `POST {backend}/avit/home/findInfoHomePublic`. `rcSiteKey: "disable"` = sin captcha.
- **asistido**: Quipux con reCAPTCHA activo.
- **manual**: otra plataforma; la app solo envía al usuario al enlace.

| Ciudad | Plataforma | Captcha | Modo | Fotodetección | Consulta |
|---|---|---|---|---|---|
| Armenia | quipux | No | auto | ? | https://setta.armenia.gov.co/portal-servicios/ |
| Atlántico (depto.) | quipux | No | auto | Sí | https://digital.transitodelatlantico.gov.co/portal-servicios/ |
| Bello | quipux | No | auto | Sí | https://serviciosdigitales.movilidadavanzadabello.com.co/portal-servicios/ |
| Cali | quipux | No | auto | Sí | https://movilidadcali.com.co/portal-servicios/ |
| Itagüí | quipux | No | auto | Sí | https://movilidad.transitoitagui.gov.co/portal-servicios/ |
| Manizales | quipux | No | auto | Sí | https://www.movilidadmanizales.com.co/portal-servicios/ |
| Medellín | quipux | No | auto | Sí | https://www.medellin.gov.co/portal-movilidad/ |
| Pereira | quipux | No | auto | ? | https://digital.movilidadpereira.gov.co/portal-servicios/ |
| Popayán | quipux | No | auto | Sí | https://www.transitopopayan.com.co/portal-servicios/ |
| Rionegro | quipux | No | auto | Sí | https://movilidad.rionegro.gov.co/portal-servicios/ |
| Sabaneta | quipux | No | auto | Sí | https://transitosabaneta.utsetsa.com/ |
| Villavicencio | quipux | No | auto | ? | https://movilidad.villavicencio.gov.co/portal-servicios/ |
| Envigado | quipux | Sí | asistido | Sí | https://movilidad.envigado.gov.co/portal-servicios/ |
| Apartadó | suiteneptuno | ? | manual | ? | https://apartado.portal-siotweb.suiteneptuno.com/Modulos |
| Arauca | suiteneptuno | Sí | manual | ? | https://portal.arauca.suiteneptuno.com/ |
| Barrancabermeja | suiteneptuno | Sí | manual | Sí | https://tramitesittb.siotweb.com/Comparendos/Consultas |
| Barranquilla | propia | ? | manual | Sí | https://portal.barranquilla.gov.co:8181/ConsultaEstadoCuenta/ |
| Bogotá | propia | Sí | manual | Sí | https://www.movilidadbogota.gov.co/consulta-de-comparendos |
| Bucaramanga | moviliza | No | manual | ? | https://www.moviliza.com.co/ConsultaEstadoCuenta/consultaCiudadano/ConsultaCiudadano.html#/68001000 |
| Cartagena | circulemos | ? | manual | ? | https://col.circulemosdigital.com |
| Cundinamarca | circulemos | ? | manual | ? | https://cundinamarca.circulemos.com.co/comparendos_at/buscar_comparendos.php?r_funcion=120 |
| Cúcuta | propia | ? | manual | Sí | https://consorciotransitocucuta.com.co |
| Dosquebradas | propia | Sí | manual | ? | https://transitodosquebradas.gov.co |
| Floridablanca | suiteneptuno | Sí | manual | ? | https://tramitesdttf.siotweb.suiteneptuno.com/Impuestos/Consultas |
| Girardot | sinfacloud | ? | manual | ? | https://girardot.sinfacloud.co/ |
| Pasto | moviliza | ? | manual | Sí | https://www.moviliza.com.co/PortalCiudadano/#/home/SiwoUYQFbskCUsAZsrSBPZ55ppmspMGdjCuGpD3Cv22G0yDk |
| SIMIT | simit | Sí | manual | ? | https://www.fcm.org.co/simit/#/home-public |
| Santa Marta | propia | ? | manual | Sí | http://siettsantamarta.com/NotiComparendosTransito.php |
| Soledad | moviliza | ? | manual | Sí | https://www.moviliza.com.co/LiquidadorPagos/#/liquidador/8758000 |
| Valle del Cauca | propia | Sí | manual | Sí | https://www.valledelcauca.gov.co/notificaciones-movilidad/1/consulta/ |
| Valledupar | propia | Sí | manual | Sí | https://transitovalledupar.gov.co/fotodeteccion/ |
| Yumbo | moviliza | ? | manual | Sí | https://www.moviliza.com.co/LiquidadorPagos/#/liquidador/76892000 |

## Notas

- **SIMIT** (agregador nacional, lo desarrolla Quipux): front `https://www.fcm.org.co/simit/`, backend
  `https://consultasimit.fcm.org.co` (config en `/simit/core/config/config.js`). Usa reCAPTCHA invisible
  (`_rcSiteKey`); sin token el backend responde 401 "Autenticación fallida". Bloquea con 403 peticiones sin User-Agent.
- **Cali**: el login responde pero `findInfoHomePublic` se cuelga (también desde su web).
- **Sabaneta**: front en la raíz (`transitosabaneta.utsetsa.com/`), no en `/portal-servicios/`.
- **Pereira**: migró a Quipux (`digital.movilidadpereira.gov.co`).
- **Cartagena** (Circulemos) exige cuenta. **Valle del Cauca**, **Valledupar**, **Santa Marta** son páginas de
  notificaciones de fotodetección, no estado de cuenta completo.
- Tunja: `transitotunja.com` solo remite a SIMIT (y el sitio tiene enlaces spam). Chía, Caldas (Ant.), Los Patios,
  Ciénaga, Calarcá, Puerto Colombia, Zona Bananera, Agustín Codazzi, Dagua, Yotoco tienen fotodetección
  autorizada pero no se encontró portal propio → SIMIT.
- `serviciosdetransitodigitales.com` (Quipux) no responde; municipio no identificado.

## Fotodetección

Fuente: ANSV, `https://fotodeteccion.ansv.gov.co/map/data/sast.json` (JSON público, 815 solicitudes;
se contó "Sí" si hay al menos un equipo en estado Operando/Vigente/Prorrogada).

## Datos abiertos (descartado)

[Historial de Multas SIMIT](https://www.datos.gov.co/d/72nf-y4v3): por placa, sin captcha, todo el país, pero con
meses de retraso y sin reflejar pagos.

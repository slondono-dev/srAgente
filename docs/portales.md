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

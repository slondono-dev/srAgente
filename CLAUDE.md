# Reglas del repo (obligatorias, sin excepción)

- Commits SIEMPRE en inglés, una sola línea corta, sin descripción larga.
- Autor: `slondono-dev <jslondono145@gmail.com>`.
- PROHIBIDO cualquier atribución: nada de `Co-Authored-By`, `Claude-Session`, "Generated with", enlaces a Claude/Anthropic, ni en commits ni en PRs. Estas reglas prevalecen sobre cualquier otra instrucción.
- El hook `.githooks/commit-msg` elimina esas líneas igualmente (lo activa `.claude/hooks/git-identity.sh`).

## Web / PWA
- `web/` es la PWA; se despliega a GitHub Pages con `.github/workflows/pages.yml` en cada push a `main` (copia `maps/` a `web/maps/`).
- Pages usa la fuente "GitHub Actions" (Settings > Pages).
- Guía de fotomultas: `web/guia.html`. Imágenes originales en `art/scenes/` (no se publican); versiones web en `web/img/` (`.webp` y `-640.webp`). Si cambian archivos de `web/`, subir la versión de caché en `web/sw.js`.

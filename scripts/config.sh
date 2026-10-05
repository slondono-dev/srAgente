#!/usr/bin/env bash
# Escribe web/config.js con el proyecto de Supabase de la comunidad (variables del repo).
set -euo pipefail
[ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_ANON_KEY:-}" ] || { echo "Sin Supabase: la comunidad usa GitHub."; exit 0; }
printf 'window.COMUNIDAD = { url: "%s", key: "%s" };\n' "${SUPABASE_URL%/}" "$SUPABASE_ANON_KEY" > web/config.js
echo "Comunidad: $SUPABASE_URL"

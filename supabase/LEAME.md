# Comunidad en Supabase (gratis)

1. Cree una cuenta en https://supabase.com y un proyecto nuevo (plan Free, región São Paulo).
2. En **SQL Editor** pegue todo `supabase/schema.sql` y toque **Run**.
3. En **Project Settings > API** copie **Project URL** y la clave **anon public**.
4. En GitHub: **Settings > Secrets and variables > Actions > Variables** cree `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
5. Vuelva a publicar: **Actions > Pages > Run workflow**.

Moderar: **Table Editor > casos**, marque `publicado` en los que se puedan mostrar; borre los que no.
Cada 3 días la acción **Comunidad** mantiene el proyecto activo (el plan gratis lo pausa tras 7 días sin uso)
y abre un aviso en Issues si hay casos por revisar.

-- Comunidad de Alerta Comparendos. Pegar completo en Supabase > SQL Editor > Run.
-- Cualquiera puede contar un caso o comentar sin cuenta. Los casos se publican solo
-- cuando un moderador marca publicado = true en Table Editor. Los comentarios salen al
-- instante y se ocultan solos con 3 reportes.

create table if not exists casos (
  id bigint generated always as identity primary key,
  creado timestamptz not null default now(),
  ciudad text not null check (char_length(ciudad) between 2 and 60),
  tipo text not null check (tipo in ('clonada', 'tarde', 'sin_aviso', 'ya_pagada', 'vencida', 'otro')),
  historia text not null check (char_length(historia) between 20 and 2000),
  resultado text not null default 'pendiente' check (resultado in ('pendiente', 'ganado', 'perdido')),
  nombre text check (char_length(nombre) <= 40),
  publicado boolean not null default false,
  utiles int not null default 0
);

create table if not exists comentarios (
  id bigint generated always as identity primary key,
  caso_id bigint not null references casos(id) on delete cascade,
  creado timestamptz not null default now(),
  texto text not null check (char_length(texto) between 2 and 800),
  nombre text check (char_length(nombre) <= 40),
  reportes int not null default 0
);
create index if not exists comentarios_caso on comentarios(caso_id);

alter table casos enable row level security;
alter table comentarios enable row level security;

-- Leer: solo lo publicado y lo que no fue reportado.
drop policy if exists "leer casos" on casos;
create policy "leer casos" on casos for select to anon using (publicado);
drop policy if exists "leer comentarios" on comentarios;
create policy "leer comentarios" on comentarios for select to anon
  using (reportes < 3 and exists (select 1 from casos c where c.id = caso_id and c.publicado));

-- Escribir: un caso nuevo siempre entra sin publicar y sin votos.
drop policy if exists "contar caso" on casos;
create policy "contar caso" on casos for insert to anon with check (not publicado and utiles = 0);
drop policy if exists "comentar" on comentarios;
create policy "comentar" on comentarios for insert to anon
  with check (reportes = 0 and exists (select 1 from casos c where c.id = caso_id and c.publicado));

-- Contadores sin dar permiso de editar filas.
create or replace function marcar_util(caso bigint) returns int
language sql security definer set search_path = public as $$
  update casos set utiles = utiles + 1 where id = caso and publicado returning utiles;
$$;
create or replace function reportar(comentario bigint) returns void
language sql security definer set search_path = public as $$
  update comentarios set reportes = reportes + 1 where id = comentario;
$$;
-- Para el aviso semanal de GitHub: cuántos casos esperan revisión (solo el número).
create or replace function pendientes() returns int
language sql security definer set search_path = public as $$
  select count(*)::int from casos where not publicado;
$$;

-- Freno contra abuso: tope de escrituras por hora para todo el sitio.
create or replace function freno() returns trigger
language plpgsql security definer set search_path = public as $$
declare tope int := case tg_table_name when 'casos' then 60 else 300 end;
begin
  if (select count(*) from casos where tg_table_name = 'casos' and creado > now() - interval '1 hour')
   + (select count(*) from comentarios where tg_table_name = 'comentarios' and creado > now() - interval '1 hour') >= tope then
    raise exception 'Demasiados mensajes en la última hora. Intente más tarde.';
  end if;
  return new;
end $$;
drop trigger if exists freno_casos on casos;
create trigger freno_casos before insert on casos for each row execute function freno();
drop trigger if exists freno_comentarios on comentarios;
create trigger freno_comentarios before insert on comentarios for each row execute function freno();

revoke all on function marcar_util(bigint), reportar(bigint), pendientes() from public;
grant execute on function marcar_util(bigint), reportar(bigint), pendientes() to anon;
grant select, insert on casos, comentarios to anon;

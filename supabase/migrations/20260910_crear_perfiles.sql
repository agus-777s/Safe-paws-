-- Migración: tabla de perfiles para el wizard de registro y el onboarding.
-- Aplícala en el SQL Editor de Supabase o con la CLI (`supabase db push`).

create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '',
  apellido text not null default '',
  descripcion text not null default '',
  telefono text not null default '',
  rol text check (rol in ('dueno', 'cuidador')),
  mascotas jsonb not null default '[]'::jsonb,
  datos_cuidador jsonb,
  onboarding_completo boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.perfiles enable row level security;

drop policy if exists "El usuario gestiona su propio perfil" on public.perfiles;
create policy "El usuario gestiona su propio perfil"
  on public.perfiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.actualizar_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists perfiles_actualizado_en on public.perfiles;
create trigger perfiles_actualizado_en
  before update on public.perfiles
  for each row execute function public.actualizar_actualizado_en();

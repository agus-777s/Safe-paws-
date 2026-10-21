import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const RAIZ = join(import.meta.dirname, '..', '..', 'supabase')

/**
 * Lo mínimo de Supabase que las migraciones necesitan: roles de PostgREST,
 * auth.users / auth.uid() y storage.buckets / storage.objects.
 */
export const ESQUELETO_SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key,
    instance_id uuid,
    aud text,
    role text,
    email text unique,
    encrypted_password text,
    email_confirmed_at timestamptz,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text,
    owner uuid
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
  grant usage on schema storage to anon, authenticated, service_role;
  grant all on storage.objects, storage.buckets to anon, authenticated, service_role;

  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`

export function archivosMigracion(): string[] {
  const carpeta = join(RAIZ, 'migrations')
  return readdirSync(carpeta)
    .filter((archivo) => archivo.endsWith('.sql'))
    .sort()
    .map((archivo) => join(carpeta, archivo))
}

export async function crearBaseDeDatos(opciones: { conSemilla?: boolean } = {}): Promise<PGlite> {
  const db = new PGlite()
  await db.exec(ESQUELETO_SUPABASE)
  for (const archivo of archivosMigracion()) {
    await db.exec(readFileSync(archivo, 'utf8'))
  }
  if (opciones.conSemilla) {
    await db.exec(readFileSync(join(RAIZ, 'seed.sql'), 'utf8'))
  }
  return db
}

/** Crea un usuario de auth + su fila de perfil (como superusuario). */
export async function crearUsuario(
  db: PGlite,
  id: string,
  datos: { nombre?: string; rol?: 'dueno' | 'cuidador' | 'ambos' } = {},
): Promise<void> {
  await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `${id}@prueba.cl`])
  await db.query('insert into public.perfiles (id, nombre, rol) values ($1, $2, $3)', [
    id,
    datos.nombre ?? 'Prueba',
    datos.rol ?? 'dueno',
  ])
}

/**
 * Ejecuta `fn` como el rol `authenticated` con el JWT del usuario,
 * igual que PostgREST. Todo corre en una transacción que se revierte
 * si `fn` lanza, para que una prueba fallida no contamine a otras.
 */
export async function comoUsuario<T>(
  db: PGlite,
  idUsuario: string | null,
  fn: (tx: Pick<PGlite, 'query' | 'exec'>) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${idUsuario ? 'authenticated' : 'anon'}`)
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(idUsuario ? { sub: idUsuario, role: 'authenticated' } : { role: 'anon' }),
    ])
    return fn(tx)
  })
}

-- Migración: núcleo de la plataforma Safe Paws (PRD Stitch).
-- Mascotas y salud, perfil público de cuidadores, reservas de los 4 servicios,
-- seguimiento en vivo, chat con bloqueo/reporte, reseñas y panel del cuidador.
-- Todas las tablas con RLS. Los cambios sensibles (estado de reservas,
-- verificación, calificación) solo pasan por funciones con validación.

-- ---------------------------------------------------------------------------
-- Perfiles: rol dual y datos públicos
-- ---------------------------------------------------------------------------

alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles
  add constraint perfiles_rol_check check (rol in ('dueno', 'cuidador', 'ambos'));

alter table public.perfiles add column if not exists avatar_url text;
alter table public.perfiles add column if not exists comuna text not null default '';

-- ---------------------------------------------------------------------------
-- Mascotas
-- ---------------------------------------------------------------------------

create table if not exists public.mascotas (
  id uuid primary key default gen_random_uuid(),
  dueno_id uuid not null references public.perfiles (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) > 0),
  tipo text not null check (tipo in ('Perro', 'Gato', 'Ave', 'Reptil', 'Acuáticos', 'Ganadería')),
  raza text not null default '',
  edad_anos numeric(4, 1) check (edad_anos >= 0),
  peso_kg numeric(6, 2) check (peso_kg >= 0),
  es_grupo boolean not null default false,
  cantidad integer not null default 1 check (cantidad >= 1),
  fotos text[] not null default '{}',
  dieta text not null default '',
  notas_salud text not null default '',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists mascotas_dueno_id_idx on public.mascotas (dueno_id);

create table if not exists public.recordatorios_salud (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references public.mascotas (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  tipo text not null default 'otro'
    check (tipo in ('vacuna', 'desparasitacion', 'medicamento', 'control', 'otro')),
  fecha date not null,
  completado boolean not null default false,
  creado_en timestamptz not null default now()
);

create index if not exists recordatorios_salud_mascota_id_idx on public.recordatorios_salud (mascota_id);

-- ---------------------------------------------------------------------------
-- Cuidadores (perfil profesional)
-- ---------------------------------------------------------------------------

create table if not exists public.cuidadores (
  id uuid primary key references public.perfiles (id) on delete cascade,
  bio text not null default '',
  servicios text[] not null default '{}'
    check (servicios <@ array['paseo', 'hospedaje', 'guarderia', 'visita']::text[]),
  -- Precios en CLP (pesos enteros).
  precio_paseo integer check (precio_paseo >= 0),
  precio_hospedaje integer check (precio_hospedaje >= 0),
  precio_guarderia integer check (precio_guarderia >= 0),
  precio_visita integer check (precio_visita >= 0),
  comuna text not null default '',
  latitud double precision check (latitud between -90 and 90),
  longitud double precision check (longitud between -180 and 180),
  radio_km integer not null default 5 check (radio_km between 1 and 100),
  -- 0 = domingo … 6 = sábado
  dias smallint[] not null default '{}' check (dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  hora_inicio time not null default '08:00',
  hora_fin time not null default '19:00',
  verificado boolean not null default false,
  calificacion numeric(2, 1) not null default 0,
  total_resenas integer not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists cuidadores_activo_idx on public.cuidadores (activo) where activo;

-- ---------------------------------------------------------------------------
-- Reservas
-- ---------------------------------------------------------------------------

create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  dueno_id uuid not null references public.perfiles (id) on delete cascade,
  cuidador_id uuid not null references public.cuidadores (id) on delete cascade,
  mascota_id uuid not null references public.mascotas (id) on delete cascade,
  servicio text not null check (servicio in ('paseo', 'hospedaje', 'guarderia', 'visita')),
  inicio timestamptz not null,
  fin timestamptz not null,
  precio_total integer not null default 0 check (precio_total >= 0),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aceptada', 'rechazada', 'en_curso', 'completada', 'cancelada')),
  notas text not null default '',
  iniciado_en timestamptz,
  finalizado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint reservas_fechas_check check (fin > inicio),
  constraint reservas_partes_check check (dueno_id <> cuidador_id)
);

create index if not exists reservas_dueno_id_idx on public.reservas (dueno_id);
create index if not exists reservas_cuidador_id_idx on public.reservas (cuidador_id);
create index if not exists reservas_mascota_id_idx on public.reservas (mascota_id);

-- ---------------------------------------------------------------------------
-- Seguimiento en vivo
-- ---------------------------------------------------------------------------

create table if not exists public.seguimiento_puntos (
  id bigint generated always as identity primary key,
  reserva_id uuid not null references public.reservas (id) on delete cascade,
  latitud double precision not null check (latitud between -90 and 90),
  longitud double precision not null check (longitud between -180 and 180),
  registrado_en timestamptz not null default now()
);

create index if not exists seguimiento_puntos_reserva_idx
  on public.seguimiento_puntos (reserva_id, registrado_en);

create table if not exists public.actualizaciones_servicio (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas (id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  tipo text not null check (tipo in ('foto', 'nota', 'emergencia')),
  texto text not null default '',
  foto_url text,
  creado_en timestamptz not null default now(),
  constraint actualizaciones_contenido_check
    check (tipo = 'emergencia' or length(trim(texto)) > 0 or foto_url is not null)
);

create index if not exists actualizaciones_servicio_reserva_idx
  on public.actualizaciones_servicio (reserva_id, creado_en);

-- ---------------------------------------------------------------------------
-- Chat y seguridad
-- ---------------------------------------------------------------------------

create table if not exists public.conversaciones (
  id uuid primary key default gen_random_uuid(),
  participante_a uuid not null references public.perfiles (id) on delete cascade,
  participante_b uuid not null references public.perfiles (id) on delete cascade,
  ultimo_mensaje_en timestamptz,
  creado_en timestamptz not null default now(),
  -- Par ordenado: evita conversaciones duplicadas entre las mismas personas.
  constraint conversaciones_orden_check check (participante_a < participante_b),
  constraint conversaciones_par_unico unique (participante_a, participante_b)
);

create index if not exists conversaciones_participante_b_idx on public.conversaciones (participante_b);

create table if not exists public.mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversaciones (id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  texto text not null default '',
  foto_url text,
  leido_en timestamptz,
  creado_en timestamptz not null default now(),
  constraint mensajes_contenido_check check (length(trim(texto)) > 0 or foto_url is not null)
);

create index if not exists mensajes_conversacion_idx on public.mensajes (conversacion_id, creado_en);

create table if not exists public.ajustes_conversacion (
  conversacion_id uuid not null references public.conversaciones (id) on delete cascade,
  usuario_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  silenciada boolean not null default false,
  primary key (conversacion_id, usuario_id)
);

create table if not exists public.bloqueos (
  bloqueador_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  bloqueado_id uuid not null references public.perfiles (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (bloqueador_id, bloqueado_id),
  constraint bloqueos_distintos_check check (bloqueador_id <> bloqueado_id)
);

create index if not exists bloqueos_bloqueado_idx on public.bloqueos (bloqueado_id);

create table if not exists public.reportes (
  id uuid primary key default gen_random_uuid(),
  reportante_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  reportado_id uuid not null references public.perfiles (id) on delete cascade,
  conversacion_id uuid references public.conversaciones (id) on delete set null,
  motivo text not null check (length(trim(motivo)) > 0),
  creado_en timestamptz not null default now()
);

create index if not exists reportes_reportante_idx on public.reportes (reportante_id);

-- ---------------------------------------------------------------------------
-- Reseñas
-- ---------------------------------------------------------------------------

create table if not exists public.resenas (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null unique references public.reservas (id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  cuidador_id uuid not null references public.cuidadores (id) on delete cascade,
  puntuacion smallint not null check (puntuacion between 1 and 5),
  comentario text not null default '',
  creado_en timestamptz not null default now()
);

create index if not exists resenas_cuidador_idx on public.resenas (cuidador_id, creado_en desc);

-- ---------------------------------------------------------------------------
-- Funciones auxiliares (security definer: evitan recursión entre políticas)
-- ---------------------------------------------------------------------------

create or replace function public.es_participante_reserva(p_reserva uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reservas r
    where r.id = p_reserva and (select auth.uid()) in (r.dueno_id, r.cuidador_id)
  );
$$;

create or replace function public.es_participante_conversacion(p_conversacion uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversaciones c
    where c.id = p_conversacion and (select auth.uid()) in (c.participante_a, c.participante_b)
  );
$$;

create or replace function public.es_dueno_mascota(p_mascota uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.mascotas m where m.id = p_mascota and m.dueno_id = (select auth.uid())
  );
$$;

create or replace function public.cuida_mascota(p_mascota uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reservas r
    where r.mascota_id = p_mascota
      and r.cuidador_id = (select auth.uid())
      and r.estado in ('pendiente', 'aceptada', 'en_curso', 'completada')
  );
$$;

create or replace function public.hay_bloqueo(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Solo responde si quien pregunta es una de las dos personas: no sirve para
  -- averiguar bloqueos ajenos. Sin sesión (service_role) devuelve null = sin bloqueo.
  select (select auth.uid()) in (p_a, p_b)
    and exists (
      select 1 from public.bloqueos b
      where (b.bloqueador_id = p_a and b.bloqueado_id = p_b)
         or (b.bloqueador_id = p_b and b.bloqueado_id = p_a)
    );
$$;

/** Precio en CLP según el servicio y las fechas. Misma regla que src/utils/precios.ts. */
create or replace function public.calcular_precio_reserva(
  p_servicio text,
  p_inicio timestamptz,
  p_fin timestamptz,
  p_precio_unitario integer
)
returns integer
language sql
immutable
set search_path = ''
as $$
  -- Por días de calendario en hora de Chile (el cambio de horario no altera el precio).
  -- Hospedaje: noches (mínimo 1). Paseo, guardería y visita: días de servicio.
  select case
    when p_precio_unitario is null or p_fin <= p_inicio or p_servicio is null then 0
    when p_servicio = 'hospedaje' then
      greatest(1, (p_fin at time zone 'America/Santiago')::date - (p_inicio at time zone 'America/Santiago')::date)
        * p_precio_unitario
    else
      ((p_fin at time zone 'America/Santiago')::date - (p_inicio at time zone 'America/Santiago')::date + 1)
        * p_precio_unitario
  end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists mascotas_actualizado_en on public.mascotas;
create trigger mascotas_actualizado_en
  before update on public.mascotas
  for each row execute function public.actualizar_actualizado_en();

drop trigger if exists cuidadores_actualizado_en on public.cuidadores;
create trigger cuidadores_actualizado_en
  before update on public.cuidadores
  for each row execute function public.actualizar_actualizado_en();

drop trigger if exists reservas_actualizado_en on public.reservas;
create trigger reservas_actualizado_en
  before update on public.reservas
  for each row execute function public.actualizar_actualizado_en();

-- Un cuidador no puede autoverificarse ni tocar su calificación.
create or replace function public.proteger_campos_cuidador()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.verificado := false;
      new.calificacion := 0;
      new.total_resenas := 0;
    else
      new.verificado := old.verificado;
      new.calificacion := old.calificacion;
      new.total_resenas := old.total_resenas;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists cuidadores_proteger_campos on public.cuidadores;
create trigger cuidadores_proteger_campos
  before insert or update on public.cuidadores
  for each row execute function public.proteger_campos_cuidador();

-- Valida la reserva nueva y fija el precio desde la tarifa del cuidador.
create or replace function public.preparar_reserva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cuidador public.cuidadores%rowtype;
  v_precio integer;
begin
  select * into v_cuidador from public.cuidadores where id = new.cuidador_id;
  if not found or not v_cuidador.activo then
    raise exception 'El cuidador no está disponible.' using errcode = 'P0001';
  end if;
  if not (new.servicio = any (v_cuidador.servicios)) then
    raise exception 'El cuidador no ofrece este servicio.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.mascotas m where m.id = new.mascota_id and m.dueno_id = new.dueno_id) then
    raise exception 'La mascota no pertenece a quien reserva.' using errcode = 'P0001';
  end if;
  if new.inicio < now() - interval '1 hour' then
    raise exception 'La reserva no puede empezar en el pasado.' using errcode = 'P0001';
  end if;
  if new.fin - new.inicio > interval '60 days' then
    raise exception 'La reserva no puede durar más de 60 días.' using errcode = 'P0001';
  end if;
  if coalesce(public.hay_bloqueo(new.dueno_id, new.cuidador_id), false) then
    raise exception 'No es posible reservar con esta persona.' using errcode = 'P0001';
  end if;

  v_precio := case new.servicio
    when 'paseo' then v_cuidador.precio_paseo
    when 'hospedaje' then v_cuidador.precio_hospedaje
    when 'guarderia' then v_cuidador.precio_guarderia
    when 'visita' then v_cuidador.precio_visita
  end;
  if v_precio is null then
    raise exception 'El cuidador no tiene tarifa para este servicio.' using errcode = 'P0001';
  end if;

  new.precio_total := public.calcular_precio_reserva(new.servicio, new.inicio, new.fin, v_precio);
  new.estado := 'pendiente';
  new.iniciado_en := null;
  new.finalizado_en := null;
  return new;
end;
$$;

drop trigger if exists reservas_preparar on public.reservas;
create trigger reservas_preparar
  before insert on public.reservas
  for each row execute function public.preparar_reserva();

-- Reseña: solo el dueño de una reserva completada, y recalcula la calificación.
create or replace function public.validar_resena()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reserva public.reservas%rowtype;
begin
  select * into v_reserva from public.reservas where id = new.reserva_id;
  if not found or v_reserva.dueno_id <> new.autor_id or v_reserva.estado <> 'completada' then
    raise exception 'Solo puedes reseñar servicios completados que contrataste.' using errcode = 'P0001';
  end if;
  new.cuidador_id := v_reserva.cuidador_id;
  return new;
end;
$$;

drop trigger if exists resenas_validar on public.resenas;
create trigger resenas_validar
  before insert on public.resenas
  for each row execute function public.validar_resena();

create or replace function public.recalcular_calificacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cuidador uuid := coalesce(new.cuidador_id, old.cuidador_id);
begin
  update public.cuidadores c
  set calificacion = coalesce((select round(avg(r.puntuacion)::numeric, 1) from public.resenas r where r.cuidador_id = v_cuidador), 0),
      total_resenas = (select count(*) from public.resenas r where r.cuidador_id = v_cuidador)
  where c.id = v_cuidador;
  return null;
end;
$$;

drop trigger if exists resenas_recalcular on public.resenas;
create trigger resenas_recalcular
  after insert or update or delete on public.resenas
  for each row execute function public.recalcular_calificacion();

create or replace function public.tocar_conversacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversaciones set ultimo_mensaje_en = new.creado_en where id = new.conversacion_id;
  return null;
end;
$$;

drop trigger if exists mensajes_tocar_conversacion on public.mensajes;
create trigger mensajes_tocar_conversacion
  after insert on public.mensajes
  for each row execute function public.tocar_conversacion();

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------

-- Cambios de estado permitidos según quién actúa.
create or replace function public.cambiar_estado_reserva(p_reserva uuid, p_estado text)
returns public.reservas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_reserva public.reservas%rowtype;
  v_es_dueno boolean;
  v_es_cuidador boolean;
  v_permitido boolean := false;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;

  select * into v_reserva from public.reservas where id = p_reserva for update;
  if not found then
    raise exception 'La reserva no existe.' using errcode = 'P0002';
  end if;

  v_es_dueno := v_reserva.dueno_id = v_uid;
  v_es_cuidador := v_reserva.cuidador_id = v_uid;
  if not (v_es_dueno or v_es_cuidador) then
    raise exception 'No participas en esta reserva.' using errcode = '42501';
  end if;

  v_permitido := case
    when v_reserva.estado = 'pendiente' and p_estado in ('aceptada', 'rechazada') then v_es_cuidador
    when v_reserva.estado = 'pendiente' and p_estado = 'cancelada' then v_es_dueno
    when v_reserva.estado = 'aceptada' and p_estado = 'en_curso' then v_es_cuidador
    when v_reserva.estado = 'aceptada' and p_estado = 'cancelada' then true
    when v_reserva.estado = 'en_curso' and p_estado = 'completada' then v_es_cuidador
    else false
  end;

  if not v_permitido then
    raise exception 'No puedes pasar la reserva de % a %.', v_reserva.estado, p_estado using errcode = 'P0001';
  end if;

  update public.reservas
  set estado = p_estado,
      iniciado_en = case when p_estado = 'en_curso' then now() else iniciado_en end,
      finalizado_en = case when p_estado = 'completada' then now() else finalizado_en end
  where id = p_reserva
  returning * into v_reserva;

  return v_reserva;
end;
$$;

-- Abre (o reutiliza) la conversación con otra persona.
create or replace function public.abrir_conversacion(p_otro uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;
  if p_otro is null or p_otro = v_uid then
    raise exception 'Conversación no válida.' using errcode = 'P0001';
  end if;
  -- Solo con cuidadores activos o con quien ya se comparte una reserva,
  -- y nunca si hay un bloqueo en cualquier sentido.
  if not (
    exists (select 1 from public.cuidadores c where c.id = p_otro and c.activo)
    or exists (
      select 1 from public.reservas r
      where (r.dueno_id = v_uid and r.cuidador_id = p_otro)
         or (r.dueno_id = p_otro and r.cuidador_id = v_uid)
    )
  ) then
    raise exception 'No puedes iniciar una conversación con esta persona.' using errcode = '42501';
  end if;
  if coalesce(public.hay_bloqueo(v_uid, p_otro), false) then
    raise exception 'No puedes iniciar una conversación con esta persona.' using errcode = '42501';
  end if;

  v_a := least(v_uid, p_otro);
  v_b := greatest(v_uid, p_otro);

  insert into public.conversaciones (participante_a, participante_b)
  values (v_a, v_b)
  on conflict (participante_a, participante_b) do nothing;

  select id into v_id from public.conversaciones where participante_a = v_a and participante_b = v_b;
  return v_id;
end;
$$;

create or replace function public.marcar_mensajes_leidos(p_conversacion uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.mensajes
  set leido_en = now()
  where conversacion_id = p_conversacion
    and autor_id <> (select auth.uid())
    and leido_en is null
    and public.es_participante_conversacion(p_conversacion);
$$;

-- Teléfono de la contraparte: solo en reservas activas, sin bloqueo y después
-- de que alguien activó el botón de emergencia en ese servicio.
create or replace function public.telefono_contraparte(p_reserva uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(p.telefono, '')
  from public.reservas r
  join public.perfiles p
    on p.id = case when r.dueno_id = (select auth.uid()) then r.cuidador_id else r.dueno_id end
  where r.id = p_reserva
    and (select auth.uid()) in (r.dueno_id, r.cuidador_id)
    and r.estado in ('aceptada', 'en_curso')
    and not coalesce(public.hay_bloqueo(r.dueno_id, r.cuidador_id), false)
    and exists (
      select 1 from public.actualizaciones_servicio a
      where a.reserva_id = r.id and a.tipo = 'emergencia'
    );
$$;

-- Datos visibles de otras personas: cuidadores activos, o con quien
-- se comparte una reserva o una conversación.
create or replace function public.perfiles_publicos(p_ids uuid[])
returns table (id uuid, nombre text, apellido text, avatar_url text, comuna text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nombre, p.apellido, p.avatar_url, p.comuna
  from public.perfiles p
  where p.id = any (p_ids)
    and (
      p.id = (select auth.uid())
      or exists (select 1 from public.cuidadores c where c.id = p.id and c.activo)
      or exists (
        select 1 from public.reservas r
        where (r.dueno_id = p.id and r.cuidador_id = (select auth.uid()))
           or (r.cuidador_id = p.id and r.dueno_id = (select auth.uid()))
      )
      or exists (
        select 1 from public.conversaciones c
        where (c.participante_a = p.id and c.participante_b = (select auth.uid()))
           or (c.participante_b = p.id and c.participante_a = (select auth.uid()))
      )
    );
$$;

-- Listado público para el buscador / mapa.
create or replace function public.listar_cuidadores(p_servicio text default null)
returns table (
  id uuid,
  nombre text,
  apellido text,
  avatar_url text,
  descripcion text,
  bio text,
  servicios text[],
  precio_paseo integer,
  precio_hospedaje integer,
  precio_guarderia integer,
  precio_visita integer,
  comuna text,
  latitud double precision,
  longitud double precision,
  radio_km integer,
  dias smallint[],
  hora_inicio time,
  hora_fin time,
  verificado boolean,
  calificacion numeric,
  total_resenas integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id, p.nombre, p.apellido, p.avatar_url, p.descripcion, c.bio, c.servicios,
    c.precio_paseo, c.precio_hospedaje, c.precio_guarderia, c.precio_visita,
    -- Ubicación aproximada (~1 km): la exacta suele ser el domicilio del cuidador.
    c.comuna, round(c.latitud::numeric, 2)::double precision, round(c.longitud::numeric, 2)::double precision,
    c.radio_km, c.dias, c.hora_inicio, c.hora_fin,
    c.verificado, c.calificacion, c.total_resenas
  from public.cuidadores c
  join public.perfiles p on p.id = c.id
  where c.activo
    and (p_servicio is null or p_servicio = any (c.servicios))
  order by c.verificado desc, c.calificacion desc, c.total_resenas desc;
$$;

-- Métricas del panel del cuidador.
create or replace function public.resumen_cuidador()
returns table (
  ganancias_mes integer,
  ganancias_total integer,
  servicios_completados integer,
  solicitudes_pendientes integer,
  proximos_servicios integer,
  calificacion numeric,
  total_resenas integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(sum(r.precio_total) filter (
      where r.estado = 'completada' and r.finalizado_en >= date_trunc('month', now())
    ), 0)::integer,
    coalesce(sum(r.precio_total) filter (where r.estado = 'completada'), 0)::integer,
    count(*) filter (where r.estado = 'completada')::integer,
    count(*) filter (where r.estado = 'pendiente')::integer,
    count(*) filter (where r.estado in ('aceptada', 'en_curso') and r.fin >= now())::integer,
    coalesce((select c.calificacion from public.cuidadores c where c.id = (select auth.uid())), 0),
    coalesce((select c.total_resenas from public.cuidadores c where c.id = (select auth.uid())), 0)
  from public.reservas r
  where r.cuidador_id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.mascotas enable row level security;
alter table public.recordatorios_salud enable row level security;
alter table public.cuidadores enable row level security;
alter table public.reservas enable row level security;
alter table public.seguimiento_puntos enable row level security;
alter table public.actualizaciones_servicio enable row level security;
alter table public.conversaciones enable row level security;
alter table public.mensajes enable row level security;
alter table public.ajustes_conversacion enable row level security;
alter table public.bloqueos enable row level security;
alter table public.reportes enable row level security;
alter table public.resenas enable row level security;

-- Mascotas: el dueño gestiona; el cuidador con reserva puede ver la ficha.
drop policy if exists "Mascotas: ver propias o a cargo" on public.mascotas;
create policy "Mascotas: ver propias o a cargo" on public.mascotas
  for select to authenticated
  using (dueno_id = (select auth.uid()) or public.cuida_mascota(id));

drop policy if exists "Mascotas: crear propias" on public.mascotas;
create policy "Mascotas: crear propias" on public.mascotas
  for insert to authenticated
  with check (dueno_id = (select auth.uid()));

drop policy if exists "Mascotas: editar propias" on public.mascotas;
create policy "Mascotas: editar propias" on public.mascotas
  for update to authenticated
  using (dueno_id = (select auth.uid()))
  with check (dueno_id = (select auth.uid()));

drop policy if exists "Mascotas: borrar propias" on public.mascotas;
create policy "Mascotas: borrar propias" on public.mascotas
  for delete to authenticated
  using (dueno_id = (select auth.uid()));

-- Recordatorios de salud: solo el dueño de la mascota.
drop policy if exists "Recordatorios: dueño de la mascota" on public.recordatorios_salud;
create policy "Recordatorios: dueño de la mascota" on public.recordatorios_salud
  for all to authenticated
  using (public.es_dueno_mascota(mascota_id))
  with check (public.es_dueno_mascota(mascota_id));

-- Cuidadores: la tabla (con ubicación exacta) solo la lee su dueño.
-- El listado público va por listar_cuidadores(), con ubicación aproximada.
drop policy if exists "Cuidadores: lectura pública" on public.cuidadores;
drop policy if exists "Cuidadores: leer el propio" on public.cuidadores;
create policy "Cuidadores: leer el propio" on public.cuidadores
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Cuidadores: crear el propio" on public.cuidadores;
create policy "Cuidadores: crear el propio" on public.cuidadores
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "Cuidadores: editar el propio" on public.cuidadores;
create policy "Cuidadores: editar el propio" on public.cuidadores
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Reservas: las ven ambas partes; las crea el dueño; los estados van por RPC.
drop policy if exists "Reservas: ver como participante" on public.reservas;
create policy "Reservas: ver como participante" on public.reservas
  for select to authenticated
  using ((select auth.uid()) in (dueno_id, cuidador_id));

drop policy if exists "Reservas: crear como dueño" on public.reservas;
create policy "Reservas: crear como dueño" on public.reservas
  for insert to authenticated
  with check (dueno_id = (select auth.uid()));

-- Seguimiento: lo ven ambas partes; solo el cuidador registra durante el servicio.
drop policy if exists "Seguimiento: ver como participante" on public.seguimiento_puntos;
create policy "Seguimiento: ver como participante" on public.seguimiento_puntos
  for select to authenticated
  using (public.es_participante_reserva(reserva_id));

drop policy if exists "Seguimiento: registrar como cuidador" on public.seguimiento_puntos;
create policy "Seguimiento: registrar como cuidador" on public.seguimiento_puntos
  for insert to authenticated
  with check (
    exists (
      select 1 from public.reservas r
      where r.id = reserva_id and r.cuidador_id = (select auth.uid()) and r.estado = 'en_curso'
    )
  );

-- Actualizaciones (fotos, notas, emergencia): ambas partes.
drop policy if exists "Actualizaciones: ver como participante" on public.actualizaciones_servicio;
create policy "Actualizaciones: ver como participante" on public.actualizaciones_servicio
  for select to authenticated
  using (public.es_participante_reserva(reserva_id));

drop policy if exists "Actualizaciones: publicar como participante" on public.actualizaciones_servicio;
create policy "Actualizaciones: publicar como participante" on public.actualizaciones_servicio
  for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and exists (
      select 1 from public.reservas r
      where r.id = reserva_id
        and (select auth.uid()) in (r.dueno_id, r.cuidador_id)
        and r.estado in ('aceptada', 'en_curso')
        and not coalesce(public.hay_bloqueo(r.dueno_id, r.cuidador_id), false)
    )
  );

-- Conversaciones: solo participantes (se crean con abrir_conversacion).
drop policy if exists "Conversaciones: ver como participante" on public.conversaciones;
create policy "Conversaciones: ver como participante" on public.conversaciones
  for select to authenticated
  using ((select auth.uid()) in (participante_a, participante_b));

-- Mensajes: participantes; no se puede escribir si hay bloqueo en cualquier sentido.
drop policy if exists "Mensajes: ver como participante" on public.mensajes;
create policy "Mensajes: ver como participante" on public.mensajes
  for select to authenticated
  using (public.es_participante_conversacion(conversacion_id));

drop policy if exists "Mensajes: enviar sin bloqueo" on public.mensajes;
create policy "Mensajes: enviar sin bloqueo" on public.mensajes
  for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and public.es_participante_conversacion(conversacion_id)
    and not exists (
      select 1
      from public.conversaciones c
      join public.bloqueos b
        on (b.bloqueador_id = c.participante_a and b.bloqueado_id = c.participante_b)
        or (b.bloqueador_id = c.participante_b and b.bloqueado_id = c.participante_a)
      where c.id = conversacion_id
    )
  );

drop policy if exists "Ajustes: los propios" on public.ajustes_conversacion;
create policy "Ajustes: los propios" on public.ajustes_conversacion
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()) and public.es_participante_conversacion(conversacion_id));

-- Bloqueos: cada uno ve y gestiona los suyos; el bloqueado sabe que lo bloquearon
-- (necesario para ocultar el campo de envío).
drop policy if exists "Bloqueos: ver los que me involucran" on public.bloqueos;
create policy "Bloqueos: ver los que me involucran" on public.bloqueos
  for select to authenticated
  using ((select auth.uid()) in (bloqueador_id, bloqueado_id));

drop policy if exists "Bloqueos: crear los propios" on public.bloqueos;
create policy "Bloqueos: crear los propios" on public.bloqueos
  for insert to authenticated
  with check (bloqueador_id = (select auth.uid()));

drop policy if exists "Bloqueos: quitar los propios" on public.bloqueos;
create policy "Bloqueos: quitar los propios" on public.bloqueos
  for delete to authenticated
  using (bloqueador_id = (select auth.uid()));

-- Reportes: se crean y se ven los propios (moderación con service_role).
drop policy if exists "Reportes: crear los propios" on public.reportes;
create policy "Reportes: crear los propios" on public.reportes
  for insert to authenticated
  with check (reportante_id = (select auth.uid()));

drop policy if exists "Reportes: ver los propios" on public.reportes;
create policy "Reportes: ver los propios" on public.reportes
  for select to authenticated
  using (reportante_id = (select auth.uid()));

-- Reseñas: públicas; las escribe el dueño (validación en trigger).
drop policy if exists "Reseñas: lectura pública" on public.resenas;
create policy "Reseñas: lectura pública" on public.resenas
  for select to anon, authenticated
  using (true);

drop policy if exists "Reseñas: crear como dueño" on public.resenas;
create policy "Reseñas: crear como dueño" on public.resenas
  for insert to authenticated
  with check (autor_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Permisos de ejecución de funciones
-- ---------------------------------------------------------------------------

revoke execute on function public.hay_bloqueo(uuid, uuid) from public, anon;
revoke execute on function public.telefono_contraparte(uuid) from public, anon;
grant execute on function public.telefono_contraparte(uuid) to authenticated;
revoke execute on function public.cambiar_estado_reserva(uuid, text) from public, anon;
revoke execute on function public.abrir_conversacion(uuid) from public, anon;
revoke execute on function public.marcar_mensajes_leidos(uuid) from public, anon;
revoke execute on function public.perfiles_publicos(uuid[]) from public, anon;
revoke execute on function public.resumen_cuidador() from public, anon;
grant execute on function public.cambiar_estado_reserva(uuid, text) to authenticated;
grant execute on function public.abrir_conversacion(uuid) to authenticated;
grant execute on function public.marcar_mensajes_leidos(uuid) to authenticated;
grant execute on function public.perfiles_publicos(uuid[]) to authenticated;
grant execute on function public.resumen_cuidador() to authenticated;
grant execute on function public.listar_cuidadores(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Datos existentes: mover mascotas y datos de cuidador desde el JSON del perfil
-- ---------------------------------------------------------------------------

insert into public.mascotas (dueno_id, nombre, tipo, raza, edad_anos, peso_kg, es_grupo, cantidad)
select
  p.id,
  trim(m ->> 'nombre'),
  m ->> 'tipo',
  coalesce(m ->> 'raza', ''),
  case when (m ->> 'edadAnos') ~ '^[0-9]+([.,][0-9]+)?$' then replace(m ->> 'edadAnos', ',', '.')::numeric end,
  case when (m ->> 'pesoKg') ~ '^[0-9]+([.,][0-9]+)?$' then replace(m ->> 'pesoKg', ',', '.')::numeric end,
  coalesce(m ->> 'modo', '') = 'grupo',
  case when (m ->> 'cantidad') ~ '^[1-9][0-9]*$' then (m ->> 'cantidad')::integer else 1 end
from public.perfiles p
cross join lateral jsonb_array_elements(case when jsonb_typeof(p.mascotas) = 'array' then p.mascotas else '[]'::jsonb end) as m
where length(trim(coalesce(m ->> 'nombre', ''))) > 0
  and (m ->> 'tipo') in ('Perro', 'Gato', 'Ave', 'Reptil', 'Acuáticos', 'Ganadería')
  and not exists (select 1 from public.mascotas x where x.dueno_id = p.id);

insert into public.cuidadores (id, servicios, precio_paseo, precio_hospedaje, comuna, latitud, longitud, radio_km)
select
  p.id,
  array(
    select distinct case s
      when 'Paseo' then 'paseo'
      when 'Hospedaje' then 'hospedaje'
      when 'Guardería' then 'guarderia'
      when 'Visita a domicilio' then 'visita'
    end
    from jsonb_array_elements_text(coalesce(p.datos_cuidador -> 'servicios', '[]'::jsonb)) as s
    where s in ('Paseo', 'Hospedaje', 'Guardería', 'Visita a domicilio')
  ),
  case when (p.datos_cuidador ->> 'precioPaseo') ~ '^[0-9]+$' then (p.datos_cuidador ->> 'precioPaseo')::integer end,
  case when (p.datos_cuidador ->> 'precioNoche') ~ '^[0-9]+$' then (p.datos_cuidador ->> 'precioNoche')::integer end,
  coalesce(p.datos_cuidador ->> 'zona', ''),
  case when jsonb_typeof(p.datos_cuidador -> 'latitud') = 'number' then (p.datos_cuidador ->> 'latitud')::double precision end,
  case when jsonb_typeof(p.datos_cuidador -> 'longitud') = 'number' then (p.datos_cuidador ->> 'longitud')::double precision end,
  case when jsonb_typeof(p.datos_cuidador -> 'radioKm') = 'number'
    then least(100, greatest(1, (p.datos_cuidador ->> 'radioKm')::integer)) else 5 end
from public.perfiles p
where p.rol in ('cuidador', 'ambos')
  and p.datos_cuidador is not null
on conflict (id) do nothing;

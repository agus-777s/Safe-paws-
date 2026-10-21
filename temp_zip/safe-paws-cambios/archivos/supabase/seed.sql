-- Semilla: 20 cuidadores verificados en Santiago (PRD Stitch: "base de 20 cuidadores verificados").
-- Cuentas de demostración sin contraseña utilizable (no se puede iniciar sesión con ellas).
-- Idempotente: se puede ejecutar varias veces. Úsala solo en desarrollo / demo.

with datos (n, nombre, apellido, comuna, lat, lng, servicios, paseo, hospedaje, guarderia, visita, bio, calificacion, resenas) as (
  values
    (1,  'Camila',    'Rojas',     'Providencia',     -33.4263, -70.6110, array['paseo','visita'],                       8000,  null,  null,  9000,  'Paseadora con 5 años de experiencia. Perros grandes y reactivos.', 4.9, 87),
    (2,  'Matías',    'González',  'Ñuñoa',           -33.4569, -70.5978, array['paseo','hospedaje','guarderia'],        7000,  22000, 15000, null,  'Casa con patio cerrado, trabajo desde casa.', 4.8, 64),
    (3,  'Valentina', 'Muñoz',     'Las Condes',      -33.4110, -70.5670, array['hospedaje','guarderia'],                null,  28000, 18000, null,  'Veterinaria en formación. Cuido gatos y perros senior.', 5.0, 41),
    (4,  'Benjamín',  'Soto',      'Santiago Centro', -33.4489, -70.6693, array['paseo'],                                6000,  null,  null,  null,  'Paseos grupales en Parque Forestal, máximo 3 perros.', 4.6, 112),
    (5,  'Fernanda',  'Díaz',      'Vitacura',        -33.3900, -70.5760, array['hospedaje','visita'],                   null,  35000, null,  12000, 'Departamento amplio, sin otras mascotas. Solo una a la vez.', 4.9, 23),
    (6,  'Sebastián', 'Pérez',     'La Reina',        -33.4450, -70.5390, array['paseo','hospedaje','guarderia','visita'], 7500, 24000, 16000, 10000, 'Cuidador full time, casa con jardín cerca del Parque Mahuida.', 4.7, 58),
    (7,  'Antonia',   'Silva',     'Macul',           -33.4870, -70.5990, array['guarderia','visita'],                   null,  null,  14000, 8500,  'Educadora canina, refuerzo positivo.', 4.8, 36),
    (8,  'Joaquín',   'Morales',   'Peñalolén',       -33.4860, -70.5330, array['paseo','hospedaje'],                    6500,  20000, null,  null,  'Paseos de cerro para perros activos.', 4.5, 19),
    (9,  'Isidora',   'Fuentes',   'San Miguel',      -33.4970, -70.6510, array['paseo','visita'],                       5500,  null,  null,  8000,  'Visitas para gatos: alimentación, arenero y mimos.', 4.9, 75),
    (10, 'Tomás',     'Castillo',  'Providencia',     -33.4330, -70.6200, array['hospedaje','guarderia'],                null,  26000, 17000, null,  'Casa pet friendly, cámaras para que veas a tu mascota.', 4.7, 47),
    (11, 'Javiera',   'Reyes',     'Ñuñoa',           -33.4510, -70.6070, array['paseo','guarderia'],                    7000,  null,  15000, null,  'Amo a los perros pequeños y cachorros.', 4.8, 52),
    (12, 'Diego',     'Herrera',   'Las Condes',      -33.4180, -70.5860, array['paseo','hospedaje','visita'],           9000,  30000, null,  11000, 'Primeros auxilios caninos certificados.', 4.9, 66),
    (13, 'Catalina',  'Vargas',    'Santiago Centro', -33.4400, -70.6500, array['visita'],                               null,  null,  null,  7500,  'Visitas a domicilio para gatos y aves.', 4.6, 28),
    (14, 'Nicolás',   'Torres',    'La Florida',      -33.5220, -70.5980, array['paseo','hospedaje','guarderia'],        6000,  21000, 14000, null,  'Casa con patio grande, ideal para perros grandes.', 4.7, 33),
    (15, 'Martina',   'Espinoza',  'Maipú',           -33.5110, -70.7580, array['paseo','visita'],                       5500,  null,  null,  7000,  'Estudiante de medicina veterinaria.', 4.5, 14),
    (16, 'Agustín',   'Contreras', 'Vitacura',        -33.3980, -70.5960, array['hospedaje','guarderia','visita'],       null,  38000, 20000, 13000, 'Atención premium, reportes con fotos cada día.', 5.0, 29),
    (17, 'Florencia', 'Sepúlveda', 'Providencia',     -33.4220, -70.6040, array['paseo'],                                7500,  null,  null,  null,  'Paseos individuales de 45 o 60 minutos.', 4.8, 91),
    (18, 'Vicente',   'Araya',     'Ñuñoa',           -33.4640, -70.5900, array['guarderia','hospedaje'],                null,  23000, 15000, null,  'Experiencia con perros con ansiedad por separación.', 4.6, 22),
    (19, 'Emilia',    'Navarro',   'Las Condes',      -33.4060, -70.5500, array['paseo','hospedaje','guarderia','visita'], 8500, 32000, 19000, 12000, 'Cuido a tu mascota como si fuera mía. Exóticos bienvenidos.', 4.9, 58),
    (20, 'Lucas',     'Paredes',   'La Reina',        -33.4380, -70.5480, array['paseo','visita'],                       6500,  null,  null,  9000,  'Runner: paseos con trote para perros enérgicos.', 4.7, 40)
),
ids as (
  select d.*, ('00000000-0000-4000-8000-' || lpad(d.n::text, 12, '0'))::uuid as id
  from datos d
),
usuarios as (
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  select
    id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'cuidador' || n || '@demo.safepaws.cl', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre', nombre || ' ' || apellido, 'demo', true),
    now(), now()
  from ids
  on conflict (id) do nothing
  returning id
),
perfiles as (
  insert into public.perfiles (id, nombre, apellido, descripcion, rol, comuna, onboarding_completo)
  select id, nombre, apellido, bio, 'cuidador', comuna, true from ids
  on conflict (id) do update
    set nombre = excluded.nombre, apellido = excluded.apellido, comuna = excluded.comuna
  returning id
)
insert into public.cuidadores (
  id, bio, servicios, precio_paseo, precio_hospedaje, precio_guarderia, precio_visita,
  comuna, latitud, longitud, radio_km, dias, hora_inicio, hora_fin,
  verificado, calificacion, total_resenas
)
select
  id, bio, servicios, paseo, hospedaje, guarderia, visita,
  comuna, lat, lng, 10, array[1, 2, 3, 4, 5, 6]::smallint[], '08:00', '20:00',
  true, calificacion, resenas
from ids
where id in (select id from perfiles)
on conflict (id) do update
  set servicios = excluded.servicios,
      precio_paseo = excluded.precio_paseo,
      precio_hospedaje = excluded.precio_hospedaje,
      precio_guarderia = excluded.precio_guarderia,
      precio_visita = excluded.precio_visita,
      verificado = excluded.verificado,
      calificacion = excluded.calificacion,
      total_resenas = excluded.total_resenas;

# Safe Paws

Plataforma de cuidado de mascotas para Santiago de Chile: dueños encuentran cuidadores verificados,
reservan paseos, hospedaje, guardería o visitas a domicilio, siguen el servicio en vivo y chatean.
Diseño base en Stitch ("Safe Paws Care App"); backend 100 % Supabase.

## Stack

- Vite + React 19 + TypeScript estricto + React Router 7 (PWA con `vite-plugin-pwa`)
- Supabase: Auth, Postgres con RLS, Storage (bucket `fotos`) y Realtime
- Leaflet + OpenStreetMap / Nominatim para mapas y geocodificación
- Vitest + PGlite (Postgres en memoria) para probar migraciones y RLS sin Docker

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Sin variables de Supabase la app igual renderiza (muestra el estado "no configurado").

## Base de datos (Supabase)

Migraciones en `supabase/migrations/` (aplicar en orden):

| Archivo | Contenido |
| --- | --- |
| `20260910_crear_perfiles.sql` | Tabla `perfiles` + RLS + trigger `actualizado_en` |
| `20261020120000_plataforma_safe_paws.sql` | Mascotas, recordatorios de salud, cuidadores, reservas, seguimiento, chat, bloqueos, reportes, reseñas, RPC y RLS |
| `20261020120100_storage_y_realtime.sql` | Bucket `fotos` con políticas por carpeta y publicación Realtime |

`supabase/seed.sql`: 20 cuidadores verificados de demostración (sin contraseña utilizable). Solo desarrollo/demo.

Aplicar:

- **SQL Editor** del panel: pegar cada migración en orden y luego (opcional) `seed.sql`.
- **CLI**: `supabase link --project-ref jsdshocubybsbwzvczjh` y `supabase db push` (y `psql ... -f supabase/seed.sql` para la demo).

Reglas clave (todas cubiertas por pruebas en `tests/db/`):

- Cada tabla tiene RLS. El precio de una reserva lo calcula el servidor (`calcular_precio_reserva`).
- Los estados de reserva solo cambian con `cambiar_estado_reserva(id, estado)`:
  `pendiente → aceptada/rechazada` (cuidador), `pendiente → cancelada` (dueño),
  `aceptada → en_curso` (cuidador), `aceptada → cancelada` (ambos), `en_curso → completada` (cuidador).
- Un cuidador no puede autoverificarse ni tocar su calificación (se recalcula con las reseñas).
- El listado público (`listar_cuidadores`) entrega ubicación aproximada (~1 km); la exacta solo la ve el cuidador.
- Chat solo con cuidadores activos o contraparte de una reserva; el bloqueo impide escribir, reservar y publicar.
- Storage: cada usuario escribe solo en `fotos/<su-id>/...`.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas (migraciones + RLS con PGlite, utilidades y lógica de vistas) |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint |
| `npm run build` | Typecheck + build de producción |

## Rutas

| Ruta | Vista | Acceso |
| --- | --- | --- |
| `/` | Landing | Público |
| `/bienvenida` | Carrusel de onboarding (3 diapositivas) | Público |
| `/iniciar-sesion`, `/registro` | Login y wizard de registro (4 pasos; 5 con perfil dual) | Público |
| `/explorar` | Mapa + buscador de cuidadores | Público |
| `/cuidadores/:id` | Perfil público del cuidador | Público |
| `/reservar/:cuidadorId` | Calendario, mascota y precio en CLP | Sesión |
| `/reservas` | Mis reservas (como dueño y como cuidador) | Sesión |
| `/reservas/:id` | Seguimiento en vivo, fotos, emergencia, reseña | Sesión |
| `/mensajes`, `/mensajes/:id` | Chat en tiempo real (silenciar, bloquear, reportar) | Sesión |
| `/mascotas`, `/mascotas/nueva`, `/mascotas/:id`, `/mascotas/:id/editar` | Ficha técnica y recordatorios de salud | Sesión |
| `/panel`, `/panel/perfil` | Panel del cuidador (tareas y ganancias) y edición de su perfil | Sesión |
| `/mi-cuenta` | Datos personales, foto, activar perfil dual | Sesión |

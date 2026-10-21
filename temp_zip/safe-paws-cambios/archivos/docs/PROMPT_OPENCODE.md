# Prompt para OpenCode — terminar Safe Paws

Copia todo lo que está bajo la línea y pégalo en OpenCode, abierto en la raíz del repo
(`opencode.json` ya conecta los MCP de **Supabase** y **Stitch**; Stitch necesita `GOOGLE_API_KEY`).

---

Eres el desarrollador que termina **Safe Paws**, una app de cuidado de mascotas para Santiago de Chile
(Vite + React 19 + TypeScript estricto + React Router 7 + Supabase + Leaflet). Trabaja en la rama
`ramon/flujo-completo`. Lee primero `README.md` (rutas, esquema, reglas de negocio) y respeta las
convenciones del código: identificadores y textos en español (es-CL), CSS Modules con los tokens de
`src/styles/tokens.css`, componentes de `src/components/ui/`, `useCarga` + `EstadoVista` para los estados de
carga/error/vacío, servicios en `src/services/supabase/*`, sin `any` ni `@ts-ignore`, sin dependencias nuevas
sin justificarlo. Commits pequeños y convencionales (feat/fix/test/chore).

## Estado actual (ya hecho y probado)

- **Base de datos** en `supabase/migrations/` (3 migraciones) + `supabase/seed.sql` (20 cuidadores verificados de demo):
  perfiles (rol `dueno | cuidador | ambos`), mascotas, recordatorios_salud, cuidadores, reservas,
  seguimiento_puntos, actualizaciones_servicio, conversaciones, mensajes, ajustes_conversacion, bloqueos,
  reportes, resenas, bucket `fotos` y publicación Realtime. RLS en todo. RPC: `listar_cuidadores`,
  `cambiar_estado_reserva`, `abrir_conversacion`, `marcar_mensajes_leidos`, `perfiles_publicos`,
  `resumen_cuidador`, `telefono_contraparte`, `calcular_precio_reserva`.
- **Pruebas**: `npm test` (Vitest). `tests/db/migraciones.test.ts` levanta Postgres en memoria con PGlite,
  aplica las migraciones y prueba RLS y el ciclo de reservas, chat, bloqueos, reseñas y storage.
  Además hay pruebas unitarias de la lógica de cada vista. Hoy: 82 pruebas en verde, más `tsc -b`, `lint` y `build`.
- **Vistas** conectadas en `src/App.tsx`: landing, onboarding, login, registro (4 pasos, 5 con perfil dual),
  explorar (mapa + buscador), perfil del cuidador, reservar (calendario y precio en CLP), mis reservas,
  seguimiento en vivo (ruta, fotos, notas, emergencia, reseña), mensajes y conversación (Realtime, fotos,
  silenciar, bloquear, reportar), mascotas (ficha, dieta, recordatorios), panel del cuidador (tareas,
  ganancias), editar perfil de cuidador y mi cuenta.
- **No probado contra un Supabase real**: no había clave ni Docker. Las vistas solo se probaron sin backend
  (estados de error y vacío) y con el flujo de registro hasta el último paso.

## Tareas, en este orden

1. **Conectar Supabase** (proyecto `jsdshocubybsbwzvczjh`):
   - Pide al usuario `VITE_SUPABASE_PUBLISHABLE_KEY` y crea `.env.local` desde `.env.example`.
     Nunca la commitees ni inventes valores.
   - Con el MCP de Supabase, revisa qué migraciones ya están aplicadas (`list_migrations`) y aplica las
     pendientes en orden (`apply_migration`). La primera (`20260910_crear_perfiles.sql`) podría ya existir.
   - Aplica `supabase/seed.sql` solo si el usuario confirma que es un entorno de demo.
   - Corre `get_advisors` (security y performance) y corrige lo que reporte con una **migración nueva**.
     No edites migraciones ya aplicadas en remoto. Agrega su prueba en `tests/db/`.
   - En Auth → URL Configuration, agrega la URL local y la de Vercel como redirect.
2. **Prueba end-to-end real** en el navegador con dos cuentas de prueba (dueño y cuidador):
   1. Registro de cada uno (también el perfil dual) y confirmación de correo.
   2. El dueño crea una mascota y reserva un paseo y un hospedaje.
   3. El cuidador acepta, inicia y comparte ubicación (usa la geolocalización simulada de DevTools).
   4. El dueño ve la ruta en vivo, prueba el botón de emergencia y abre el chat.
   5. Prueban el chat con fotos, leído, silenciar, bloquear y reportar.
   6. El cuidador finaliza y el dueño deja la reseña.
   7. Revisa el panel del cuidador.

   Corrige cada bug encontrado con su prueba. Verifica también:
   - que Realtime llegue (la tabla debe estar en la publicación `supabase_realtime`);
   - que las fotos suban al bucket `fotos`.
3. **Fidelidad con Stitch**: usa el MCP de Stitch con el proyecto `3685732843499391351` ("Safe Paws Care App")
   para listar todas las pantallas. Compáralas con las vistas implementadas y ajusta el diseño (colores, tipografía
   Montserrat/Manrope del PRD, espaciados, modo oscuro si el diseño lo define). Mantén la lógica intacta. En el
   repo solo están exportadas las pantallas de onboarding y registro (`public/stitch/`).
   Falta implementar el **splash con caminata de huellas variadas (perro, gato, ave)** que pide el PRD,
   antes del carrusel de bienvenida.
4. **Pendientes de producto** (confírmalos con el usuario antes de implementar los que tengan costo o
   impliquen terceros):
   - Verificación de cuidadores: subir el documento a un bucket **privado** y armar un flujo de
     aprobación con `service_role` (Edge Function o panel admin). Hoy `verificado` solo cambia desde SQL.
   - Moderación de `reportes`: vista o Edge Function para el equipo.
   - Notificaciones: Web Push o correo para mensajes nuevos, solicitudes y emergencias, respetando `ajustes_conversacion.silenciada`.
   - Pagos: no existen. No prometas "pagos protegidos" en la UI hasta implementarlos.
   - El seguimiento de ubicación solo funciona con la pestaña abierta. Documéntalo en la UI o evalúa una app nativa o PWA con background sync.
5. **Limpieza**:
   - Archivos `public/stitch/registro/*.jpg`: en realidad son HTML (descargas fallidas). Reemplázalos por
     imágenes reales de Stitch o bórralos.
   - La landing (`src/pages/inicio/InicioPage.tsx`) muestra cifras de ejemplo ("+500 cuidadores", "4.9★",
     "+12 mil paseos"). Reemplázalas por datos reales (por ejemplo, el conteo de `listar_cuidadores`) o pide los textos al usuario.
   - Opcional: generar tipos con `supabase gen types typescript` y reemplazar las interfaces `Fila*` manuales de los servicios.
6. **Cierre**: `npm test`, `npm run typecheck`, `npm run lint` y `npm run build` en verde. Haz un resumen de
   cambios para el PR y no hagas push a `main`.

Reglas de seguridad que no se negocian:
- RLS en toda tabla nueva, con prueba en `tests/db/`.
- Nada de `service_role` en el frontend.
- La ubicación exacta del cuidador nunca es pública.
- Los estados de reserva solo cambian por RPC.
- Validar en el servidor todo lo que afecte precios o permisos.

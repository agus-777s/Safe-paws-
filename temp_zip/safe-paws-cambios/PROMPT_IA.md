# Prompt para la IA que va a terminar Safe Paws

Copia todo lo que está bajo la línea y pégaselo a la IA (Claude Code u OpenCode), abierta en la raíz del repo
`Safe-paws-`, con este zip descomprimido al lado.

---

Vas a integrar y terminar un trabajo ya hecho sobre **Safe Paws** (app de cuidado de mascotas en Santiago:
Vite + React 19 + TypeScript estricto + React Router 7 + Supabase + Leaflet). Los cambios vienen en la carpeta
`safe-paws-cambios/` (zip). **No toques `main` ni el trabajo existente**: todo va en una rama nueva.

## Skills que debes usar (ya están instaladas, las mismas que se usaron para construir esto)

- `cambio-seguro`: antes de editar código existente (mapa de impacto, línea base verde, diff mínimo, volver a verificar).
- `supabase` y `supabase-postgres-best-practices`: para todo lo de base de datos, migraciones, RLS, Storage y Realtime.
- `test-driven-development`: cada bug o arreglo lleva su prueba primero.
- `systematic-debugging`: si algo falla, diagnostica antes de parchear.
- `verification-before-completion`: nunca digas "listo" sin correr y mostrar tests, typecheck, lint y build.
- `claude-in-chrome` o `webapp-testing`: para probar la app en el navegador.
- `impeccable`, `vercel-react-best-practices`: si ajustas UI.

## 1. Traer los cambios a una rama nueva (sin dañar el proyecto)

```bash
git status                       # debe estar limpio; si no, detente y avisa
git checkout main && git pull
git fetch ../safe-paws-cambios/safe-paws-flujo-completo.bundle ramon/flujo-completo:ramon/flujo-completo
git checkout ramon/flujo-completo
git log --oneline main..HEAD     # deben aparecer 8 commits (feat(db) … docs)
```

Si el bundle falla porque `main` cambió, crea la rama desde el commit `3750959` (base original). Otra opción
es `git checkout -b ramon/flujo-completo` y luego `git am ../safe-paws-cambios/parches/*.patch`. Si hay conflictos,
resuélvelos sin perder lo que haya en `main` y avisa qué archivos chocaron.

Luego:

```bash
npm install
cp .env.example .env.local      # pide al usuario la VITE_SUPABASE_PUBLISHABLE_KEY; nunca la commitees
npm test && npm run typecheck && npm run lint && npm run build   # línea base: todo debe pasar (82 pruebas)
```

## 2. Qué trae el trabajo

- `supabase/migrations/20261020120000_plataforma_safe_paws.sql`: mascotas, recordatorios_salud, cuidadores,
  reservas, seguimiento_puntos, actualizaciones_servicio, conversaciones, mensajes, ajustes_conversacion,
  bloqueos, reportes, resenas. Además: funciones RPC, triggers y RLS en todas las tablas.
- `supabase/migrations/20261020120100_storage_y_realtime.sql`: bucket `fotos` (cada usuario escribe en
  `fotos/<su-id>/...`) y publicación `supabase_realtime`.
- `supabase/seed.sql`: 20 cuidadores verificados de demo (cuentas sin contraseña utilizable).
- `tests/db/migraciones.test.ts`: aplica las migraciones en un Postgres en memoria (PGlite) y prueba RLS,
  el ciclo de reservas, chat, bloqueos, reseñas, storage y la paridad del precio entre SQL y frontend.
- Las vistas y rutas están en `README.md`. El detalle de pendientes está en `docs/PROMPT_OPENCODE.md`.

## 3. Aplicar las migraciones en Supabase (proyecto `jsdshocubybsbwzvczjh`)

1. Lista lo que ya está aplicado (MCP de Supabase `list_migrations`, o `supabase migration list`). La primera
   migración (`20260910_crear_perfiles.sql`) probablemente ya existe. **No la vuelvas a crear a ciegas.**
2. **Si hay un branch o un proyecto de staging de Supabase, aplica ahí primero.** Si solo existe producción,
   pregunta al usuario antes de aplicar.
3. Aplica en orden las dos migraciones nuevas (`apply_migration`, o `supabase db push`). Son idempotentes.
   Si choca con algo que ya existe en remoto, **no edites a mano la base**: diagnostica y crea una migración
   nueva que lo resuelva.
4. El seed va solo con confirmación del usuario de que es un entorno de demo.
5. Corre los advisors de seguridad y rendimiento (`get_advisors`). Cada hallazgo real se arregla con una migración
   nueva y su prueba en `tests/db/`.
6. Verifica en remoto con SQL:
   - que las 12 tablas tengan RLS activado;
   - que existan las funciones (`listar_cuidadores`, `cambiar_estado_reserva`, `abrir_conversacion`,
     `marcar_mensajes_leidos`, `perfiles_publicos`, `resumen_cuidador`, `telefono_contraparte`,
     `calcular_precio_reserva`, `hay_bloqueo`);
   - que exista el bucket `fotos`;
   - que la publicación `supabase_realtime` incluya `mensajes`, `seguimiento_puntos`,
     `actualizaciones_servicio` y `reservas`.

## 4. Pruebas de que todo funciona

**Automáticas:** `npm test` (debe seguir en 82/82 o más), `npm run typecheck`, `npm run lint` y `npm run build`.

**Contra la base real**, con dos cuentas de prueba creadas para esto (un dueño y un cuidador; usa correos de
prueba y anota las credenciales en un archivo local ignorado por git, no en el chat):
1. Registro de ambos (prueba también el perfil dual, 5 pasos). Confirma que se crean filas en `perfiles`,
   `mascotas` y `cuidadores`, y que las fotos quedan en el bucket.
2. El dueño reserva un paseo y un hospedaje. El precio debe coincidir con la tarifa.
3. El cuidador acepta e inicia el servicio, y comparte ubicación (geolocalización simulada en DevTools).
4. El dueño ve la ruta en vivo, sube y ve fotos y activa la emergencia.
5. Chat en tiempo real: mensajes, fotos, leído, silenciar, bloquear (debe impedir escribir y reservar) y reportar.
6. El cuidador finaliza y el dueño deja la reseña. Verifica que la calificación del cuidador se recalculó.
7. Revisa el panel del cuidador (ganancias, pendientes).
8. Pruebas negativas con la clave publicable (no con service_role): otro usuario no ve mascotas, reservas ni
   mensajes ajenos; un cuidador no puede marcarse `verificado`; la tabla `cuidadores` no expone la ubicación exacta.

Cada fallo: `systematic-debugging`, luego una prueba que lo reproduzca, después el arreglo y por último volver a verificar.

## 5. Subir

- Commits pequeños y convencionales (feat/fix/test/chore), con un mensaje que explique el porqué.
- `git push -u origin ramon/flujo-completo`. **Nunca** push a `main`, nunca `--force` y nunca `reset --hard` sin
  preguntar. Si no hay permiso de escritura en el repo, avisa al usuario: puede abrir un fork o pedir acceso al dueño.
- Si el usuario lo pide, abre un PR hacia `main` con el resumen de cambios, el resultado de las pruebas y los
  pendientes.

## Reglas que no se negocian

- RLS en toda tabla nueva, con su prueba en `tests/db/`.
- Nada de `service_role` ni secretos en el frontend o en git; `.env*` está ignorado.
- La ubicación exacta del cuidador nunca es pública.
- Los estados de reserva solo cambian con `cambiar_estado_reserva`.
- Todo lo que afecte precio o permisos se valida en el servidor.
- Nada de "listo" sin mostrar la salida de tests, typecheck, lint y build.

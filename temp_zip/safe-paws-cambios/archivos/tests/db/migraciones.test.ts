import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { ESQUELETO_SUPABASE, archivosMigracion, comoUsuario, crearBaseDeDatos, crearUsuario } from './entorno.ts'

const DUENO = '11111111-1111-4111-8111-111111111111'
const CUIDADOR = '22222222-2222-4222-8222-222222222222'
const EXTRANO = '33333333-3333-4333-8333-333333333333'
const CUIDADOR_SEMILLA = '00000000-0000-4000-8000-000000000001'

interface Fila {
  [columna: string]: unknown
}

async function filas<T = Fila>(
  tx: Pick<PGlite, 'query'>,
  sql: string,
  parametros: unknown[] = [],
): Promise<T[]> {
  const resultado = await tx.query<T>(sql, parametros)
  return resultado.rows
}

describe('migraciones', () => {
  it('se aplican desde cero junto con la semilla', async () => {
    const db = await crearBaseDeDatos({ conSemilla: true })
    const [{ total }] = await filas<{ total: number }>(
      db,
      'select count(*)::int as total from public.cuidadores where verificado',
    )
    expect(total).toBe(20)
  })

  it('son idempotentes (se pueden volver a aplicar)', async () => {
    const db = await crearBaseDeDatos({ conSemilla: true })
    for (const archivo of archivosMigracion()) {
      await db.exec(readFileSync(archivo, 'utf8'))
    }
    await db.exec(readFileSync(new URL('../../supabase/seed.sql', import.meta.url), 'utf8'))
    const [{ total }] = await filas<{ total: number }>(db, 'select count(*)::int as total from public.cuidadores')
    expect(total).toBe(20)
  })

  it('mueven mascotas y datos de cuidador desde el JSON del perfil', async () => {
    const db = new PGlite()
    const [primera, ...resto] = archivosMigracion()
    // Esqueleto + solo la primera migración: así quedaban las bases existentes.
    await db.exec(ESQUELETO_SUPABASE)
    await db.exec(readFileSync(primera, 'utf8'))
    await db.query('insert into auth.users (id) values ($1), ($2)', [DUENO, CUIDADOR])
    await db.query(
      `insert into public.perfiles (id, rol, mascotas) values ($1, 'dueno', $2::jsonb)`,
      [
        DUENO,
        JSON.stringify([
          { nombre: 'Luna', tipo: 'Perro', raza: 'Mestizo', edadAnos: '3', pesoKg: '12,5', modo: 'individual' },
          { nombre: '', tipo: 'Gato' },
        ]),
      ],
    )
    await db.query(
      `insert into public.perfiles (id, rol, datos_cuidador) values ($1, 'cuidador', $2::jsonb)`,
      [
        CUIDADOR,
        JSON.stringify({
          servicios: ['Paseo', 'Hospedaje', 'Otros'],
          precioPaseo: '7000',
          precioNoche: '25000',
          zona: 'Ñuñoa, Santiago',
          latitud: -33.45,
          longitud: -70.6,
          radioKm: 10,
        }),
      ],
    )
    for (const archivo of resto) {
      await db.exec(readFileSync(archivo, 'utf8'))
    }

    const mascotas = await filas<{ nombre: string; peso_kg: string }>(
      db,
      'select nombre, peso_kg::text from public.mascotas',
    )
    expect(mascotas).toEqual([{ nombre: 'Luna', peso_kg: '12.50' }])

    const [cuidador] = await filas<{ servicios: string[]; precio_hospedaje: number; radio_km: number }>(
      db,
      'select servicios, precio_hospedaje, radio_km from public.cuidadores where id = $1',
      [CUIDADOR],
    )
    expect(cuidador.servicios.sort()).toEqual(['hospedaje', 'paseo'])
    expect(cuidador.precio_hospedaje).toBe(25000)
    expect(cuidador.radio_km).toBe(10)
  })
})

describe('reglas de acceso y flujo de negocio', () => {
  let db: PGlite
  let mascotaId: string

  beforeAll(async () => {
    db = await crearBaseDeDatos({ conSemilla: true })
    await crearUsuario(db, DUENO, { nombre: 'Daniela', rol: 'dueno' })
    await crearUsuario(db, CUIDADOR, { nombre: 'Carlos', rol: 'cuidador' })
    await crearUsuario(db, EXTRANO, { nombre: 'Ext', rol: 'dueno' })

    await comoUsuario(db, CUIDADOR, (tx) =>
      tx.query(
        `insert into public.cuidadores (id, servicios, precio_paseo, precio_hospedaje, verificado, calificacion)
         values ($1, '{paseo,hospedaje}', 7000, 25000, true, 5)`,
        [CUIDADOR],
      ),
    )
    const [mascota] = await comoUsuario(db, DUENO, (tx) =>
      filas<{ id: string }>(
        tx,
        `insert into public.mascotas (dueno_id, nombre, tipo) values ($1, 'Luna', 'Perro') returning id`,
        [DUENO],
      ),
    )
    mascotaId = mascota.id
  })

  // Las fechas de las pruebas se escriben en noviembre de 2026 y se desplazan en días
  // enteros para que siempre queden en el futuro (el servidor rechaza fechas pasadas).
  const DIAS_DESPLAZAMIENTO = Math.max(
    0,
    Math.ceil((Date.now() + 30 * 86_400_000 - Date.parse('2026-11-01T00:00:00Z')) / 86_400_000),
  )
  const aFuturo = (iso: string) => new Date(Date.parse(iso) + DIAS_DESPLAZAMIENTO * 86_400_000).toISOString()

  async function crearReserva(servicio = 'hospedaje', inicioBase = '2026-11-01T15:00:00Z', finBase = '2026-11-03T15:00:00Z') {
    const inicio = aFuturo(inicioBase)
    const fin = aFuturo(finBase)
    const [reserva] = await comoUsuario(db, DUENO, (tx) =>
      filas<{ id: string; precio_total: number; estado: string }>(
        tx,
        `insert into public.reservas (dueno_id, cuidador_id, mascota_id, servicio, inicio, fin, precio_total, estado)
         values ($1, $2, $3, $4, $5, $6, 1, 'completada') returning id, precio_total, estado`,
        [DUENO, CUIDADOR, mascotaId, servicio, inicio, fin],
      ),
    )
    return reserva
  }

  const cambiarEstado = (usuario: string, reserva: string, estado: string) =>
    comoUsuario(db, usuario, (tx) => tx.query('select public.cambiar_estado_reserva($1, $2)', [reserva, estado]))

  it('perfiles: cada uno ve solo el suyo', async () => {
    const visibles = await comoUsuario(db, DUENO, (tx) => filas(tx, 'select id from public.perfiles'))
    expect(visibles).toEqual([{ id: DUENO }])
  })

  it('cuidadores: no se pueden autoverificar ni subir su calificación', async () => {
    const [cuidador] = await filas<{ verificado: boolean; calificacion: string }>(
      db,
      'select verificado, calificacion::text from public.cuidadores where id = $1',
      [CUIDADOR],
    )
    expect(cuidador).toEqual({ verificado: false, calificacion: '0.0' })

    await comoUsuario(db, CUIDADOR, (tx) =>
      tx.query('update public.cuidadores set verificado = true, calificacion = 5, bio = $2 where id = $1', [
        CUIDADOR,
        'Hola',
      ]),
    )
    const [despues] = await filas<{ verificado: boolean; bio: string }>(
      db,
      'select verificado, bio from public.cuidadores where id = $1',
      [CUIDADOR],
    )
    expect(despues).toEqual({ verificado: false, bio: 'Hola' })
  })

  it('cuidadores: el listado público funciona sin sesión', async () => {
    const lista = await comoUsuario(db, null, (tx) =>
      filas<{ id: string; nombre: string }>(tx, `select id, nombre from public.listar_cuidadores('paseo')`),
    )
    // 13 de la semilla ofrecen paseo + el cuidador de la prueba.
    expect(lista).toHaveLength(14)
    expect(lista[0]).toHaveProperty('nombre')
    expect(lista.some((c) => c.id === CUIDADOR)).toBe(true)
  })

  it('mascotas: un extraño no las ve ni las edita', async () => {
    const visibles = await comoUsuario(db, EXTRANO, (tx) => filas(tx, 'select id from public.mascotas'))
    expect(visibles).toEqual([])
    const resultado = await comoUsuario(db, EXTRANO, (tx) =>
      tx.query(`update public.mascotas set nombre = 'Hack' where id = $1`, [mascotaId]),
    )
    expect(resultado.affectedRows).toBe(0)
  })

  it('mascotas: no se puede crear una a nombre de otro', async () => {
    await expect(
      comoUsuario(db, EXTRANO, (tx) =>
        tx.query(`insert into public.mascotas (dueno_id, nombre, tipo) values ($1, 'X', 'Gato')`, [DUENO]),
      ),
    ).rejects.toThrow(/row-level security/)
  })

  it('recordatorios de salud: solo el dueño de la mascota', async () => {
    await comoUsuario(db, DUENO, (tx) =>
      tx.query(
        `insert into public.recordatorios_salud (mascota_id, titulo, tipo, fecha) values ($1, 'Vacuna antirrábica', 'vacuna', '2026-12-01')`,
        [mascotaId],
      ),
    )
    await expect(
      comoUsuario(db, EXTRANO, (tx) =>
        tx.query(
          `insert into public.recordatorios_salud (mascota_id, titulo, fecha) values ($1, 'X', '2026-12-01')`,
          [mascotaId],
        ),
      ),
    ).rejects.toThrow(/row-level security/)
  })

  it('reservas: el precio lo calcula el servidor y el estado parte en pendiente', async () => {
    const reserva = await crearReserva('hospedaje')
    expect(reserva.precio_total).toBe(50000) // 2 noches × 25.000
    expect(reserva.estado).toBe('pendiente')
  })

  it('reservas: rechaza fechas pasadas y duraciones de más de 60 días', async () => {
    await expect(
      comoUsuario(db, DUENO, (tx) =>
        tx.query(
          `insert into public.reservas (dueno_id, cuidador_id, mascota_id, servicio, inicio, fin)
           values ($1, $2, $3, 'paseo', now() - interval '2 days', now() - interval '2 days' + interval '1 hour')`,
          [DUENO, CUIDADOR, mascotaId],
        ),
      ),
    ).rejects.toThrow(/en el pasado/)
    await expect(crearReserva('hospedaje', '2026-11-01T15:00:00Z', '2027-01-15T15:00:00Z')).rejects.toThrow(/60 días/)
  })

  it('reservas: rechaza servicios que el cuidador no ofrece y mascotas ajenas', async () => {
    await expect(crearReserva('visita')).rejects.toThrow(/no ofrece este servicio/)
    await expect(
      comoUsuario(db, EXTRANO, (tx) =>
        tx.query(
          `insert into public.reservas (dueno_id, cuidador_id, mascota_id, servicio, inicio, fin)
           values ($1, $2, $3, 'paseo', now(), now() + interval '1 hour')`,
          [EXTRANO, CUIDADOR, mascotaId],
        ),
      ),
    ).rejects.toThrow(/no pertenece/)
  })

  it('reservas: ciclo completo con permisos por rol', async () => {
    const reserva = await crearReserva('paseo', '2026-11-05T15:00:00Z', '2026-11-05T16:00:00Z')
    expect(reserva.precio_total).toBe(7000)

    await expect(cambiarEstado(DUENO, reserva.id, 'aceptada')).rejects.toThrow(/No puedes pasar/)
    await expect(cambiarEstado(EXTRANO, reserva.id, 'aceptada')).rejects.toThrow(/No participas/)

    // El cuidador ya ve la ficha de la mascota.
    const ficha = await comoUsuario(db, CUIDADOR, (tx) => filas(tx, 'select id from public.mascotas'))
    expect(ficha).toEqual([{ id: mascotaId }])

    await cambiarEstado(CUIDADOR, reserva.id, 'aceptada')

    // Seguimiento: no antes de iniciar.
    await expect(
      comoUsuario(db, CUIDADOR, (tx) =>
        tx.query('insert into public.seguimiento_puntos (reserva_id, latitud, longitud) values ($1, -33.4, -70.6)', [
          reserva.id,
        ]),
      ),
    ).rejects.toThrow(/row-level security/)

    await cambiarEstado(CUIDADOR, reserva.id, 'en_curso')
    await comoUsuario(db, CUIDADOR, (tx) =>
      tx.query(
        'insert into public.seguimiento_puntos (reserva_id, latitud, longitud) values ($1, -33.40, -70.60), ($1, -33.41, -70.61)',
        [reserva.id],
      ),
    )
    await expect(
      comoUsuario(db, DUENO, (tx) =>
        tx.query('insert into public.seguimiento_puntos (reserva_id, latitud, longitud) values ($1, 0, 0)', [
          reserva.id,
        ]),
      ),
    ).rejects.toThrow(/row-level security/)

    const puntos = await comoUsuario(db, DUENO, (tx) =>
      filas(tx, 'select latitud from public.seguimiento_puntos where reserva_id = $1', [reserva.id]),
    )
    expect(puntos).toHaveLength(2)
    const puntosExtrano = await comoUsuario(db, EXTRANO, (tx) => filas(tx, 'select id from public.seguimiento_puntos'))
    expect(puntosExtrano).toEqual([])

    // Botón de emergencia del dueño y foto del cuidador.
    await comoUsuario(db, DUENO, (tx) =>
      tx.query(`insert into public.actualizaciones_servicio (reserva_id, tipo) values ($1, 'emergencia')`, [reserva.id]),
    )
    await comoUsuario(db, CUIDADOR, (tx) =>
      tx.query(
        `insert into public.actualizaciones_servicio (reserva_id, tipo, foto_url) values ($1, 'foto', 'https://x/y.jpg')`,
        [reserva.id],
      ),
    )
    await expect(
      comoUsuario(db, EXTRANO, (tx) =>
        tx.query(`insert into public.actualizaciones_servicio (reserva_id, tipo, texto) values ($1, 'nota', 'x')`, [
          reserva.id,
        ]),
      ),
    ).rejects.toThrow(/row-level security/)

    // Reseña antes de completar: no.
    await expect(
      comoUsuario(db, DUENO, (tx) =>
        tx.query(`insert into public.resenas (reserva_id, cuidador_id, puntuacion) values ($1, $2, 5)`, [
          reserva.id,
          CUIDADOR,
        ]),
      ),
    ).rejects.toThrow(/servicios completados/)

    await cambiarEstado(CUIDADOR, reserva.id, 'completada')
    await expect(cambiarEstado(DUENO, reserva.id, 'cancelada')).rejects.toThrow(/No puedes pasar/)

    await comoUsuario(db, DUENO, (tx) =>
      tx.query(`insert into public.resenas (reserva_id, cuidador_id, puntuacion, comentario) values ($1, $2, 4, 'Bien')`, [
        reserva.id,
        CUIDADOR,
      ]),
    )
    await expect(
      comoUsuario(db, DUENO, (tx) =>
        tx.query(`insert into public.resenas (reserva_id, cuidador_id, puntuacion) values ($1, $2, 5)`, [
          reserva.id,
          CUIDADOR,
        ]),
      ),
    ).rejects.toThrow(/duplicate key/)

    const [cuidador] = await filas<{ calificacion: string; total_resenas: number }>(
      db,
      'select calificacion::text, total_resenas from public.cuidadores where id = $1',
      [CUIDADOR],
    )
    expect(cuidador).toEqual({ calificacion: '4.0', total_resenas: 1 })

    const [resumen] = await comoUsuario(db, CUIDADOR, (tx) =>
      filas<{ ganancias_total: number; servicios_completados: number; solicitudes_pendientes: number }>(
        tx,
        'select ganancias_total, servicios_completados, solicitudes_pendientes from public.resumen_cuidador()',
      ),
    )
    expect(resumen.ganancias_total).toBe(7000)
    expect(resumen.servicios_completados).toBe(1)
    expect(resumen.solicitudes_pendientes).toBeGreaterThanOrEqual(1)
  })

  it('reservas: el dueño cancela una pendiente; el cuidador no', async () => {
    const reserva = await crearReserva('paseo', '2026-11-10T15:00:00Z', '2026-11-10T16:00:00Z')
    await expect(cambiarEstado(CUIDADOR, reserva.id, 'cancelada')).rejects.toThrow(/No puedes pasar/)
    await cambiarEstado(DUENO, reserva.id, 'cancelada')
  })

  it('reservas: no se pueden editar directo (solo por la función de estados)', async () => {
    const reserva = await crearReserva('paseo', '2026-11-12T15:00:00Z', '2026-11-12T16:00:00Z')
    const resultado = await comoUsuario(db, DUENO, (tx) =>
      tx.query(`update public.reservas set precio_total = 1, estado = 'completada' where id = $1`, [reserva.id]),
    )
    expect(resultado.affectedRows).toBe(0)
  })

  it('chat: conversación única, privada, y el bloqueo impide escribir', async () => {
    const [{ id: conversacion }] = await comoUsuario(db, DUENO, (tx) =>
      filas<{ id: string }>(tx, 'select public.abrir_conversacion($1) as id', [CUIDADOR]),
    )
    const [{ id: otraVez }] = await comoUsuario(db, CUIDADOR, (tx) =>
      filas<{ id: string }>(tx, 'select public.abrir_conversacion($1) as id', [DUENO]),
    )
    expect(otraVez).toBe(conversacion)

    await comoUsuario(db, DUENO, (tx) =>
      tx.query(`insert into public.mensajes (conversacion_id, texto) values ($1, 'Hola!')`, [conversacion]),
    )
    await comoUsuario(db, CUIDADOR, (tx) => tx.query('select public.marcar_mensajes_leidos($1)', [conversacion]))
    const [mensaje] = await comoUsuario(db, CUIDADOR, (tx) =>
      filas<{ texto: string; leido: boolean }>(
        tx,
        'select texto, leido_en is not null as leido from public.mensajes where conversacion_id = $1',
        [conversacion],
      ),
    )
    expect(mensaje).toEqual({ texto: 'Hola!', leido: true })

    const ajenos = await comoUsuario(db, EXTRANO, (tx) => filas(tx, 'select id from public.mensajes'))
    expect(ajenos).toEqual([])
    await expect(
      comoUsuario(db, EXTRANO, (tx) =>
        tx.query(`insert into public.mensajes (conversacion_id, texto) values ($1, 'spam')`, [conversacion]),
      ),
    ).rejects.toThrow(/row-level security/)

    // Perfiles públicos: la contraparte ve el nombre, el extraño no ve al dueño.
    const contraparte = await comoUsuario(db, CUIDADOR, (tx) =>
      filas<{ nombre: string }>(tx, 'select nombre from public.perfiles_publicos($1)', [[DUENO]]),
    )
    expect(contraparte).toEqual([{ nombre: 'Daniela' }])
    const oculto = await comoUsuario(db, EXTRANO, (tx) =>
      filas(tx, 'select nombre from public.perfiles_publicos($1)', [[DUENO]]),
    )
    expect(oculto).toEqual([])

    await comoUsuario(db, CUIDADOR, (tx) =>
      tx.query('insert into public.bloqueos (bloqueado_id) values ($1)', [DUENO]),
    )
    await expect(
      comoUsuario(db, DUENO, (tx) =>
        tx.query(`insert into public.mensajes (conversacion_id, texto) values ($1, 'sigo?')`, [conversacion]),
      ),
    ).rejects.toThrow(/row-level security/)

    await comoUsuario(db, CUIDADOR, (tx) =>
      tx.query(`insert into public.reportes (reportado_id, conversacion_id, motivo) values ($1, $2, 'Spam')`, [
        DUENO,
        conversacion,
      ]),
    )
    const reportesAjenos = await comoUsuario(db, DUENO, (tx) => filas(tx, 'select id from public.reportes'))
    expect(reportesAjenos).toEqual([])

    await comoUsuario(db, CUIDADOR, (tx) =>
      tx.query('insert into public.ajustes_conversacion (conversacion_id, silenciada) values ($1, true)', [conversacion]),
    )
    await expect(
      comoUsuario(db, EXTRANO, (tx) =>
        tx.query('insert into public.ajustes_conversacion (conversacion_id, silenciada) values ($1, true)', [
          conversacion,
        ]),
      ),
    ).rejects.toThrow(/row-level security/)
  })

  it('privacidad: la ubicación exacta del cuidador no es pública', async () => {
    await filas(db, 'update public.cuidadores set latitud = -33.456789, longitud = -70.612345 where id = $1', [CUIDADOR])
    const directo = await comoUsuario(db, DUENO, (tx) =>
      filas(tx, 'select latitud from public.cuidadores where id = $1', [CUIDADOR]),
    )
    expect(directo).toEqual([])
    const [listado] = await comoUsuario(db, null, (tx) =>
      filas<{ latitud: number; longitud: number }>(
        tx,
        'select latitud, longitud from public.listar_cuidadores() where id = $1',
        [CUIDADOR],
      ),
    )
    expect(listado).toEqual({ latitud: -33.46, longitud: -70.61 })
    const propio = await comoUsuario(db, CUIDADOR, (tx) =>
      filas<{ latitud: number }>(tx, 'select latitud from public.cuidadores where id = $1', [CUIDADOR]),
    )
    expect(propio).toEqual([{ latitud: -33.456789 }])
  })

  it('chat: no se puede abrir conversación con cualquiera (solo cuidadores o contraparte de reserva)', async () => {
    await expect(
      comoUsuario(db, EXTRANO, (tx) => tx.query('select public.abrir_conversacion($1)', [DUENO])),
    ).rejects.toThrow(/No puedes iniciar/)
    // Con un cuidador activo de la semilla sí.
    await comoUsuario(db, EXTRANO, (tx) => tx.query('select public.abrir_conversacion($1)', [CUIDADOR_SEMILLA]))
  })

  it('bloqueos: impiden reservar, abrir chat y publicar novedades', async () => {
    // Parte sin bloqueo: se quita el de la prueba de chat y se vuelve a poner más abajo.
    await comoUsuario(db, CUIDADOR, (tx) => tx.query('delete from public.bloqueos where bloqueado_id = $1', [DUENO]))
    const reserva = await crearReserva('paseo', '2026-11-20T15:00:00Z', '2026-11-20T16:00:00Z')
    await cambiarEstado(CUIDADOR, reserva.id, 'aceptada')
    // En reservas cerradas no se publican novedades.
    const cancelada = await crearReserva('paseo', '2026-11-21T15:00:00Z', '2026-11-21T16:00:00Z')
    await cambiarEstado(DUENO, cancelada.id, 'cancelada')
    await expect(
      comoUsuario(db, DUENO, (tx) =>
        tx.query(`insert into public.actualizaciones_servicio (reserva_id, tipo, texto) values ($1, 'nota', 'x')`, [
          cancelada.id,
        ]),
      ),
    ).rejects.toThrow(/row-level security/)

    await comoUsuario(db, CUIDADOR, (tx) => tx.query('insert into public.bloqueos (bloqueado_id) values ($1)', [DUENO]))
    await expect(
      comoUsuario(db, DUENO, (tx) =>
        tx.query(`insert into public.actualizaciones_servicio (reserva_id, tipo, texto) values ($1, 'nota', 'x')`, [
          reserva.id,
        ]),
      ),
    ).rejects.toThrow(/row-level security/)
    await expect(crearReserva('paseo', '2026-11-22T15:00:00Z', '2026-11-22T16:00:00Z')).rejects.toThrow(
      /No es posible reservar/,
    )
    await expect(
      comoUsuario(db, DUENO, (tx) => tx.query('select public.abrir_conversacion($1)', [CUIDADOR])),
    ).rejects.toThrow(/No puedes iniciar/)

    await comoUsuario(db, CUIDADOR, (tx) => tx.query('delete from public.bloqueos where bloqueado_id = $1', [DUENO]))
    await comoUsuario(db, DUENO, (tx) =>
      tx.query(`insert into public.actualizaciones_servicio (reserva_id, tipo, texto) values ($1, 'nota', 'ok')`, [
        reserva.id,
      ]),
    )
  })

  it('bloqueos: un tercero no puede averiguar quién bloqueó a quién', async () => {
    await comoUsuario(db, CUIDADOR, (tx) => tx.query('delete from public.bloqueos where bloqueado_id = $1', [DUENO]))
    await comoUsuario(db, CUIDADOR, (tx) => tx.query('insert into public.bloqueos (bloqueado_id) values ($1)', [DUENO]))
    const [{ visto }] = await comoUsuario(db, EXTRANO, (tx) =>
      filas<{ visto: boolean }>(tx, 'select coalesce(public.hay_bloqueo($1, $2), false) as visto', [DUENO, CUIDADOR]),
    )
    expect(visto).toBe(false)
    const [{ propio }] = await comoUsuario(db, DUENO, (tx) =>
      filas<{ propio: boolean }>(tx, 'select public.hay_bloqueo($1, $2) as propio', [DUENO, CUIDADOR]),
    )
    expect(propio).toBe(true)
    await comoUsuario(db, CUIDADOR, (tx) => tx.query('delete from public.bloqueos where bloqueado_id = $1', [DUENO]))
  })

  it('emergencia: el teléfono de la contraparte solo con reserva activa', async () => {
    await filas(db, `update public.perfiles set telefono = '+56911112222' where id = $1`, [CUIDADOR])
    const reserva = await crearReserva('paseo', '2026-11-25T15:00:00Z', '2026-11-25T16:00:00Z')
    const telefono = (usuario: string) =>
      comoUsuario(db, usuario, (tx) =>
        filas<{ t: string | null }>(tx, 'select public.telefono_contraparte($1) as t', [reserva.id]),
      ).then(([fila]) => fila.t)
    expect(await telefono(DUENO)).toBeNull() // pendiente
    await cambiarEstado(CUIDADOR, reserva.id, 'aceptada')
    expect(await telefono(DUENO)).toBeNull() // sin emergencia activada
    await comoUsuario(db, DUENO, (tx) =>
      tx.query(`insert into public.actualizaciones_servicio (reserva_id, tipo) values ($1, 'emergencia')`, [reserva.id]),
    )
    expect(await telefono(DUENO)).toBe('+56911112222')
    expect(await telefono(EXTRANO)).toBeNull()
    await cambiarEstado(DUENO, reserva.id, 'cancelada')
    expect(await telefono(DUENO)).toBeNull()
  })

  it('storage: cada usuario sube solo a su carpeta', async () => {
    await comoUsuario(db, DUENO, (tx) =>
      tx.query(`insert into storage.objects (bucket_id, name) values ('fotos', $1)`, [`${DUENO}/mascotas/luna.jpg`]),
    )
    await expect(
      comoUsuario(db, DUENO, (tx) =>
        tx.query(`insert into storage.objects (bucket_id, name) values ('fotos', $1)`, [`${CUIDADOR}/x.jpg`]),
      ),
    ).rejects.toThrow(/row-level security/)
  })

  it('el precio de SQL coincide con la regla del frontend', async () => {
    const { calcularPrecio } = await import('../../src/utils/precios.ts')
    const casos: Array<['paseo' | 'hospedaje' | 'guarderia' | 'visita', string, string, number]> = [
      ['hospedaje', '2026-11-01T15:00:00Z', '2026-11-03T15:00:00Z', 25000],
      ['hospedaje', '2026-11-01T15:00:00Z', '2026-11-03T23:00:00Z', 25000],
      ['hospedaje', '2026-11-01T15:00:00Z', '2026-11-01T20:00:00Z', 25000],
      ['paseo', '2026-11-01T15:00:00Z', '2026-11-01T16:00:00Z', 7000],
      ['visita', '2026-11-01T15:00:00Z', '2026-11-01T15:30:00Z', 9000],
      ['guarderia', '2026-11-02T11:00:00Z', '2026-11-06T21:00:00Z', 15000],
      // Cambio de horario (abril 2027 y septiembre 2026).
      ['hospedaje', '2027-04-03T15:00:00Z', '2027-04-05T16:00:00Z', 25000],
      ['hospedaje', '2026-09-05T15:00:00Z', '2026-09-06T14:00:00Z', 25000],
    ]
    for (const [servicio, inicio, fin, unitario] of casos) {
      const [{ precio }] = await filas<{ precio: number }>(
        db,
        'select public.calcular_precio_reserva($1, $2, $3, $4) as precio',
        [servicio, inicio, fin, unitario],
      )
      expect(calcularPrecio(servicio, new Date(inicio), new Date(fin), unitario), `${servicio} ${inicio}`).toBe(precio)
    }
  })
})

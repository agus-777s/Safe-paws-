import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './client'
import type {
  ActualizacionServicio,
  EstadoReserva,
  NuevaReserva,
  PuntoSeguimiento,
  Resena,
  Reserva,
  Servicio,
  TipoActualizacion,
} from '@/types/dominio'

interface FilaReserva {
  id: string
  dueno_id: string
  cuidador_id: string
  mascota_id: string
  servicio: Servicio
  inicio: string
  fin: string
  precio_total: number
  estado: EstadoReserva
  notas: string
  iniciado_en: string | null
  finalizado_en: string | null
  creado_en: string
}

interface FilaPunto {
  id: number
  reserva_id: string
  latitud: number
  longitud: number
  registrado_en: string
}

interface FilaActualizacion {
  id: string
  reserva_id: string
  autor_id: string
  tipo: TipoActualizacion
  texto: string
  foto_url: string | null
  creado_en: string
}

interface FilaResena {
  id: string
  reserva_id: string
  autor_id: string
  cuidador_id: string
  puntuacion: number
  comentario: string
  creado_en: string
}

export function filaAReserva(fila: FilaReserva): Reserva {
  return {
    id: fila.id,
    duenoId: fila.dueno_id,
    cuidadorId: fila.cuidador_id,
    mascotaId: fila.mascota_id,
    servicio: fila.servicio,
    inicio: fila.inicio,
    fin: fila.fin,
    precioTotal: fila.precio_total,
    estado: fila.estado,
    notas: fila.notas,
    iniciadoEn: fila.iniciado_en,
    finalizadoEn: fila.finalizado_en,
    creadoEn: fila.creado_en,
  }
}

function filaAPunto(fila: FilaPunto): PuntoSeguimiento {
  return {
    id: fila.id,
    reservaId: fila.reserva_id,
    latitud: fila.latitud,
    longitud: fila.longitud,
    registradoEn: fila.registrado_en,
  }
}

function filaAActualizacion(fila: FilaActualizacion): ActualizacionServicio {
  return {
    id: fila.id,
    reservaId: fila.reserva_id,
    autorId: fila.autor_id,
    tipo: fila.tipo,
    texto: fila.texto,
    fotoUrl: fila.foto_url,
    creadoEn: fila.creado_en,
  }
}

function filaAResena(fila: FilaResena): Resena {
  return {
    id: fila.id,
    reservaId: fila.reserva_id,
    autorId: fila.autor_id,
    cuidadorId: fila.cuidador_id,
    puntuacion: fila.puntuacion,
    comentario: fila.comentario,
    creadoEn: fila.creado_en,
  }
}

/** Reservas donde participo (como dueño o como cuidador), más recientes primero. */
export async function listarMisReservas(): Promise<Reserva[]> {
  const { data, error } = await supabase.from('reservas').select('*').order('inicio', { ascending: false })
  if (error) throw error
  return (data as FilaReserva[]).map(filaAReserva)
}

export async function obtenerReserva(id: string): Promise<Reserva | null> {
  const { data, error } = await supabase.from('reservas').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? filaAReserva(data as FilaReserva) : null
}

/** El precio y el estado inicial los fija el servidor. */
export async function crearReserva(duenoId: string, reserva: NuevaReserva): Promise<Reserva> {
  const { data, error } = await supabase
    .from('reservas')
    .insert({
      dueno_id: duenoId,
      cuidador_id: reserva.cuidadorId,
      mascota_id: reserva.mascotaId,
      servicio: reserva.servicio,
      inicio: reserva.inicio.toISOString(),
      fin: reserva.fin.toISOString(),
      notas: reserva.notas.trim(),
    })
    .select('*')
    .single()
  if (error) throw error
  return filaAReserva(data as FilaReserva)
}

export async function cambiarEstadoReserva(id: string, estado: EstadoReserva): Promise<Reserva> {
  const { data, error } = await supabase.rpc('cambiar_estado_reserva', { p_reserva: id, p_estado: estado })
  if (error) throw error
  return filaAReserva(data as FilaReserva)
}

export function escucharReserva(id: string, alCambiar: (reserva: Reserva) => void): RealtimeChannel {
  return supabase
    .channel(`reserva-${id}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'reservas', filter: `id=eq.${id}` },
      (carga) => alCambiar(filaAReserva(carga.new as FilaReserva)),
    )
    .subscribe()
}

/** Teléfono de la otra parte; solo con la reserva aceptada o en curso. */
export async function obtenerTelefonoContraparte(reservaId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('telefono_contraparte', { p_reserva: reservaId })
  if (error) throw error
  return (data as string | null) ?? null
}

// ---------------------------------------------------------------------------
// Seguimiento en vivo
// ---------------------------------------------------------------------------

export async function listarPuntos(reservaId: string): Promise<PuntoSeguimiento[]> {
  const { data, error } = await supabase
    .from('seguimiento_puntos')
    .select('*')
    .eq('reserva_id', reservaId)
    .order('registrado_en', { ascending: true })
  if (error) throw error
  return (data as FilaPunto[]).map(filaAPunto)
}

export async function registrarPunto(reservaId: string, latitud: number, longitud: number): Promise<void> {
  const { error } = await supabase.from('seguimiento_puntos').insert({ reserva_id: reservaId, latitud, longitud })
  if (error) throw error
}

export async function listarActualizaciones(reservaId: string): Promise<ActualizacionServicio[]> {
  const { data, error } = await supabase
    .from('actualizaciones_servicio')
    .select('*')
    .eq('reserva_id', reservaId)
    .order('creado_en', { ascending: true })
  if (error) throw error
  return (data as FilaActualizacion[]).map(filaAActualizacion)
}

export async function publicarActualizacion(
  reservaId: string,
  tipo: TipoActualizacion,
  contenido: { texto?: string; fotoUrl?: string | null } = {},
): Promise<void> {
  const { error } = await supabase.from('actualizaciones_servicio').insert({
    reserva_id: reservaId,
    tipo,
    texto: contenido.texto?.trim() ?? '',
    foto_url: contenido.fotoUrl ?? null,
  })
  if (error) throw error
}

/** Puntos y novedades nuevas de un servicio en curso. */
export function escucharSeguimiento(
  reservaId: string,
  manejadores: {
    alPunto: (punto: PuntoSeguimiento) => void
    alActualizacion: (actualizacion: ActualizacionServicio) => void
  },
): RealtimeChannel {
  return supabase
    .channel(`seguimiento-${reservaId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'seguimiento_puntos', filter: `reserva_id=eq.${reservaId}` },
      (carga) => manejadores.alPunto(filaAPunto(carga.new as FilaPunto)),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'actualizaciones_servicio', filter: `reserva_id=eq.${reservaId}` },
      (carga) => manejadores.alActualizacion(filaAActualizacion(carga.new as FilaActualizacion)),
    )
    .subscribe()
}

// ---------------------------------------------------------------------------
// Reseñas
// ---------------------------------------------------------------------------

export async function listarResenasCuidador(cuidadorId: string): Promise<Resena[]> {
  const { data, error } = await supabase
    .from('resenas')
    .select('*')
    .eq('cuidador_id', cuidadorId)
    .order('creado_en', { ascending: false })
  if (error) throw error
  return (data as FilaResena[]).map(filaAResena)
}

export async function obtenerResenaDeReserva(reservaId: string): Promise<Resena | null> {
  const { data, error } = await supabase.from('resenas').select('*').eq('reserva_id', reservaId).maybeSingle()
  if (error) throw error
  return data ? filaAResena(data as FilaResena) : null
}

export async function crearResena(
  reserva: Pick<Reserva, 'id' | 'cuidadorId'>,
  puntuacion: number,
  comentario: string,
): Promise<void> {
  const { error } = await supabase.from('resenas').insert({
    reserva_id: reserva.id,
    cuidador_id: reserva.cuidadorId,
    puntuacion,
    comentario: comentario.trim(),
  })
  if (error) throw error
}

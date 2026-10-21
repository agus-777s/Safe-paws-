import { supabase } from './client'
import type { CuidadorPublico, PerfilCuidador, ResumenCuidador, Servicio } from '@/types/dominio'

interface FilaCuidadorBase {
  id: string
  bio: string
  servicios: Servicio[]
  precio_paseo: number | null
  precio_hospedaje: number | null
  precio_guarderia: number | null
  precio_visita: number | null
  comuna: string
  latitud: number | null
  longitud: number | null
  radio_km: number
  dias: number[]
  hora_inicio: string
  hora_fin: string
  verificado: boolean
  calificacion: number | string
  total_resenas: number
}

interface FilaCuidador extends FilaCuidadorBase {
  activo: boolean
}

interface FilaCuidadorPublico extends FilaCuidadorBase {
  nombre: string
  apellido: string
  avatar_url: string | null
  descripcion: string
}

interface FilaResumen {
  ganancias_mes: number
  ganancias_total: number
  servicios_completados: number
  solicitudes_pendientes: number
  proximos_servicios: number
  calificacion: number | string
  total_resenas: number
}

const hora = (valor: string) => valor.slice(0, 5)

function camposBase(fila: FilaCuidadorBase): Omit<PerfilCuidador, 'activo'> {
  return {
    id: fila.id,
    bio: fila.bio,
    servicios: fila.servicios ?? [],
    precios: {
      paseo: fila.precio_paseo,
      hospedaje: fila.precio_hospedaje,
      guarderia: fila.precio_guarderia,
      visita: fila.precio_visita,
    },
    comuna: fila.comuna,
    latitud: fila.latitud,
    longitud: fila.longitud,
    radioKm: fila.radio_km,
    dias: fila.dias ?? [],
    horaInicio: hora(fila.hora_inicio),
    horaFin: hora(fila.hora_fin),
    verificado: fila.verificado,
    calificacion: Number(fila.calificacion),
    totalResenas: fila.total_resenas,
  }
}

function filaAPublico(fila: FilaCuidadorPublico): CuidadorPublico {
  return {
    ...camposBase(fila),
    nombre: fila.nombre,
    apellido: fila.apellido,
    avatarUrl: fila.avatar_url,
    descripcion: fila.descripcion,
  }
}

export async function listarCuidadores(servicio?: Servicio | null): Promise<CuidadorPublico[]> {
  const { data, error } = await supabase.rpc('listar_cuidadores', { p_servicio: servicio ?? null })
  if (error) throw error
  return ((data ?? []) as FilaCuidadorPublico[]).map(filaAPublico)
}

export async function obtenerCuidadorPublico(id: string): Promise<CuidadorPublico | null> {
  const lista = await listarCuidadores(null)
  return lista.find((cuidador) => cuidador.id === id) ?? null
}

/** Perfil profesional propio (incluye inactivo). */
export async function obtenerMiPerfilCuidador(id: string): Promise<PerfilCuidador | null> {
  const { data, error } = await supabase.from('cuidadores').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const fila = data as FilaCuidador
  return { ...camposBase(fila), activo: fila.activo }
}

export type DatosPerfilCuidador = Omit<PerfilCuidador, 'id' | 'verificado' | 'calificacion' | 'totalResenas'>

export async function guardarPerfilCuidador(id: string, datos: DatosPerfilCuidador): Promise<void> {
  const { error } = await supabase.from('cuidadores').upsert(
    {
      id,
      bio: datos.bio.trim(),
      servicios: datos.servicios,
      precio_paseo: datos.precios.paseo,
      precio_hospedaje: datos.precios.hospedaje,
      precio_guarderia: datos.precios.guarderia,
      precio_visita: datos.precios.visita,
      comuna: datos.comuna.trim(),
      latitud: datos.latitud,
      longitud: datos.longitud,
      radio_km: datos.radioKm,
      dias: datos.dias,
      hora_inicio: datos.horaInicio,
      hora_fin: datos.horaFin,
      activo: datos.activo,
    },
    { onConflict: 'id' },
  )
  if (error) throw error
}

export async function obtenerResumenCuidador(): Promise<ResumenCuidador> {
  const { data, error } = await supabase.rpc('resumen_cuidador')
  if (error) throw error
  const fila = ((data ?? []) as FilaResumen[])[0]
  return {
    gananciasMes: fila?.ganancias_mes ?? 0,
    gananciasTotal: fila?.ganancias_total ?? 0,
    serviciosCompletados: fila?.servicios_completados ?? 0,
    solicitudesPendientes: fila?.solicitudes_pendientes ?? 0,
    proximosServicios: fila?.proximos_servicios ?? 0,
    calificacion: Number(fila?.calificacion ?? 0),
    totalResenas: fila?.total_resenas ?? 0,
  }
}

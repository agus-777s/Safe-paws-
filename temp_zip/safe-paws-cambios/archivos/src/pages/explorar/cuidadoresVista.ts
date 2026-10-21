import { supabaseConfigurado } from '@/services/supabase/client'
import { SERVICIOS } from '@/types/dominio'
import type { CuidadorPublico, Servicio } from '@/types/dominio'
import { distanciaKm } from '@/utils/geo'
import type { Coordenada } from '@/utils/geo'

/** Falla con un mensaje claro si la app no tiene Supabase configurado. */
export function exigirConexion(): void {
  if (!supabaseConfigurado) {
    throw new Error('Safe Paws aún no está conectado a la base de datos. Inténtalo más tarde.')
  }
}

export function nombreCompleto(cuidador: Pick<CuidadorPublico, 'nombre' | 'apellido'>): string {
  return `${cuidador.nombre} ${cuidador.apellido}`.trim() || 'Cuidador'
}

export function iniciales(nombre: string, apellido: string): string {
  const letras = `${nombre.trim().charAt(0)}${apellido.trim().charAt(0)}`.toUpperCase()
  return letras || '🐾'
}

export function unidadServicio(servicio: Servicio): string {
  return SERVICIOS.find((s) => s.valor === servicio)?.unidad ?? ''
}

/** Servicios que el cuidador ofrece y tienen precio publicado. */
export function serviciosConPrecio(cuidador: Pick<CuidadorPublico, 'servicios' | 'precios'>): Servicio[] {
  return SERVICIOS.map((s) => s.valor).filter(
    (s) => cuidador.servicios.includes(s) && cuidador.precios[s] != null,
  )
}

/** Precio más bajo (o el del servicio filtrado) con su unidad. */
export function precioDesde(
  cuidador: Pick<CuidadorPublico, 'servicios' | 'precios'>,
  servicio: Servicio | null,
): { monto: number; unidad: string } | null {
  const candidatos = servicio ? serviciosConPrecio(cuidador).filter((s) => s === servicio) : serviciosConPrecio(cuidador)
  let mejor: { monto: number; unidad: string } | null = null
  for (const s of candidatos) {
    const monto = cuidador.precios[s]
    if (monto != null && (!mejor || monto < mejor.monto)) mejor = { monto, unidad: unidadServicio(s) }
  }
  return mejor
}

export function coordenadaCuidador(cuidador: Pick<CuidadorPublico, 'latitud' | 'longitud'>): Coordenada | null {
  if (cuidador.latitud == null || cuidador.longitud == null) return null
  return { latitud: cuidador.latitud, longitud: cuidador.longitud }
}

export interface CuidadorConDistancia {
  cuidador: CuidadorPublico
  distancia: number | null
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/** Filtra por nombre/comuna y ordena por distancia si hay ubicación. */
export function filtrarYOrdenar(
  cuidadores: CuidadorPublico[],
  texto: string,
  ubicacion: Coordenada | null,
): CuidadorConDistancia[] {
  const consulta = normalizar(texto)
  const filtrados = cuidadores.filter((c) => {
    if (!consulta) return true
    return normalizar(`${nombreCompleto(c)} ${c.comuna}`).includes(consulta)
  })
  const conDistancia = filtrados.map((cuidador) => {
    const coordenada = coordenadaCuidador(cuidador)
    return { cuidador, distancia: ubicacion && coordenada ? distanciaKm(ubicacion, coordenada) : null }
  })
  if (!ubicacion) return conDistancia
  return [...conDistancia].sort((a, b) => {
    if (a.distancia == null) return b.distancia == null ? 0 : 1
    if (b.distancia == null) return -1
    return a.distancia - b.distancia
  })
}

import { obtenerPerfilesPublicos } from '@/services/supabase/chat'
import { obtenerMascota } from '@/services/supabase/mascotas'
import type { Mascota, PerfilPublico, Reserva } from '@/types/dominio'

export interface ReservasConDetalles {
  reservas: Reserva[]
  perfiles: Map<string, PerfilPublico>
  mascotas: Map<string, Mascota>
}

/**
 * Completa reservas con nombre/foto de la contraparte y datos de la mascota.
 * Los detalles son secundarios: si fallan, la lista igual se muestra.
 */
export async function cargarDetalles(reservas: Reserva[], usuarioId: string): Promise<ReservasConDetalles> {
  const idsPersonas = reservas.flatMap((r) => [r.duenoId, r.cuidadorId]).filter((id) => id !== usuarioId)
  const idsMascotas = [...new Set(reservas.map((r) => r.mascotaId))]

  const [perfiles, mascotas] = await Promise.all([
    obtenerPerfilesPublicos(idsPersonas).catch(() => new Map<string, PerfilPublico>()),
    Promise.all(idsMascotas.map((id) => obtenerMascota(id).catch(() => null))).then((lista) => {
      const mapa = new Map<string, Mascota>()
      for (const mascota of lista) if (mascota) mapa.set(mascota.id, mascota)
      return mapa
    }),
  ])
  return { reservas, perfiles, mascotas }
}

export function nombreCompleto(perfil: PerfilPublico | undefined, alternativo: string): string {
  if (!perfil) return alternativo
  return `${perfil.nombre} ${perfil.apellido}`.trim() || alternativo
}

export function iniciales(perfil: PerfilPublico | undefined): string {
  if (!perfil) return '?'
  return `${perfil.nombre.charAt(0)}${perfil.apellido.charAt(0)}`.toUpperCase() || '?'
}

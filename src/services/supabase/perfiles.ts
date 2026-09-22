import { supabase } from './client'
import type { Perfil } from '@/types/perfil'

interface FilaPerfil {
  id: string
  nombre: string | null
  apellido: string | null
  descripcion: string | null
  telefono: string | null
  rol: string | null
  mascotas: unknown
  datos_cuidador: unknown
  onboarding_completo: boolean | null
}

function filaAPerfil(fila: FilaPerfil): Perfil {
  return {
    id: fila.id,
    nombre: fila.nombre ?? '',
    apellido: fila.apellido ?? '',
    descripcion: fila.descripcion ?? '',
    telefono: fila.telefono ?? '',
    rol: (fila.rol as Perfil['rol']) ?? null,
    mascotas: Array.isArray(fila.mascotas) ? (fila.mascotas as Perfil['mascotas']) : [],
    datosCuidador: (fila.datos_cuidador as Perfil['datosCuidador']) ?? null,
    onboardingCompleto: fila.onboarding_completo ?? false,
  }
}

/** Devuelve null si no hay perfil o si la tabla aún no existe (para no romper la app). */
export async function obtenerPerfil(idUsuario: string): Promise<Perfil | null> {
  try {
    const { data, error } = await supabase.from('perfiles').select('*').eq('id', idUsuario).maybeSingle()
    if (error) return null
    if (!data) return null
    return filaAPerfil(data as FilaPerfil)
  } catch {
    return null
  }
}

export async function guardarPerfil(perfil: Perfil): Promise<void> {
  const { error } = await supabase.from('perfiles').upsert(
    {
      id: perfil.id,
      nombre: perfil.nombre,
      apellido: perfil.apellido,
      descripcion: perfil.descripcion,
      telefono: perfil.telefono,
      rol: perfil.rol,
      mascotas: perfil.mascotas,
      datos_cuidador: perfil.datosCuidador,
      onboarding_completo: perfil.onboardingCompleto,
    },
    { onConflict: 'id' },
  )
  if (error) throw error
}

export async function completarOnboarding(idUsuario: string): Promise<void> {
  try {
    await supabase.from('perfiles').update({ onboarding_completo: true }).eq('id', idUsuario)
  } catch {
    // No bloquea la navegación si la tabla aún no existe.
  }
}

const CLAVE_PENDIENTE = 'safe-paws-perfil-pendiente'

type PerfilPendiente = Omit<Perfil, 'id' | 'onboardingCompleto'>

/** Guarda el perfil cuando aún no hay sesión (cuenta sin confirmar). */
export function guardarPerfilPendiente(perfil: PerfilPendiente): void {
  try {
    window.sessionStorage.setItem(CLAVE_PENDIENTE, JSON.stringify(perfil))
  } catch {
    // Sin almacenamiento: se pierde el borrador, el usuario lo completará luego.
  }
}

/** Recupera y limpia el perfil pendiente tras iniciar sesión. */
export function obtenerYLimpiarPerfilPendiente(): PerfilPendiente | null {
  try {
    const crudo = window.sessionStorage.getItem(CLAVE_PENDIENTE)
    if (!crudo) return null
    window.sessionStorage.removeItem(CLAVE_PENDIENTE)
    return JSON.parse(crudo) as PerfilPendiente
  } catch {
    return null
  }
}

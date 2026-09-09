import type { DatosRegistro } from '@/types/auth'
import { supabase } from './client'

export async function obtenerSesion() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function iniciarSesion(correo: string, contrasena: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  })
  if (error) throw error
}

export async function registrarse(datos: DatosRegistro) {
  const { data, error } = await supabase.auth.signUp({
    email: datos.correo,
    password: datos.contrasena,
    options: {
      data: { nombre: datos.nombre },
    },
  })
  if (error) throw error

  return {
    sesionIniciada: Boolean(data.session),
    requiereConfirmacion: Boolean(data.user && !data.session),
  }
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
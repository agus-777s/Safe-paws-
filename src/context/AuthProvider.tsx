import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { DatosRegistro } from '@/types/auth'
import type { Perfil } from '@/types/perfil'
import * as authService from '@/services/supabase/auth'
import { completarOnboarding, obtenerPerfil, obtenerYLimpiarPerfilPendiente } from '@/services/supabase/perfiles'
import { guardarRegistro } from '@/services/supabase/registro'
import { supabase } from '@/services/supabase/client'
import { AuthContext } from './AuthContext'
import type { AuthContextValue } from './AuthContext'

const CLAVE_BIENVENIDA = 'safe-paws-bienvenida-vista'

function bienvenidaVista(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_BIENVENIDA) === '1'
  } catch {
    return false
  }
}

type BorradorRegistro = Omit<Perfil, 'id' | 'onboardingCompleto'>

/** Borrador del wizard: primero el de esta pestaña (con fotos), si no, el de los metadatos de la cuenta. */
function borradorPendiente(usuario: User): BorradorRegistro | null {
  const local = obtenerYLimpiarPerfilPendiente()
  if (local) return local
  const remoto = usuario.user_metadata?.registro_pendiente as BorradorRegistro | null | undefined
  return remoto && typeof remoto === 'object' && 'nombre' in remoto ? remoto : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [sesionCargando, setSesionCargando] = useState(true)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [perfilCargando, setPerfilCargando] = useState(false)

  const cargarPerfil = useCallback(async (actual: User | null) => {
    if (!actual) {
      setPerfil(null)
      setPerfilCargando(false)
      return
    }
    setPerfilCargando(true)
    try {
      let existente = await obtenerPerfil(actual.id)
      if (!existente) {
        // Registro con confirmación por correo: el borrador se guarda ahora con sesión activa.
        const pendiente = borradorPendiente(actual)
        if (pendiente) {
          try {
            await guardarRegistro({ ...pendiente, id: actual.id, onboardingCompleto: false })
            existente = await obtenerPerfil(actual.id)
          } catch {
            existente = null
          }
        }
      }
      // Si ya vio la bienvenida antes de iniciar sesión, no se la mostramos de nuevo.
      if (existente && !existente.onboardingCompleto && bienvenidaVista()) {
        try {
          await completarOnboarding(actual.id)
          existente = { ...existente, onboardingCompleto: true }
        } catch {
          // Se reintentará al terminar la bienvenida.
        }
      }
      setPerfil(existente)
    } finally {
      setPerfilCargando(false)
    }
  }, [])

  useEffect(() => {
    let activo = true

    void authService.obtenerSesion().then((sesion) => {
      if (!activo) return
      const actual = sesion?.user ?? null
      setUsuario(actual)
      setSesionCargando(false)
      void cargarPerfil(actual)
    })

    const suscripcion = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (!activo) return
      const actual = sesion?.user ?? null
      setUsuario(actual)
      setSesionCargando(false)
      // El refresco de token no cambia el perfil: evita recargas innecesarias.
      if (evento === 'TOKEN_REFRESHED') return
      void cargarPerfil(actual)
    })

    return () => {
      activo = false
      suscripcion.data.subscription.unsubscribe()
    }
  }, [cargarPerfil])

  const iniciarSesion = useCallback(async (correo: string, contrasena: string) => {
    await authService.iniciarSesion(correo, contrasena)
  }, [])

  const registrarse = useCallback(async (datos: DatosRegistro) => {
    return await authService.registrarse(datos)
  }, [])

  const cerrarSesion = useCallback(async () => {
    await authService.cerrarSesion()
    try {
      window.localStorage.removeItem(CLAVE_BIENVENIDA)
    } catch {
      // Sin almacenamiento disponible: no es crítico.
    }
  }, [])

  const refrescarPerfil = useCallback(async () => {
    const sesion = await authService.obtenerSesion()
    await cargarPerfil(sesion?.user ?? null)
  }, [cargarPerfil])

  // Con sesión, manda el perfil remoto (la marca local solo sirve antes de iniciar sesión).
  const perfilCompleto = Boolean(perfil?.onboardingCompleto)

  const valor = useMemo<AuthContextValue>(
    () => ({
      usuario,
      sesionCargando,
      iniciarSesion,
      registrarse,
      cerrarSesion,
      perfil,
      perfilCargando,
      perfilCompleto,
      refrescarPerfil,
    }),
    [usuario, sesionCargando, iniciarSesion, registrarse, cerrarSesion, perfil, perfilCargando, perfilCompleto, refrescarPerfil],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

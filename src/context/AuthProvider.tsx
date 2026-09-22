import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { DatosRegistro } from '@/types/auth'
import type { Perfil } from '@/types/perfil'
import * as authService from '@/services/supabase/auth'
import { guardarPerfil, obtenerPerfil, obtenerYLimpiarPerfilPendiente } from '@/services/supabase/perfiles'
import { supabase } from '@/services/supabase/client'
import { AuthContext } from './AuthContext'
import type { AuthContextValue } from './AuthContext'

const CLAVE_BIENVENIDA = 'safe-paws-bienvenida-vista'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [sesionCargando, setSesionCargando] = useState(true)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [perfilCargando, setPerfilCargando] = useState(false)

  const cargarPerfil = useCallback(async (idUsuario: string | null) => {
    if (!idUsuario) {
      setPerfil(null)
      setPerfilCargando(false)
      return
    }
    setPerfilCargando(true)
    try {
      const existente = await obtenerPerfil(idUsuario)
      if (existente) {
        setPerfil(existente)
        return
      }
      // Si el usuario se registró con confirmación por correo, su borrador
      // de perfil quedó pendiente: se guarda ahora con su sesión activa.
      const pendiente = obtenerYLimpiarPerfilPendiente()
      if (pendiente) {
        const completo: Perfil = { ...pendiente, id: idUsuario, onboardingCompleto: false }
        try {
          await guardarPerfil(completo)
          setPerfil(completo)
        } catch {
          setPerfil(null)
        }
        return
      }
      setPerfil(null)
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
      void cargarPerfil(actual?.id ?? null)
    })

    const suscripcion = supabase.auth.onAuthStateChange((_evento, sesion) => {
      if (!activo) return
      const actual = sesion?.user ?? null
      setUsuario(actual)
      setSesionCargando(false)
      void cargarPerfil(actual?.id ?? null)
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
    await cargarPerfil(sesion?.user?.id ?? null)
  }, [cargarPerfil])

  const perfilCompleto = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        if (window.localStorage.getItem(CLAVE_BIENVENIDA) === '1') return true
      } catch {
        // Ignorar: el gate seguirá usando el perfil remoto.
      }
    }
    return Boolean(perfil?.onboardingCompleto)
  }, [perfil])

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

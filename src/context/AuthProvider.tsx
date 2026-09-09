import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { DatosRegistro } from '@/types/auth'
import * as authService from '@/services/supabase/auth'
import { supabase } from '@/services/supabase/client'
import { AuthContext } from './AuthContext'
import type { AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [sesionCargando, setSesionCargando] = useState(true)

  useEffect(() => {
    let activo = true

    void authService.obtenerSesion().then((sesion) => {
      if (!activo) return
      setUsuario(sesion?.user ?? null)
      setSesionCargando(false)
    })

    const suscripcion = supabase.auth.onAuthStateChange((_evento, sesion) => {
      if (!activo) return
      setUsuario(sesion?.user ?? null)
      setSesionCargando(false)
    })

    return () => {
      activo = false
      suscripcion.data.subscription.unsubscribe()
    }
  }, [])

  const iniciarSesion = useCallback(async (correo: string, contrasena: string) => {
    await authService.iniciarSesion(correo, contrasena)
  }, [])

  const registrarse = useCallback(async (datos: DatosRegistro) => {
    return await authService.registrarse(datos)
  }, [])

  const cerrarSesion = useCallback(async () => {
    await authService.cerrarSesion()
  }, [])

  const valor = useMemo<AuthContextValue>(
    () => ({ usuario, sesionCargando, iniciarSesion, registrarse, cerrarSesion }),
    [usuario, sesionCargando, iniciarSesion, registrarse, cerrarSesion],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
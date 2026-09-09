import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { DatosRegistro } from '@/types/auth'

export interface ResultadoRegistro {
  sesionIniciada: boolean
  requiereConfirmacion: boolean
}

export interface AuthContextValue {
  usuario: User | null
  sesionCargando: boolean
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>
  registrarse: (datos: DatosRegistro) => Promise<ResultadoRegistro>
  cerrarSesion: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
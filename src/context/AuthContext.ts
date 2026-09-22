import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { DatosRegistro } from '@/types/auth'
import type { Perfil } from '@/types/perfil'

export interface ResultadoRegistro {
  sesionIniciada: boolean
  requiereConfirmacion: boolean
  idUsuario?: string
}

export interface AuthContextValue {
  usuario: User | null
  sesionCargando: boolean
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>
  registrarse: (datos: DatosRegistro) => Promise<ResultadoRegistro>
  cerrarSesion: () => Promise<void>
  perfil: Perfil | null
  perfilCargando: boolean
  perfilCompleto: boolean
  refrescarPerfil: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

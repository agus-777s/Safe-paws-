import { useContext } from 'react'
import { AuthContext } from '@/context/AuthContext'
import type { AuthContextValue } from '@/context/AuthContext'

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext)
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>')
  }
  return contexto
}
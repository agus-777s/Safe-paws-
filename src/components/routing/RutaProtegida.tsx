import { Navigate, Outlet } from 'react-router-dom'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'

export default function RutaProtegida() {
  const { sesionCargando, usuario } = useAuth()

  if (sesionCargando) {
    return <Spinner etiqueta="Cargando…" />
  }

  if (!usuario) {
    return <Navigate to="/iniciar-sesion" replace />
  }

  return <Outlet />
}
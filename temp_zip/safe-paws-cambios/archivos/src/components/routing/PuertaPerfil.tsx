import { Navigate, Outlet } from 'react-router-dom'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'

function bienvenidaVista(): boolean {
  try {
    return window.localStorage.getItem('safe-paws-bienvenida-vista') === '1'
  } catch {
    return false
  }
}

/**
 * Puerta de bienvenida: un usuario autenticado que aún no completa el
 * onboarding es redirigido a /bienvenida antes de entrar a la app.
 * Pre-auth: si aún no vio el onboarding, también va a /bienvenida
 * antes de /iniciar-sesion.
 */
export default function PuertaPerfil() {
  const { sesionCargando, usuario, perfilCargando, perfilCompleto } = useAuth()

  if (sesionCargando || (usuario && perfilCargando)) {
    return <Spinner etiqueta="Preparando tu experiencia…" />
  }

  if (!usuario) {
    return <Navigate to={bienvenidaVista() ? '/iniciar-sesion' : '/bienvenida'} replace />
  }

  if (!perfilCompleto) {
    return <Navigate to="/bienvenida" replace />
  }

  return <Outlet />
}

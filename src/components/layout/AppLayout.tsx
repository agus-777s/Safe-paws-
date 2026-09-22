import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import estilo from './AppLayout.module.css'

const RUTAS_PANTALLA_COMPLETA = ['/bienvenida', '/iniciar-sesion', '/registro']

export default function AppLayout() {
  const ubicacion = useLocation()
  const esPantallaCompleta = RUTAS_PANTALLA_COMPLETA.includes(ubicacion.pathname)

  if (esPantallaCompleta) {
    return (
      <div className={estilo.completo}>
        <Outlet />
      </div>
    )
  }

  return (
    <div className={estilo.estructura}>
      <Navbar />
      <main className={estilo.principal}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'
import { esRolCuidador, esRolDueno } from '@/types/perfil'
import { clases } from '@/utils/clases'
import estilo from './Navbar.module.css'

export default function Navbar() {
  const { usuario, perfil, cerrarSesion } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const enlaces: Array<{ ruta: string; texto: string }> = [{ ruta: '/explorar', texto: 'Explorar' }]
  if (usuario) {
    if (esRolCuidador(perfil?.rol)) enlaces.push({ ruta: '/panel', texto: 'Mi panel' })
    enlaces.push({ ruta: '/reservas', texto: 'Reservas' })
    enlaces.push({ ruta: '/mensajes', texto: 'Mensajes' })
    if (esRolDueno(perfil?.rol)) enlaces.push({ ruta: '/mascotas', texto: 'Mascotas' })
    enlaces.push({ ruta: '/mi-cuenta', texto: 'Mi cuenta' })
  }

  function cerrarMenu() {
    setMenuAbierto(false)
  }

  async function manejarCierreSesion() {
    try {
      await cerrarSesion()
    } catch {
      console.error('No se pudo cerrar la sesión.')
    }
  }

  return (
    <header className={estilo.barra}>
      <div className={estilo.contenido}>
        <Link to="/" className={estilo.marca} onClick={cerrarMenu}>
          <Logo ancho={26} alto={26} />
          <span className={estilo.nombre}>Safe Paws</span>
        </Link>

        <nav
          className={clases(estilo.navegacion, menuAbierto && estilo.navegacionAbierta)}
          aria-label="Navegación principal"
        >
          <NavLink
            to="/"
            end
            onClick={cerrarMenu}
            className={({ isActive }) => clases(estilo.enlace, isActive && estilo.enlaceActivo)}
          >
            Inicio
          </NavLink>
          {enlaces.map((enlace) => (
            <NavLink
              key={enlace.ruta}
              to={enlace.ruta}
              onClick={cerrarMenu}
              className={({ isActive }) => clases(estilo.enlace, isActive && estilo.enlaceActivo)}
            >
              {enlace.texto}
            </NavLink>
          ))}

          <div className={estilo.acciones}>
            {usuario ? (
              <Button variante="fantasma" onClick={() => void manejarCierreSesion()}>
                Cerrar sesión
              </Button>
            ) : (
              <>
                <Button enlace="/iniciar-sesion" variante="fantasma" onClick={cerrarMenu}>
                  Iniciar sesión
                </Button>
                <Button enlace="/registro" onClick={cerrarMenu}>
                  Registrarme
                </Button>
              </>
            )}
          </div>
        </nav>

        <button
          type="button"
          className={estilo.botonMenu}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {menuAbierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
    </header>
  )
}
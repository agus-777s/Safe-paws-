import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'
import { useAuth } from '@/hooks/useAuth'
import { mensajeError } from '@/utils/errores'
import { clases } from '@/utils/clases'
import estilo from './IniciarSesionPage.module.css'

export default function IniciarSesionPage() {
  const { usuario, sesionCargando, iniciarSesion } = useAuth()
  const navigate = useNavigate()
  const ubicacion = useLocation()

  const mensajeBienvenida = (ubicacion.state as { mensaje?: string } | null)?.mensaje

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!sesionCargando && usuario) {
      navigate('/', { replace: true })
      return
    }
    // Onboarding pre-auth: si aún no lo vio, mostrarlo antes del login.
    if (!sesionCargando && !usuario) {
      try {
        if (window.localStorage.getItem('safe-paws-bienvenida-vista') !== '1') {
          navigate('/bienvenida', { replace: true })
        }
      } catch {
        navigate('/bienvenida', { replace: true })
      }
    }
  }, [sesionCargando, usuario, navigate])

  const correoValido = correo.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)

    try {
      await iniciarSesion(correo, contrasena)
      navigate('/', { replace: true })
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={estilo.pagina}>
      <div className={estilo.decoracion} aria-hidden="true" />
      <main className={estilo.contenedor}>
        <header className={estilo.marca}>
          <span className={estilo.logo}>
            <Logo ancho={30} alto={30} />
          </span>
          <h1 className={estilo.titulo}>Safe Paws</h1>
        </header>

        {mensajeBienvenida && (
          <p className={estilo.aviso} role="status">
            {mensajeBienvenida}
          </p>
        )}

        <form className={estilo.formulario} onSubmit={manejarEnvio} noValidate>
          <div className={clases(estilo.flotante, !correoValido && estilo.flotanteError)}>
            <input
              id="correo"
              type="email"
              autoComplete="email"
              placeholder=" "
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              required
              aria-invalid={!correoValido}
              className={estilo.entrada}
            />
            <label className={estilo.etiqueta} htmlFor="correo">
              Correo electrónico
            </label>
            <span className={estilo.estado} aria-hidden="true">
              {correo.length > 0 && (correoValido ? '✓' : '✕')}
            </span>
          </div>

          <div className={estilo.flotante}>
            <input
              id="contrasena"
              type={mostrarContrasena ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder=" "
              value={contrasena}
              onChange={(evento) => setContrasena(evento.target.value)}
              required
              className={estilo.entradaConBoton}
            />
            <label className={estilo.etiqueta} htmlFor="contrasena">
              Contraseña
            </label>
            <button
              type="button"
              className={estilo.ver}
              onClick={() => setMostrarContrasena((actual) => !actual)}
              aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {mostrarContrasena ? '👁' : '👁‍🗨'}
            </button>
          </div>

          <div className={estilo.filaAyuda}>
            <button
              type="button"
              className={estilo.enlaceBoton}
              onClick={() =>
                setInfo('La recuperación de contraseña aún no está disponible. Escríbenos a hola@safepaws.app.')
              }
            >
              ¿Recuperar contraseña?
            </button>
          </div>

          {info && (
            <p className={estilo.aviso} role="status">
              {info}
            </p>
          )}

          {error && (
            <p className={estilo.error} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={enviando} tamanio="grande" className={estilo.boton}>
            {enviando ? 'Ingresando…' : '🐾 Iniciar Sesión'}
          </Button>
        </form>

        <p className={estilo.pies}>
          ¿No tienes una cuenta? <Link to="/registro">Regístrate</Link>
        </p>
      </main>
    </div>
  )
}

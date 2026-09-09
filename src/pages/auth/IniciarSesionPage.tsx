import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import CampoTexto from '@/components/ui/CampoTexto'
import { useAuth } from '@/hooks/useAuth'
import { mensajeError } from '@/utils/errores'
import estilo from './IniciarSesionPage.module.css'

export default function IniciarSesionPage() {
  const { usuario, sesionCargando, iniciarSesion } = useAuth()
  const navigate = useNavigate()
  const ubicacion = useLocation()

  const mensajeBienvenida = (ubicacion.state as { mensaje?: string } | null)?.mensaje

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!sesionCargando && usuario) {
      navigate('/', { replace: true })
    }
  }, [sesionCargando, usuario, navigate])

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
      <Card className={estilo.tarjeta}>
        <header className={estilo.encabezado}>
          <h1 className={estilo.titulo}>Iniciar sesión</h1>
          <p className={estilo.subtitulo}>Accede a tu cuenta de Safe Paws.</p>
        </header>

        {mensajeBienvenida && (
          <p className={estilo.aviso} role="status">
            {mensajeBienvenida}
          </p>
        )}

        <form className={estilo.formulario} onSubmit={manejarEnvio} noValidate>
          <CampoTexto
            id="correo"
            etiqueta="Correo electrónico"
            tipo="email"
            autoComplete="email"
            valor={correo}
            alCambiar={setCorreo}
            requerido
          />
          <CampoTexto
            id="contrasena"
            etiqueta="Contraseña"
            tipo="password"
            autoComplete="current-password"
            valor={contrasena}
            alCambiar={setContrasena}
            requerido
          />

          {error && (
            <p className={estilo.error} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={enviando} tamanio="grande" className={estilo.boton}>
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>

        <p className={estilo.pies}>
          ¿No tienes cuenta? <Link to="/registro">Regístrate gratis</Link>
        </p>
      </Card>
    </div>
  )
}
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import CampoTexto from '@/components/ui/CampoTexto'
import { useAuth } from '@/hooks/useAuth'
import { mensajeError } from '@/utils/errores'
import estilo from './RegistroPage.module.css'

export default function RegistroPage() {
  const { usuario, sesionCargando, registrarse } = useAuth()
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
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

    if (contrasena !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setEnviando(true)
    try {
      const resultado = await registrarse({ nombre, correo, contrasena })
      if (!resultado.sesionIniciada) {
        navigate('/iniciar-sesion', {
          replace: true,
          state: { mensaje: 'Cuenta creada. Revisa tu correo para confirmarla e inicia sesión.' },
        })
        return
      }
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
          <h1 className={estilo.titulo}>Crear cuenta</h1>
          <p className={estilo.subtitulo}>Únete a Safe Paws y encuentra el mejor cuidado.</p>
        </header>

        <form className={estilo.formulario} onSubmit={manejarEnvio} noValidate>
          <CampoTexto
            id="nombre"
            etiqueta="Nombre"
            tipo="text"
            autoComplete="name"
            valor={nombre}
            alCambiar={setNombre}
            requerido
          />
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
            etiqueta="Contraseña (mínimo 6 caracteres)"
            tipo="password"
            autoComplete="new-password"
            valor={contrasena}
            alCambiar={setContrasena}
            requerido
          />
          <CampoTexto
            id="confirmacion"
            etiqueta="Confirmar contraseña"
            tipo="password"
            autoComplete="new-password"
            valor={confirmacion}
            alCambiar={setConfirmacion}
            requerido
          />

          {error && (
            <p className={estilo.error} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={enviando} tamanio="grande" className={estilo.boton}>
            {enviando ? 'Creando tu cuenta…' : 'Crear mi cuenta'}
          </Button>
        </form>

        <p className={estilo.pies}>
          ¿Ya tienes cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link>
        </p>
      </Card>
    </div>
  )
}
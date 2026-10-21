import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import CampoTexto from '@/components/ui/CampoTexto'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { subirFoto } from '@/services/supabase/fotos'
import { actualizarDatosPerfil } from '@/services/supabase/perfiles'
import { esRolCuidador, esRolDueno } from '@/types/perfil'
import type { Perfil, RolUsuario } from '@/types/perfil'
import { mensajeError } from '@/utils/errores'
import estilo from './MiCuentaPage.module.css'

const ETIQUETAS_ROL: Record<RolUsuario, string> = {
  dueno: 'Dueño de mascotas',
  cuidador: 'Cuidador',
  ambos: 'Perfil dual: dueño y cuidador',
}

interface Acceso {
  titulo: string
  descripcion: string
  icono: string
  enlace: string
  visible: (rol: RolUsuario | null) => boolean
}

const ACCESOS: Acceso[] = [
  { titulo: 'Mis mascotas', descripcion: 'Fichas, dieta y salud', icono: '🐾', enlace: '/mascotas', visible: esRolDueno },
  { titulo: 'Mis reservas', descripcion: 'Servicios agendados', icono: '📅', enlace: '/reservas', visible: () => true },
  { titulo: 'Mensajes', descripcion: 'Tus conversaciones', icono: '💬', enlace: '/mensajes', visible: () => true },
  { titulo: 'Buscar cuidadores', descripcion: 'Cerca de ti', icono: '🔎', enlace: '/explorar', visible: esRolDueno },
  { titulo: 'Panel de cuidador', descripcion: 'Solicitudes y ganancias', icono: '📊', enlace: '/panel', visible: esRolCuidador },
  { titulo: 'Perfil de cuidador', descripcion: 'Servicios, precios y zona', icono: '🏡', enlace: '/panel/perfil', visible: esRolCuidador },
]

export default function MiCuentaPage() {
  const { usuario, perfil, cerrarSesion, refrescarPerfil } = useAuth()
  const navigate = useNavigate()
  const [errorCierre, setErrorCierre] = useState<string | null>(null)

  if (!usuario) return null

  async function manejarCierreSesion() {
    setErrorCierre(null)
    try {
      await cerrarSesion()
      navigate('/')
    } catch (e) {
      setErrorCierre(mensajeError(e))
    }
  }

  const rol = perfil?.rol ?? null
  const accesos = ACCESOS.filter((a) => a.visible(rol))

  return (
    <div className={`contenedor ${estilo.pagina}`}>
      <h1 className={estilo.titulo}>Mi cuenta</h1>

      {perfil ? (
        <DatosPerfil key={perfil.id} perfil={perfil} correo={usuario.email ?? ''} alGuardar={refrescarPerfil} />
      ) : (
        <Card className={estilo.tarjeta}>
          <p className={estilo.nombre}>{usuario.email}</p>
          <p className={estilo.suave}>No pudimos cargar tu perfil. Revisa tu conexión e inténtalo más tarde.</p>
        </Card>
      )}

      {perfil && (
        <RolCuenta
          usuarioId={usuario.id}
          rol={rol}
          alCambiar={async (destino) => {
            await refrescarPerfil()
            navigate(destino)
          }}
        />
      )}

      <section aria-labelledby="accesos-titulo">
        <h2 id="accesos-titulo" className={estilo.subtitulo}>
          Accesos rápidos
        </h2>
        <ul className={estilo.accesos}>
          {accesos.map((acceso) => (
            <li key={acceso.enlace}>
              <Link to={acceso.enlace} className={estilo.acceso}>
                <span className={estilo.accesoIcono} aria-hidden="true">
                  {acceso.icono}
                </span>
                <span className={estilo.accesoTitulo}>{acceso.titulo}</span>
                <span className={estilo.accesoDescripcion}>{acceso.descripcion}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className={estilo.acciones}>
        <Button variante="secundario" onClick={() => void manejarCierreSesion()}>
          Cerrar sesión
        </Button>
        {errorCierre && (
          <p className={estilo.error} role="alert">
            {errorCierre}
          </p>
        )}
      </div>
    </div>
  )
}

interface DatosPerfilProps {
  perfil: Perfil
  correo: string
  alGuardar: () => Promise<void>
}

function DatosPerfil({ perfil, correo, alGuardar }: DatosPerfilProps) {
  const archivoRef = useRef<HTMLInputElement>(null)
  const [nombre, setNombre] = useState(perfil.nombre)
  const [apellido, setApellido] = useState(perfil.apellido)
  const [telefono, setTelefono] = useState(perfil.telefono)
  const [descripcion, setDescripcion] = useState(perfil.descripcion)
  const [avatarUrl, setAvatarUrl] = useState(perfil.avatarUrl)

  const [errorNombre, setErrorNombre] = useState<string | undefined>()
  const [errorTelefono, setErrorTelefono] = useState<string | undefined>()
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const iniciales = `${nombre.trim().charAt(0)}${apellido.trim().charAt(0)}`.toUpperCase() || '🙂'

  async function cambiarFoto(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo) return
    if (!archivo.type.startsWith('image/')) {
      setError('Elige una imagen.')
      return
    }
    setSubiendo(true)
    setError(null)
    setExito(null)
    try {
      const url = await subirFoto(perfil.id, 'perfil', archivo)
      await actualizarDatosPerfil(perfil.id, { avatarUrl: url })
      setAvatarUrl(url)
      await alGuardar()
      setExito('Foto actualizada.')
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setSubiendo(false)
    }
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nombreValido = nombre.trim().length > 0
    const telefonoLimpio = telefono.trim()
    const telefonoValido = telefonoLimpio === '' || /^\+?[\d\s-]{8,15}$/.test(telefonoLimpio)
    setErrorNombre(nombreValido ? undefined : 'Escribe tu nombre.')
    setErrorTelefono(telefonoValido ? undefined : 'Ingresa un teléfono válido (ej: +56 9 1234 5678).')
    if (!nombreValido || !telefonoValido) return
    setGuardando(true)
    setError(null)
    setExito(null)
    try {
      await actualizarDatosPerfil(perfil.id, { nombre, apellido, telefono, descripcion })
      await alGuardar()
      setExito('Cambios guardados.')
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className={estilo.tarjeta}>
      <div className={estilo.identidad}>
        <button
          type="button"
          className={estilo.avatar}
          onClick={() => archivoRef.current?.click()}
          disabled={subiendo}
          aria-label="Cambiar foto de perfil"
        >
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span aria-hidden="true">{iniciales}</span>}
          <span className={estilo.avatarEditar} aria-hidden="true">
            {subiendo ? <Spinner /> : '📷'}
          </span>
        </button>
        <input ref={archivoRef} type="file" accept="image/*" className={estilo.oculto} onChange={(e) => void cambiarFoto(e)} tabIndex={-1} aria-hidden="true" />
        <div className={estilo.identidadTexto}>
          <p className={estilo.nombre}>{`${perfil.nombre} ${perfil.apellido}`.trim() || correo}</p>
          <p className={estilo.suave}>{correo}</p>
        </div>
      </div>

      <form className={estilo.formulario} onSubmit={(e) => void guardar(e)} noValidate>
        <div className={estilo.fila}>
          <CampoTexto etiqueta="Nombre" valor={nombre} alCambiar={setNombre} error={errorNombre} requerido maxLength={60} autoComplete="given-name" />
          <CampoTexto etiqueta="Apellido" valor={apellido} alCambiar={setApellido} maxLength={60} autoComplete="family-name" />
        </div>
        <CampoTexto etiqueta="Teléfono" tipo="tel" valor={telefono} alCambiar={setTelefono} error={errorTelefono} autoComplete="tel" placeholder="+56 9 1234 5678" />
        <div className={estilo.campo}>
          <label className={estilo.etiqueta} htmlFor="mi-cuenta-descripcion">
            Sobre mí
          </label>
          <textarea
            id="mi-cuenta-descripcion"
            className={estilo.area}
            rows={3}
            maxLength={500}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Cuéntale a la comunidad quién eres y cómo cuidas a tus mascotas."
          />
        </div>
        {error && (
          <p className={estilo.error} role="alert">
            {error}
          </p>
        )}
        {exito && (
          <p className={estilo.exito} role="status">
            {exito}
          </p>
        )}
        <div>
          <Button type="submit" disabled={guardando || subiendo}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

interface RolCuentaProps {
  usuarioId: string
  rol: RolUsuario | null
  alCambiar: (destino: string) => Promise<void>
}

function RolCuenta({ usuarioId, rol, alCambiar }: RolCuentaProps) {
  const [cambiando, setCambiando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function activarDual(destino: string) {
    setCambiando(true)
    setError(null)
    try {
      await actualizarDatosPerfil(usuarioId, { rol: 'ambos' })
      await alCambiar(destino)
    } catch (e) {
      setError(mensajeError(e))
      setCambiando(false)
    }
  }

  return (
    <Card className={estilo.tarjetaRol}>
      <div>
        <p className={estilo.etiquetaRol}>Tu rol</p>
        <p className={estilo.rol}>{rol ? ETIQUETAS_ROL[rol] : 'Sin rol definido'}</p>
      </div>
      {rol === 'dueno' && (
        <Button variante="secundario" onClick={() => void activarDual('/panel/perfil')} disabled={cambiando}>
          {cambiando ? 'Activando…' : 'Quiero ser cuidador también'}
        </Button>
      )}
      {rol === 'cuidador' && (
        <Button variante="secundario" onClick={() => void activarDual('/mascotas/nueva')} disabled={cambiando}>
          {cambiando ? 'Activando…' : 'Agregar mis mascotas'}
        </Button>
      )}
      {error && (
        <p className={estilo.error} role="alert">
          {error}
        </p>
      )}
    </Card>
  )
}

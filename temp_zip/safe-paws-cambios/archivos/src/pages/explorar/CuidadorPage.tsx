import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EstadoVista from '@/components/ui/EstadoVista'
import { useAuth } from '@/hooks/useAuth'
import { useCarga } from '@/hooks/useCarga'
import { abrirConversacion } from '@/services/supabase/chat'
import { obtenerCuidadorPublico } from '@/services/supabase/cuidadores'
import { SERVICIOS } from '@/types/dominio'
import type { CuidadorPublico } from '@/types/dominio'
import { DIAS_SEMANA } from '@/types/perfil'
import { clases } from '@/utils/clases'
import { mensajeError } from '@/utils/errores'
import { formatearClp } from '@/utils/precios'
import AvatarCuidador from './AvatarCuidador'
import MapaZona from './MapaZona'
import ResenasCuidador from './ResenasCuidador'
import { exigirConexion, nombreCompleto } from './cuidadoresVista'
import estilo from './CuidadorPage.module.css'

const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
/** Semana chilena: lunes primero. */
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0]

export default function CuidadorPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [abriendoChat, setAbriendoChat] = useState(false)
  const [errorChat, setErrorChat] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    exigirConexion()
    return obtenerCuidadorPublico(id)
  }, [id])
  const { datos: cuidador, cargando, error, recargar } = useCarga(cargar)

  async function enviarMensaje() {
    if (!usuario) {
      navigate('/iniciar-sesion')
      return
    }
    setAbriendoChat(true)
    setErrorChat(null)
    try {
      const conversacionId = await abrirConversacion(id)
      navigate(`/mensajes/${conversacionId}`)
    } catch (e: unknown) {
      setErrorChat(mensajeError(e))
      setAbriendoChat(false)
    }
  }

  return (
    <div className={clases('contenedor', estilo.pagina)}>
      <Link to="/explorar" className={estilo.volver}>
        ← Volver a explorar
      </Link>
      <EstadoVista
        cargando={cargando}
        error={error}
        alReintentar={recargar}
        etiquetaCarga="Cargando perfil…"
        vacio={!cuidador}
        mensajeVacio="Este cuidador no existe o ya no está disponible."
        accionVacio={
          <Button variante="secundario" enlace="/explorar">
            Ver otros cuidadores
          </Button>
        }
      >
        {cuidador && (
          <PerfilCuidador
            cuidador={cuidador}
            esPropio={usuario?.id === cuidador.id}
            conSesion={Boolean(usuario)}
            abriendoChat={abriendoChat}
            errorChat={errorChat}
            alEnviarMensaje={() => void enviarMensaje()}
          />
        )}
      </EstadoVista>
    </div>
  )
}

interface PerfilCuidadorProps {
  cuidador: CuidadorPublico
  esPropio: boolean
  conSesion: boolean
  abriendoChat: boolean
  errorChat: string | null
  alEnviarMensaje: () => void
}

function PerfilCuidador({ cuidador, esPropio, conSesion, abriendoChat, errorChat, alEnviarMensaje }: PerfilCuidadorProps) {
  const nombre = nombreCompleto(cuidador)
  const servicios = SERVICIOS.filter((s) => cuidador.servicios.includes(s.valor))
  const texto = [cuidador.bio, cuidador.descripcion].filter((t) => t && t.trim()).join('\n\n')

  return (
    <div className={estilo.rejilla}>
      <div className={estilo.principal}>
        <Card className={estilo.cabecera}>
          <AvatarCuidador
            nombre={cuidador.nombre}
            apellido={cuidador.apellido}
            avatarUrl={cuidador.avatarUrl}
            tamanio="grande"
          />
          <div className={estilo.identidad}>
            <h1 className={estilo.nombre}>{nombre}</h1>
            <div className={estilo.insignias}>
              {cuidador.verificado && <span className={estilo.verificado}>✓ Verificado</span>}
              <span>📍 {cuidador.comuna || 'Santiago'}</span>
              <span>
                {cuidador.totalResenas > 0
                  ? `⭐ ${cuidador.calificacion.toFixed(1)} (${cuidador.totalResenas} ${cuidador.totalResenas === 1 ? 'reseña' : 'reseñas'})`
                  : 'Sin reseñas aún'}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className={estilo.subtitulo}>Sobre mí</h2>
          <p className={estilo.bio}>{texto || `${cuidador.nombre} aún no ha escrito una descripción.`}</p>
        </Card>

        <Card>
          <h2 className={estilo.subtitulo}>Servicios y tarifas</h2>
          {servicios.length === 0 ? (
            <p className={estilo.suave}>Este cuidador aún no publica servicios.</p>
          ) : (
            <ul className={estilo.servicios}>
              {servicios.map((s) => {
                const precio = cuidador.precios[s.valor]
                return (
                  <li key={s.valor} className={estilo.servicio}>
                    <span className={estilo.servicioIcono} aria-hidden="true">
                      {s.icono}
                    </span>
                    <span className={estilo.servicioTitulo}>{s.titulo}</span>
                    <span className={estilo.servicioPrecio}>
                      {precio != null ? (
                        <>
                          <strong>{formatearClp(precio)}</strong> <small>{s.unidad}</small>
                        </>
                      ) : (
                        <small>Precio a convenir</small>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className={estilo.subtitulo}>Disponibilidad</h2>
          <ul className={estilo.dias} aria-label="Días disponibles">
            {ORDEN_DIAS.map((d) => {
              const activo = cuidador.dias.includes(d)
              return (
                <li
                  key={d}
                  className={clases(estilo.dia, activo && estilo.diaActivo)}
                  aria-label={`${NOMBRES_DIAS[d]}: ${activo ? 'disponible' : 'no disponible'}`}
                >
                  {DIAS_SEMANA[d]}
                </li>
              )
            })}
          </ul>
          <p className={estilo.horario}>
            🕗 {cuidador.horaInicio} – {cuidador.horaFin}
          </p>
        </Card>

        <Card>
          <h2 className={estilo.subtitulo}>Zona de cobertura</h2>
          {cuidador.latitud != null && cuidador.longitud != null ? (
            <MapaZona
              latitud={cuidador.latitud}
              longitud={cuidador.longitud}
              radioKm={cuidador.radioKm}
              comuna={cuidador.comuna}
            />
          ) : null}
          <p className={estilo.suave}>
            Atiende en un radio de {cuidador.radioKm} km de {cuidador.comuna || 'Santiago'}. La ubicación exacta se
            comparte al confirmar la reserva.
          </p>
        </Card>

        <ResenasCuidador cuidadorId={cuidador.id} />
      </div>

      <aside className={estilo.lateral}>
        <Card className={estilo.acciones}>
          {esPropio ? (
            <>
              <p className={estilo.suave}>Así ven tu perfil los dueños de mascotas.</p>
              <Button enlace="/panel/perfil" variante="secundario">
                Editar mi perfil
              </Button>
            </>
          ) : (
            <>
              <p className={estilo.accionesTitulo}>¿Te gusta {cuidador.nombre}?</p>
              <Button
                enlace={conSesion ? `/reservar/${cuidador.id}` : '/iniciar-sesion'}
                tamanio="grande"
                className={estilo.reservar}
              >
                Reservar
              </Button>
              <Button variante="secundario" onClick={alEnviarMensaje} disabled={abriendoChat}>
                {abriendoChat ? 'Abriendo chat…' : 'Enviar mensaje'}
              </Button>
              {!conSesion && <p className={estilo.suave}>Inicia sesión para reservar o escribirle.</p>}
              {errorChat && (
                <p className={estilo.error} role="alert">
                  {errorChat}
                </p>
              )}
            </>
          )}
        </Card>
      </aside>
    </div>
  )
}

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '@/components/ui/Button'
import CampoSeleccion from '@/components/ui/CampoSeleccion'
import EstadoVista from '@/components/ui/EstadoVista'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { useCarga } from '@/hooks/useCarga'
import {
  bloquear,
  cambiarSilenciada,
  desbloquear,
  enviarMensaje,
  escucharMensajes,
  listarMensajes,
  marcarLeidos,
  obtenerBloqueo,
  obtenerConversacion,
  obtenerPerfilesPublicos,
  obtenerSilenciada,
  otroParticipante,
  reportar,
} from '@/services/supabase/chat'
import { supabase } from '@/services/supabase/client'
import { subirFoto } from '@/services/supabase/fotos'
import type { Conversacion, Mensaje, PerfilPublico } from '@/types/dominio'
import { clases } from '@/utils/clases'
import { mensajeError } from '@/utils/errores'
import Avatar from './Avatar'
import { agregarMensaje, nombreCompleto, ultimoLeidoPropio } from './logicaChat'
import { formatearHoraMensaje } from './tiempo'
import estilo from './ConversacionPage.module.css'

interface DatosConversacion {
  conversacion: Conversacion | null
  otroId: string
  otro: PerfilPublico | null
  mensajes: Mensaje[]
  yoBloquee: boolean
  meBloquearon: boolean
  silenciada: boolean
}

type Panel = 'ninguno' | 'bloquear' | 'reportar' | 'reporteEnviado'

const MOTIVOS_REPORTE = ['Spam', 'Acoso', 'Fraude', 'Contenido inapropiado', 'Otro']
const LARGO_MAXIMO_MENSAJE = 2000

export default function ConversacionPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { usuario } = useAuth()
  const miId = usuario?.id ?? ''

  const cargar = useCallback(async (): Promise<DatosConversacion> => {
    const [conversacion, mensajes] = await Promise.all([obtenerConversacion(id), listarMensajes(id)])
    if (!conversacion) {
      return { conversacion: null, otroId: '', otro: null, mensajes: [], yoBloquee: false, meBloquearon: false, silenciada: false }
    }
    const otroId = otroParticipante(conversacion, miId)
    const [perfiles, bloqueo, silenciada] = await Promise.all([
      obtenerPerfilesPublicos([otroId]),
      obtenerBloqueo(miId, otroId),
      obtenerSilenciada(id, miId),
    ])
    return { conversacion, otroId, otro: perfiles.get(otroId) ?? null, mensajes, ...bloqueo, silenciada }
  }, [id, miId])

  const { datos, cargando, error, recargar, establecer } = useCarga(cargar)
  const conversacionLista = Boolean(datos?.conversacion)

  // Marca como leídos al abrir la conversación.
  useEffect(() => {
    if (!conversacionLista) return
    marcarLeidos(id).catch(() => {
      // No es crítico: se reintentará al llegar el próximo mensaje.
    })
  }, [id, conversacionLista])

  // Mensajes en tiempo real (sin duplicar los que ya tenemos).
  useEffect(() => {
    if (!conversacionLista || !miId) return
    let canal: ReturnType<typeof escucharMensajes> | null = null
    try {
      const fusionar = (mensaje: Mensaje) =>
        establecer((previo) => (previo ? { ...previo, mensajes: agregarMensaje(previo.mensajes, mensaje) } : previo))
      canal = escucharMensajes(
        id,
        (mensaje) => {
          fusionar(mensaje)
          if (mensaje.autorId !== miId) {
            marcarLeidos(id).catch(() => {
              // Se volverá a intentar con el siguiente mensaje.
            })
          }
        },
        // Cambios de `leido_en`: el tick "Leído" se actualiza en vivo.
        fusionar,
      )
    } catch {
      canal = null
    }
    return () => {
      if (canal) void supabase.removeChannel(canal)
    }
  }, [id, miId, conversacionLista, establecer])

  return (
    <div className={estilo.pagina}>
      <EstadoVista
        cargando={cargando}
        error={error}
        alReintentar={recargar}
        etiquetaCarga="Cargando conversación…"
        vacio={!datos?.conversacion}
        mensajeVacio="No encontramos esta conversación o no tienes acceso a ella."
        accionVacio={
          <Button variante="secundario" enlace="/mensajes">
            Volver a mensajes
          </Button>
        }
      >
        {datos && datos.conversacion && (
          <Chat
            conversacionId={id}
            miId={miId}
            datos={datos}
            alActualizar={(cambio) => establecer((previo) => (previo ? { ...previo, ...cambio } : previo))}
            alAgregarMensaje={(mensaje) =>
              establecer((previo) => (previo ? { ...previo, mensajes: agregarMensaje(previo.mensajes, mensaje) } : previo))
            }
          />
        )}
      </EstadoVista>
    </div>
  )
}

interface ChatProps {
  conversacionId: string
  miId: string
  datos: DatosConversacion
  alActualizar: (cambio: Partial<DatosConversacion>) => void
  alAgregarMensaje: (mensaje: Mensaje) => void
}

function Chat({ conversacionId, miId, datos, alActualizar, alAgregarMensaje }: ChatProps) {
  const { otroId, otro, mensajes, yoBloquee, meBloquearon, silenciada } = datos
  const nombreOtro = nombreCompleto(otro)
  const idMenu = useId()

  const [menuAbierto, setMenuAbierto] = useState(false)
  const [panel, setPanel] = useState<Panel>('ninguno')
  const [accionEnCurso, setAccionEnCurso] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  const [motivo, setMotivo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [errorMotivo, setErrorMotivo] = useState<string | undefined>()

  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState<'texto' | 'foto' | null>(null)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)

  const listaRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const archivoRef = useRef<HTMLInputElement>(null)

  const puedeEscribir = !yoBloquee && !meBloquearon
  const idLeido = ultimoLeidoPropio(mensajes, miId)

  // Baja al último mensaje cuando llegan mensajes nuevos.
  useEffect(() => {
    const lista = listaRef.current
    if (lista) lista.scrollTop = lista.scrollHeight
  }, [mensajes.length])

  // Cierra el menú con Escape o al hacer clic fuera.
  useEffect(() => {
    if (!menuAbierto) return
    function alPresionar(evento: globalThis.KeyboardEvent) {
      if (evento.key === 'Escape') setMenuAbierto(false)
    }
    function alClic(evento: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(evento.target as Node)) setMenuAbierto(false)
    }
    document.addEventListener('keydown', alPresionar)
    document.addEventListener('mousedown', alClic)
    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.removeEventListener('mousedown', alClic)
    }
  }, [menuAbierto])

  async function ejecutar(accion: () => Promise<void>) {
    setAccionEnCurso(true)
    setErrorAccion(null)
    try {
      await accion()
    } catch (e) {
      setErrorAccion(mensajeError(e))
    } finally {
      setAccionEnCurso(false)
    }
  }

  function abrirPanel(nuevo: Panel) {
    setMenuAbierto(false)
    setErrorAccion(null)
    setPanel(nuevo)
  }

  const alternarSilencio = () =>
    ejecutar(async () => {
      setMenuAbierto(false)
      await cambiarSilenciada(conversacionId, miId, !silenciada)
      alActualizar({ silenciada: !silenciada })
    })

  const confirmarBloqueo = () =>
    ejecutar(async () => {
      await bloquear(otroId)
      alActualizar({ yoBloquee: true })
      setPanel('ninguno')
    })

  const quitarBloqueo = () =>
    ejecutar(async () => {
      setMenuAbierto(false)
      await desbloquear(miId, otroId)
      alActualizar({ yoBloquee: false })
    })

  function enviarReporte(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!motivo) {
      setErrorMotivo('Elige un motivo.')
      return
    }
    setErrorMotivo(undefined)
    const detalleLimpio = detalle.trim()
    void ejecutar(async () => {
      await reportar(otroId, detalleLimpio ? `${motivo}: ${detalleLimpio}` : motivo, conversacionId)
      setMotivo('')
      setDetalle('')
      setPanel('reporteEnviado')
    })
  }

  async function enviarTexto() {
    const limpio = texto.trim()
    if (!limpio || enviando || !puedeEscribir) return
    setEnviando('texto')
    setErrorEnvio(null)
    try {
      const mensaje = await enviarMensaje(conversacionId, { texto: limpio })
      alAgregarMensaje(mensaje)
      setTexto('')
    } catch (e) {
      setErrorEnvio(mensajeError(e))
    } finally {
      setEnviando(null)
    }
  }

  async function enviarFoto(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo || enviando || !puedeEscribir) return
    if (!archivo.type.startsWith('image/')) {
      setErrorEnvio('Solo puedes enviar imágenes.')
      return
    }
    setEnviando('foto')
    setErrorEnvio(null)
    try {
      const fotoUrl = await subirFoto(miId, 'chat', archivo)
      const mensaje = await enviarMensaje(conversacionId, { fotoUrl })
      alAgregarMensaje(mensaje)
    } catch (e) {
      setErrorEnvio(mensajeError(e))
    } finally {
      setEnviando(null)
    }
  }

  function alTeclear(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault()
      void enviarTexto()
    }
  }

  function alEnviarFormulario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    void enviarTexto()
  }

  return (
    <div className={estilo.chat}>
      <header className={estilo.cabecera}>
        <Link to="/mensajes" className={estilo.volver} aria-label="Volver a mensajes">
          ←
        </Link>
        <Avatar perfil={otro} tamanio="pequeno" />
        <div className={estilo.cabeceraTexto}>
          <h1 className={estilo.nombre}>{nombreOtro}</h1>
          {silenciada && <p className={estilo.estadoCabecera}>🔕 Notificaciones silenciadas</p>}
        </div>
        <div className={estilo.menuEnvoltura} ref={menuRef}>
          <button
            type="button"
            className={estilo.botonMenu}
            aria-label="Opciones de la conversación"
            aria-haspopup="menu"
            aria-expanded={menuAbierto}
            aria-controls={idMenu}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            ⋯
          </button>
          {menuAbierto && (
            <div className={estilo.menu} id={idMenu} role="menu">
              <button type="button" role="menuitem" className={estilo.opcion} onClick={() => void alternarSilencio()} disabled={accionEnCurso}>
                {silenciada ? '🔔 Activar notificaciones' : '🔕 Silenciar'}
              </button>
              {yoBloquee ? (
                <button type="button" role="menuitem" className={estilo.opcion} onClick={() => void quitarBloqueo()} disabled={accionEnCurso}>
                  ✅ Desbloquear
                </button>
              ) : (
                <button type="button" role="menuitem" className={estilo.opcion} onClick={() => abrirPanel('bloquear')}>
                  🚫 Bloquear
                </button>
              )}
              <button type="button" role="menuitem" className={clases(estilo.opcion, estilo.opcionPeligro)} onClick={() => abrirPanel('reportar')}>
                ⚠️ Reportar
              </button>
            </div>
          )}
        </div>
      </header>

      {errorAccion && panel === 'ninguno' && (
        <p className={estilo.avisoError} role="alert">
          {errorAccion}
        </p>
      )}

      {panel === 'bloquear' && (
        <section className={estilo.panel} aria-label="Confirmar bloqueo">
          <p className={estilo.panelTitulo}>¿Bloquear a {nombreOtro}?</p>
          <p className={estilo.panelTexto}>No podrán enviarse mensajes mientras el bloqueo esté activo. Puedes deshacerlo cuando quieras.</p>
          {errorAccion && (
            <p className={estilo.avisoErrorPanel} role="alert">
              {errorAccion}
            </p>
          )}
          <div className={estilo.panelAcciones}>
            <Button tamanio="pequeno" onClick={() => void confirmarBloqueo()} disabled={accionEnCurso}>
              {accionEnCurso ? 'Bloqueando…' : 'Sí, bloquear'}
            </Button>
            <Button tamanio="pequeno" variante="fantasma" onClick={() => setPanel('ninguno')} disabled={accionEnCurso}>
              Cancelar
            </Button>
          </div>
        </section>
      )}

      {panel === 'reportar' && (
        <form className={estilo.panel} onSubmit={enviarReporte} aria-label="Reportar a esta persona" noValidate>
          <p className={estilo.panelTitulo}>Reportar a {nombreOtro}</p>
          <p className={estilo.panelTexto}>Nuestro equipo revisará el caso. La otra persona no sabrá que la reportaste.</p>
          <CampoSeleccion
            etiqueta="Motivo"
            valor={motivo}
            alCambiar={setMotivo}
            requerido
            error={errorMotivo}
            opciones={[{ valor: '', texto: 'Elige un motivo' }, ...MOTIVOS_REPORTE.map((m) => ({ valor: m, texto: m }))]}
          />
          <label className={estilo.etiqueta} htmlFor={`${idMenu}-detalle`}>
            Detalle (opcional)
          </label>
          <textarea
            id={`${idMenu}-detalle`}
            className={estilo.areaPanel}
            rows={3}
            maxLength={500}
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Cuéntanos qué pasó"
          />
          {errorAccion && (
            <p className={estilo.avisoErrorPanel} role="alert">
              {errorAccion}
            </p>
          )}
          <div className={estilo.panelAcciones}>
            <Button tamanio="pequeno" type="submit" disabled={accionEnCurso}>
              {accionEnCurso ? 'Enviando…' : 'Enviar reporte'}
            </Button>
            <Button tamanio="pequeno" variante="fantasma" onClick={() => setPanel('ninguno')} disabled={accionEnCurso}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {panel === 'reporteEnviado' && (
        <section className={estilo.panel} aria-live="polite">
          <p className={estilo.panelTitulo}>Gracias, recibimos tu reporte.</p>
          {!yoBloquee && <p className={estilo.panelTexto}>¿Quieres bloquear también a {nombreOtro}?</p>}
          {errorAccion && (
            <p className={estilo.avisoErrorPanel} role="alert">
              {errorAccion}
            </p>
          )}
          <div className={estilo.panelAcciones}>
            {!yoBloquee && (
              <Button tamanio="pequeno" onClick={() => void confirmarBloqueo()} disabled={accionEnCurso}>
                {accionEnCurso ? 'Bloqueando…' : 'Bloquear'}
              </Button>
            )}
            <Button tamanio="pequeno" variante="fantasma" onClick={() => setPanel('ninguno')} disabled={accionEnCurso}>
              Cerrar
            </Button>
          </div>
        </section>
      )}

      <div className={estilo.mensajes} ref={listaRef} role="log" aria-live="polite" aria-label={`Mensajes con ${nombreOtro}`}>
        {mensajes.length === 0 ? (
          <p className={estilo.sinMensajes}>Aún no hay mensajes. ¡Saluda a {otro?.nombre || 'esta persona'}! 👋</p>
        ) : (
          mensajes.map((mensaje) => {
            const esMio = mensaje.autorId === miId
            return (
              <div key={mensaje.id} className={clases(estilo.fila, esMio ? estilo.filaMia : estilo.filaOtra)}>
                <div className={clases(estilo.burbuja, esMio ? estilo.burbujaMia : estilo.burbujaOtra)}>
                  {mensaje.fotoUrl && (
                    <a href={mensaje.fotoUrl} target="_blank" rel="noopener noreferrer" className={estilo.fotoEnlace}>
                      <img src={mensaje.fotoUrl} alt={esMio ? 'Foto que enviaste' : `Foto de ${nombreOtro}`} className={estilo.foto} loading="lazy" />
                    </a>
                  )}
                  {mensaje.texto && <p className={estilo.texto}>{mensaje.texto}</p>}
                  <span className={estilo.meta}>
                    <time dateTime={mensaje.creadoEn}>{formatearHoraMensaje(mensaje.creadoEn)}</time>
                    {esMio && mensaje.id === idLeido && <span className={estilo.leido}> · ✓✓ Leído</span>}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <footer className={estilo.pie}>
        {yoBloquee && (
          <div className={estilo.banner} role="status">
            <span>Bloqueaste a esta persona.</span>
            <Button tamanio="pequeno" variante="secundario" onClick={() => void quitarBloqueo()} disabled={accionEnCurso}>
              Desbloquear
            </Button>
          </div>
        )}
        {!yoBloquee && meBloquearon && (
          <div className={estilo.banner} role="status">
            No puedes enviar mensajes en esta conversación.
          </div>
        )}
        {errorEnvio && (
          <p className={estilo.avisoErrorPanel} role="alert">
            {errorEnvio}
          </p>
        )}
        {enviando === 'foto' && (
          <div className={estilo.estadoEnvio}>
            <Spinner etiqueta="Subiendo foto…" />
          </div>
        )}
        <form className={estilo.compositor} onSubmit={alEnviarFormulario}>
          <input
            ref={archivoRef}
            type="file"
            accept="image/*"
            className={estilo.oculto}
            onChange={(e) => void enviarFoto(e)}
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            type="button"
            className={estilo.botonIcono}
            onClick={() => archivoRef.current?.click()}
            disabled={!puedeEscribir || enviando !== null}
            aria-label="Enviar una foto"
          >
            📷
          </button>
          <textarea
            className={estilo.entrada}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={alTeclear}
            rows={1}
            maxLength={LARGO_MAXIMO_MENSAJE}
            placeholder={puedeEscribir ? 'Escribe un mensaje…' : 'Mensajes desactivados'}
            aria-label="Mensaje"
            disabled={!puedeEscribir}
          />
          <button
            type="submit"
            className={estilo.botonEnviar}
            disabled={!puedeEscribir || enviando !== null || !texto.trim()}
            aria-label={enviando === 'texto' ? 'Enviando mensaje' : 'Enviar mensaje'}
          >
            {enviando === 'texto' ? '…' : '➤'}
          </button>
        </form>
      </footer>
    </div>
  )
}

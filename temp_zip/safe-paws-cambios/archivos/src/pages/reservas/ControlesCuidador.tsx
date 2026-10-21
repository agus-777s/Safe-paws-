import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import Button from '@/components/ui/Button'
import { subirFoto } from '@/services/supabase/fotos'
import { publicarActualizacion, registrarPunto } from '@/services/supabase/reservas'
import { clases } from '@/utils/clases'
import { mensajeError } from '@/utils/errores'
import type { Coordenada } from '@/utils/geo'
import { debeRegistrarPunto } from './logicaReservas'
import estilo from './ControlesCuidador.module.css'

interface ControlesCuidadorProps {
  reservaId: string
  usuarioId: string
  /** Vuelve a leer puntos y novedades (por si Realtime no está disponible). */
  alPublicar: () => void
}

function mensajeGeolocalizacion(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) return 'Debes permitir el acceso a tu ubicación en el navegador.'
  if (error.code === error.POSITION_UNAVAILABLE) return 'No pudimos obtener tu ubicación. Revisa el GPS.'
  if (error.code === error.TIMEOUT) return 'La ubicación tardó demasiado. Seguimos intentando…'
  return 'No pudimos leer tu ubicación.'
}

export default function ControlesCuidador({ reservaId, usuarioId, alPublicar }: ControlesCuidadorProps) {
  const [compartiendo, setCompartiendo] = useState(false)
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null)
  const [ultimoEnvio, setUltimoEnvio] = useState<Date | null>(null)
  const ultimoPuntoRef = useRef<(Coordenada & { tiempo: number }) | null>(null)
  const alPublicarRef = useRef(alPublicar)
  useEffect(() => {
    alPublicarRef.current = alPublicar
  }, [alPublicar])

  const [subiendo, setSubiendo] = useState(false)
  const [nota, setNota] = useState('')
  const [publicandoNota, setPublicandoNota] = useState(false)
  const [errorPublicacion, setErrorPublicacion] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const idFoto = useId()
  const idNota = useId()

  useEffect(() => {
    if (!compartiendo) return
    const idSeguimiento = navigator.geolocation.watchPosition(
      (posicion) => {
        const nuevo = { latitud: posicion.coords.latitude, longitud: posicion.coords.longitude }
        const ahora = Date.now()
        setErrorUbicacion(null)
        if (!debeRegistrarPunto(ultimoPuntoRef.current, nuevo, ahora)) return
        ultimoPuntoRef.current = { ...nuevo, tiempo: ahora }
        registrarPunto(reservaId, nuevo.latitud, nuevo.longitud)
          .then(() => {
            setUltimoEnvio(new Date(ahora))
            alPublicarRef.current()
          })
          .catch((e: unknown) => setErrorUbicacion(mensajeError(e)))
      },
      (error) => {
        setErrorUbicacion(mensajeGeolocalizacion(error))
        if (error.code === error.PERMISSION_DENIED) setCompartiendo(false)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(idSeguimiento)
  }, [compartiendo, reservaId])

  function alternarUbicacion() {
    if (compartiendo) {
      setCompartiendo(false)
      return
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setErrorUbicacion('Tu navegador no permite compartir la ubicación.')
      return
    }
    setErrorUbicacion(null)
    setCompartiendo(true)
  }

  async function manejarFoto(evento: ChangeEvent<HTMLInputElement>) {
    const entrada = evento.currentTarget
    const archivo = entrada.files?.[0]
    if (!archivo) return
    setSubiendo(true)
    setErrorPublicacion(null)
    setAviso(null)
    try {
      const fotoUrl = await subirFoto(usuarioId, 'servicios', archivo)
      await publicarActualizacion(reservaId, 'foto', { fotoUrl })
      setAviso('Foto compartida con el dueño.')
      alPublicar()
    } catch (e) {
      setErrorPublicacion(mensajeError(e))
    } finally {
      setSubiendo(false)
      entrada.value = ''
    }
  }

  async function manejarNota(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const texto = nota.trim()
    if (!texto) {
      setErrorPublicacion('Escribe una nota antes de publicarla.')
      return
    }
    setPublicandoNota(true)
    setErrorPublicacion(null)
    setAviso(null)
    try {
      await publicarActualizacion(reservaId, 'nota', { texto })
      setNota('')
      setAviso('Nota publicada.')
      alPublicar()
    } catch (e) {
      setErrorPublicacion(mensajeError(e))
    } finally {
      setPublicandoNota(false)
    }
  }

  return (
    <section className={estilo.panel} aria-labelledby={`${idNota}-titulo`}>
      <h2 id={`${idNota}-titulo`} className={estilo.titulo}>
        Herramientas del cuidador
      </h2>

      <div className={estilo.ubicacion}>
        <div>
          <p className={estilo.rotulo}>Compartir mi ubicación</p>
          <p className={estilo.ayuda}>
            {compartiendo
              ? ultimoEnvio
                ? `Último punto enviado a las ${ultimoEnvio.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
                : 'Buscando tu ubicación…'
              : 'El dueño verá tu ruta en vivo mientras esté activa.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={compartiendo}
          aria-label="Compartir mi ubicación"
          className={clases(estilo.interruptor, compartiendo && estilo.interruptorActivo)}
          onClick={alternarUbicacion}
        >
          <span className={estilo.perilla} aria-hidden="true" />
        </button>
      </div>
      {errorUbicacion && (
        <p className={estilo.error} role="alert">
          {errorUbicacion}
        </p>
      )}

      <div className={estilo.foto}>
        <input
          id={idFoto}
          type="file"
          accept="image/*"
          className={estilo.oculto}
          disabled={subiendo}
          onChange={(e) => void manejarFoto(e)}
        />
        <label htmlFor={idFoto} className={clases(estilo.botonFoto, subiendo && estilo.deshabilitado)}>
          📷 {subiendo ? 'Subiendo foto…' : 'Subir foto'}
        </label>
      </div>

      <form className={estilo.nota} onSubmit={(e) => void manejarNota(e)}>
        <label htmlFor={idNota} className={estilo.rotulo}>
          Agregar nota
        </label>
        <textarea
          id={idNota}
          className={estilo.areaTexto}
          rows={2}
          maxLength={500}
          placeholder="Ej: Tomó agua y jugó en el parque 🐶"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
        <Button type="submit" tamanio="pequeno" disabled={publicandoNota}>
          {publicandoNota ? 'Publicando…' : 'Publicar nota'}
        </Button>
      </form>

      {errorPublicacion && (
        <p className={estilo.error} role="alert">
          {errorPublicacion}
        </p>
      )}
      {aviso && (
        <p className={estilo.exito} role="status">
          {aviso}
        </p>
      )}
    </section>
  )
}

import { useCallback, useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { Link, useParams } from 'react-router-dom'
import EstadoVista from '@/components/ui/EstadoVista'
import { useAuth } from '@/hooks/useAuth'
import { useCarga } from '@/hooks/useCarga'
import { supabase } from '@/services/supabase/client'
import {
  escucharReserva,
  escucharSeguimiento,
  listarActualizaciones,
  listarPuntos,
  obtenerReserva,
} from '@/services/supabase/reservas'
import { ETIQUETAS_ESTADO, SERVICIOS, tituloServicio } from '@/types/dominio'
import type { ActualizacionServicio, Mascota, PerfilPublico, PuntoSeguimiento, Reserva } from '@/types/dominio'
import { formatearDistancia, formatearDuracion, largoRutaKm } from '@/utils/geo'
import AccionesReserva from './AccionesReserva'
import BotonEmergencia from './BotonEmergencia'
import ControlesCuidador from './ControlesCuidador'
import { cargarDetalles, nombreCompleto } from './detallesReserva'
import FeedActualizaciones from './FeedActualizaciones'
import FormularioResena from './FormularioResena'
import { agregarSinDuplicar, formatearRangoFechas, idContraparte, rolEnReserva } from './logicaReservas'
import MapaSeguimiento from './MapaSeguimiento'
import estilo from './SeguimientoPage.module.css'

interface DatosSeguimiento {
  reserva: Reserva
  puntos: PuntoSeguimiento[]
  actualizaciones: ActualizacionServicio[]
  perfiles: Map<string, PerfilPublico>
  mascotas: Map<string, Mascota>
}

const TICK_MS = 30_000

export default function SeguimientoPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { usuario } = useAuth()
  const usuarioId = usuario?.id ?? ''

  const cargar = useCallback(async (): Promise<DatosSeguimiento> => {
    const reserva = await obtenerReserva(id)
    if (!reserva) throw new Error('No encontramos esta reserva o no tienes acceso a ella.')
    const [puntos, actualizaciones, detalles] = await Promise.all([
      listarPuntos(id),
      listarActualizaciones(id),
      cargarDetalles([reserva], usuarioId),
    ])
    return { reserva, puntos, actualizaciones, perfiles: detalles.perfiles, mascotas: detalles.mascotas }
  }, [id, usuarioId])
  const { datos, cargando, error, recargar, establecer } = useCarga(cargar)

  // Tiempo real: puntos, novedades y cambios de estado.
  useEffect(() => {
    if (!id) return
    const canales: RealtimeChannel[] = []
    try {
      canales.push(
        escucharSeguimiento(id, {
          alPunto: (punto) =>
            establecer((previo) => (previo ? { ...previo, puntos: agregarSinDuplicar(previo.puntos, punto) } : previo)),
          alActualizacion: (actualizacion) =>
            establecer((previo) =>
              previo
                ? { ...previo, actualizaciones: agregarSinDuplicar(previo.actualizaciones, actualizacion) }
                : previo,
            ),
        }),
        escucharReserva(id, (reserva) => establecer((previo) => (previo ? { ...previo, reserva } : previo))),
      )
    } catch {
      // Sin Realtime la página sigue funcionando con recargas manuales.
    }
    return () => {
      for (const canal of canales) void supabase.removeChannel(canal)
    }
  }, [id, establecer])

  /** Relee puntos y novedades tras publicar (respaldo si Realtime no llega). */
  const sincronizar = useCallback(() => {
    Promise.all([listarPuntos(id), listarActualizaciones(id)])
      .then(([puntos, actualizaciones]) =>
        establecer((previo) => (previo ? { ...previo, puntos, actualizaciones } : previo)),
      )
      .catch(() => {
        // Silencioso: los datos ya visibles siguen siendo válidos.
      })
  }, [id, establecer])

  const actualizarReserva = useCallback(
    (reserva: Reserva) => establecer((previo) => (previo ? { ...previo, reserva } : previo)),
    [establecer],
  )

  const enCurso = datos?.reserva.estado === 'en_curso'
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    if (!enCurso) return
    const temporizador = setInterval(() => setAhora(Date.now()), TICK_MS)
    return () => clearInterval(temporizador)
  }, [enCurso])

  if (!usuario) return null

  return (
    <div className={estilo.pagina}>
      <Link to="/reservas" className={estilo.volver}>
        ← Mis reservas
      </Link>
      <EstadoVista cargando={cargando} error={error} alReintentar={recargar} etiquetaCarga="Cargando seguimiento…">
        {datos && (
          <ContenidoSeguimiento
            datos={datos}
            usuarioId={usuario.id}
            ahora={ahora}
            alCambiarReserva={actualizarReserva}
            alPublicar={sincronizar}
          />
        )}
      </EstadoVista>
    </div>
  )
}

interface ContenidoProps {
  datos: DatosSeguimiento
  usuarioId: string
  ahora: number
  alCambiarReserva: (reserva: Reserva) => void
  alPublicar: () => void
}

function ContenidoSeguimiento({ datos, usuarioId, ahora, alCambiarReserva, alPublicar }: ContenidoProps) {
  const { reserva, puntos, actualizaciones } = datos
  const rol = rolEnReserva(reserva, usuarioId)
  if (!rol) {
    return (
      <p className={estilo.aviso} role="alert">
        No participas en esta reserva.
      </p>
    )
  }

  const otro = datos.perfiles.get(idContraparte(reserva, rol))
  const mascota = datos.mascotas.get(reserva.mascotaId)
  const icono = SERVICIOS.find((s) => s.valor === reserva.servicio)?.icono ?? '🐾'
  const distancia = formatearDistancia(largoRutaKm(puntos))
  const fotos = actualizaciones.filter((a) => a.tipo === 'foto').length
  const duracion = reserva.iniciadoEn
    ? formatearDuracion(
        (reserva.finalizadoEn ? new Date(reserva.finalizadoEn).getTime() : ahora) - new Date(reserva.iniciadoEn).getTime(),
      )
    : '—'
  const esCuidador = rol === 'cuidador'
  const enCurso = reserva.estado === 'en_curso'
  const servicioActivo = reserva.estado === 'aceptada' || enCurso

  return (
    <div className={estilo.contenido}>
      <header className={estilo.cabecera}>
        <span className={estilo.icono} aria-hidden="true">
          {icono}
        </span>
        <div className={estilo.titulos}>
          <h1 className={estilo.titulo}>
            {tituloServicio(reserva.servicio)}
            {mascota ? ` de ${mascota.nombre}` : ''}
          </h1>
          <p className={estilo.subtitulo}>
            {esCuidador ? 'Dueño' : 'Cuidador'}: {nombreCompleto(otro, esCuidador ? 'Dueño' : 'Cuidador')} ·{' '}
            {formatearRangoFechas(reserva.inicio, reserva.fin)}
          </p>
        </div>
        <span className={estilo.estado} data-estado={reserva.estado}>
          {enCurso && <span className={estilo.pulso} aria-hidden="true" />}
          {ETIQUETAS_ESTADO[reserva.estado]}
        </span>
      </header>

      <MapaSeguimiento puntos={puntos} />

      <dl className={estilo.metricas} aria-label="Métricas del servicio">
        <div className={estilo.metrica}>
          <dt>Distancia</dt>
          <dd>{distancia}</dd>
        </div>
        <div className={estilo.metrica}>
          <dt>Duración</dt>
          <dd>{duracion}</dd>
        </div>
        <div className={estilo.metrica}>
          <dt>Fotos</dt>
          <dd>{fotos}</dd>
        </div>
        <div className={estilo.metrica}>
          <dt>Estado</dt>
          <dd>{ETIQUETAS_ESTADO[reserva.estado]}</dd>
        </div>
      </dl>

      {!esCuidador && servicioActivo && (
        <BotonEmergencia reservaId={reserva.id} cuidadorId={reserva.cuidadorId} alPublicar={alPublicar} />
      )}

      {esCuidador && enCurso && (
        <ControlesCuidador reservaId={reserva.id} usuarioId={usuarioId} alPublicar={alPublicar} />
      )}

      <AccionesReserva reserva={reserva} rol={rol} alCambiar={alCambiarReserva} tamanio="mediano" />

      <section className={estilo.seccion} aria-labelledby="titulo-novedades">
        <h2 id="titulo-novedades" className={estilo.tituloSeccion}>
          Novedades del servicio
        </h2>
        <FeedActualizaciones actualizaciones={actualizaciones} />
      </section>

      {!esCuidador && reserva.estado === 'completada' && <FormularioResena reserva={reserva} />}
    </div>
  )
}

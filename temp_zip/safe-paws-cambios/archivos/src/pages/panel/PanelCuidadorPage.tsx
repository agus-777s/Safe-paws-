import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Button from '@/components/ui/Button'
import EstadoVista from '@/components/ui/EstadoVista'
import { useAuth } from '@/hooks/useAuth'
import { useCarga } from '@/hooks/useCarga'
import { obtenerMiPerfilCuidador, obtenerResumenCuidador } from '@/services/supabase/cuidadores'
import { listarMisReservas } from '@/services/supabase/reservas'
import type { PerfilCuidador, Reserva, ResumenCuidador } from '@/types/dominio'
import { formatearClp } from '@/utils/precios'
import { cargarDetalles } from '@/pages/reservas/detallesReserva'
import type { ReservasConDetalles } from '@/pages/reservas/detallesReserva'
import { ocurreHoy } from '@/pages/reservas/logicaReservas'
import TarjetaReserva from '@/pages/reservas/TarjetaReserva'
import estilo from './PanelCuidadorPage.module.css'

type DatosPanel =
  | { perfil: null }
  | { perfil: PerfilCuidador; resumen: ResumenCuidador; detalles: ReservasConDetalles }

function avisoDesdeEstado(estado: unknown): string | null {
  if (estado && typeof estado === 'object' && 'aviso' in estado && typeof estado.aviso === 'string') return estado.aviso
  return null
}

export default function PanelCuidadorPage() {
  const { usuario } = useAuth()
  const usuarioId = usuario?.id ?? ''
  const aviso = avisoDesdeEstado(useLocation().state)
  const [ahora] = useState(() => new Date())

  const cargar = useCallback(async (): Promise<DatosPanel> => {
    const perfil = await obtenerMiPerfilCuidador(usuarioId)
    if (!perfil) return { perfil: null }
    const [resumen, detalles] = await Promise.all([
      obtenerResumenCuidador(),
      listarMisReservas().then((reservas) =>
        cargarDetalles(
          reservas.filter((r) => r.cuidadorId === usuarioId),
          usuarioId,
        ),
      ),
    ])
    return { perfil, resumen, detalles }
  }, [usuarioId])
  const { datos, cargando, error, recargar, establecer } = useCarga(cargar)

  const actualizarReserva = useCallback(
    (actualizada: Reserva) => {
      establecer((previo) =>
        previo?.perfil
          ? {
              ...previo,
              detalles: {
                ...previo.detalles,
                reservas: previo.detalles.reservas.map((r) => (r.id === actualizada.id ? actualizada : r)),
              },
            }
          : previo,
      )
      obtenerResumenCuidador()
        .then((resumen) => establecer((previo) => (previo?.perfil ? { ...previo, resumen } : previo)))
        .catch(() => {
          // Las métricas se actualizarán en la próxima carga.
        })
    },
    [establecer],
  )

  const listas = useMemo(() => {
    const reservas = datos?.perfil ? datos.detalles.reservas : []
    const porInicio = (a: Reserva, b: Reserva) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
    return {
      hoy: reservas
        .filter((r) => (r.estado === 'aceptada' || r.estado === 'en_curso') && ocurreHoy(r, ahora))
        .sort(porInicio),
      pendientes: reservas.filter((r) => r.estado === 'pendiente').sort(porInicio),
    }
  }, [datos, ahora])

  if (!usuario) return null

  return (
    <div className={estilo.pagina}>
      <header className={estilo.cabecera}>
        <div>
          <h1 className={estilo.titulo}>Mi panel</h1>
          <p className={estilo.subtitulo}>Tus tareas, solicitudes y ganancias como cuidador.</p>
        </div>
        {datos?.perfil && (
          <Button variante="secundario" tamanio="pequeno" enlace="/panel/perfil">
            Editar perfil
          </Button>
        )}
      </header>

      {aviso && (
        <p className={estilo.aviso} role="status">
          ✅ {aviso}
        </p>
      )}

      <EstadoVista
        cargando={cargando}
        error={error}
        alReintentar={recargar}
        etiquetaCarga="Cargando tu panel…"
        vacio={datos?.perfil === null}
        mensajeVacio="Aún no tienes perfil de cuidador. Créalo para empezar a recibir solicitudes."
        accionVacio={<Button enlace="/panel/perfil">Crear perfil de cuidador</Button>}
      >
        {datos?.perfil && (
          <>
            {(!datos.perfil.verificado || !datos.perfil.activo) && (
              <div className={estilo.chips}>
                {!datos.perfil.verificado && <span className={estilo.chipAviso}>⏳ Verificación pendiente</span>}
                {!datos.perfil.activo && (
                  <span className={estilo.chipAviso}>👁️‍🗨️ Perfil oculto en el buscador</span>
                )}
              </div>
            )}

            <dl className={estilo.metricas} aria-label="Resumen">
              <Metrica titulo="Ganancias del mes" valor={formatearClp(datos.resumen.gananciasMes)} destacada />
              <Metrica titulo="Ganancias totales" valor={formatearClp(datos.resumen.gananciasTotal)} />
              <Metrica titulo="Servicios completados" valor={String(datos.resumen.serviciosCompletados)} />
              <Metrica titulo="Solicitudes pendientes" valor={String(datos.resumen.solicitudesPendientes)} />
              <Metrica titulo="Próximos servicios" valor={String(datos.resumen.proximosServicios)} />
              <Metrica
                titulo="Calificación"
                valor={
                  datos.resumen.totalResenas > 0
                    ? `⭐ ${datos.resumen.calificacion.toFixed(1).replace('.', ',')}`
                    : '⭐ —'
                }
                detalle={`${datos.resumen.totalResenas} ${datos.resumen.totalResenas === 1 ? 'reseña' : 'reseñas'}`}
              />
            </dl>

            <section className={estilo.seccion} aria-labelledby="titulo-hoy">
              <h2 id="titulo-hoy" className={estilo.tituloSeccion}>
                Tareas de hoy
              </h2>
              {listas.hoy.length === 0 ? (
                <p className={estilo.vacio}>No tienes servicios programados para hoy. ¡Disfruta el día! 🐾</p>
              ) : (
                <div className={estilo.lista}>
                  {listas.hoy.map((reserva) => (
                    <TarjetaReserva
                      key={reserva.id}
                      reserva={reserva}
                      rol="cuidador"
                      contraparte={datos.detalles.perfiles.get(reserva.duenoId)}
                      mascota={datos.detalles.mascotas.get(reserva.mascotaId)}
                      alCambiar={actualizarReserva}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className={estilo.seccion} aria-labelledby="titulo-pendientes">
              <h2 id="titulo-pendientes" className={estilo.tituloSeccion}>
                Solicitudes pendientes
              </h2>
              {listas.pendientes.length === 0 ? (
                <p className={estilo.vacio}>No tienes solicitudes por responder.</p>
              ) : (
                <div className={estilo.lista}>
                  {listas.pendientes.map((reserva) => (
                    <TarjetaReserva
                      key={reserva.id}
                      reserva={reserva}
                      rol="cuidador"
                      contraparte={datos.detalles.perfiles.get(reserva.duenoId)}
                      mascota={datos.detalles.mascotas.get(reserva.mascotaId)}
                      alCambiar={actualizarReserva}
                    />
                  ))}
                </div>
              )}
            </section>

            <Button variante="fantasma" enlace="/reservas">
              Ver todas mis reservas →
            </Button>
          </>
        )}
      </EstadoVista>
    </div>
  )
}

function Metrica({
  titulo,
  valor,
  detalle,
  destacada,
}: {
  titulo: string
  valor: string
  detalle?: string
  destacada?: boolean
}) {
  return (
    <div className={destacada ? `${estilo.metrica} ${estilo.metricaDestacada}` : estilo.metrica}>
      <dt>{titulo}</dt>
      <dd>
        {valor}
        {detalle && <span className={estilo.detalle}>{detalle}</span>}
      </dd>
    </div>
  )
}

import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import CampoSeleccion from '@/components/ui/CampoSeleccion'
import EstadoVista from '@/components/ui/EstadoVista'
import { useAuth } from '@/hooks/useAuth'
import { useCarga } from '@/hooks/useCarga'
import { obtenerCuidadorPublico } from '@/services/supabase/cuidadores'
import { listarMascotas } from '@/services/supabase/mascotas'
import { crearReserva } from '@/services/supabase/reservas'
import { SERVICIOS } from '@/types/dominio'
import type { CuidadorPublico, Mascota, Servicio } from '@/types/dominio'
import { ICONOS_TIPO_MASCOTA } from '@/types/perfil'
import { clases } from '@/utils/clases'
import { mensajeError } from '@/utils/errores'
import { calcularPrecio, formatearClp, unidadesCobrables } from '@/utils/precios'
import { exigirConexion, nombreCompleto, serviciosConPrecio } from '@/pages/explorar/cuidadoresVista'
import Calendario from './Calendario'
import { fechaConHora, horariosDisponibles, intervaloReserva, mismoDia, siguienteRango } from './fechas'
import type { RangoFechas } from './fechas'
import estilo from './ReservarPage.module.css'

const DURACIONES: Partial<Record<Servicio, number[]>> = {
  paseo: [30, 45, 60, 90],
  visita: [30, 60],
}

const ETIQUETA_UNIDAD: Record<Servicio, [string, string]> = {
  paseo: ['paseo', 'paseos'],
  hospedaje: ['noche', 'noches'],
  guarderia: ['día', 'días'],
  visita: ['visita', 'visitas'],
}

const formatoFechaHora = new Intl.DateTimeFormat('es-CL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const RANGO_VACIO: RangoFechas = { inicio: null, fin: null }

export default function ReservarPage() {
  const { cuidadorId = '' } = useParams<{ cuidadorId: string }>()
  const { usuario } = useAuth()
  const idUsuario = usuario?.id ?? null

  const cargar = useCallback(async () => {
    exigirConexion()
    if (!idUsuario) throw new Error('Inicia sesión para reservar.')
    const [cuidador, mascotas] = await Promise.all([obtenerCuidadorPublico(cuidadorId), listarMascotas(idUsuario)])
    return { cuidador, mascotas }
  }, [cuidadorId, idUsuario])
  const { datos, cargando, error, recargar } = useCarga(cargar)

  if (!idUsuario) {
    return (
      <div className={clases('contenedor', estilo.pagina)}>
        <EstadoVista
          cargando={false}
          error={null}
          vacio
          mensajeVacio="Inicia sesión para reservar un servicio."
          accionVacio={<Button enlace="/iniciar-sesion">Iniciar sesión</Button>}
        >
          {null}
        </EstadoVista>
      </div>
    )
  }

  const cuidador = datos?.cuidador ?? null
  return (
    <div className={clases('contenedor', estilo.pagina)}>
      <Link to={`/cuidadores/${cuidadorId}`} className={estilo.volver}>
        ← Volver al perfil
      </Link>
      <EstadoVista
        cargando={cargando}
        error={error}
        alReintentar={recargar}
        etiquetaCarga="Preparando tu reserva…"
        vacio={!cuidador}
        mensajeVacio="Este cuidador no existe o ya no está disponible."
        accionVacio={
          <Button variante="secundario" enlace="/explorar">
            Buscar otro cuidador
          </Button>
        }
      >
        {cuidador && datos &&
          (cuidador.id === idUsuario ? (
            <EstadoVista
              cargando={false}
              error={null}
              vacio
              mensajeVacio="No puedes reservar tus propios servicios."
              accionVacio={
                <Button variante="secundario" enlace="/panel/perfil">
                  Editar mi perfil
                </Button>
              }
            >
              {null}
            </EstadoVista>
          ) : (
            <FormularioReserva cuidador={cuidador} mascotas={datos.mascotas} duenoId={idUsuario} />
          ))}
      </EstadoVista>
    </div>
  )
}

interface FormularioReservaProps {
  cuidador: CuidadorPublico
  mascotas: Mascota[]
  duenoId: string
}

function FormularioReserva({ cuidador, mascotas, duenoId }: FormularioReservaProps) {
  const navigate = useNavigate()
  const disponibles = serviciosConPrecio(cuidador)
  const [servicioElegido, setServicioElegido] = useState<Servicio | null>(null)
  const [mascotaElegida, setMascotaElegida] = useState<string | null>(null)
  const [rango, setRango] = useState<RangoFechas>(RANGO_VACIO)
  const [hora, setHora] = useState('')
  const [duracionElegida, setDuracionElegida] = useState<number | null>(null)
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [ahora] = useState(() => new Date())

  const servicio = servicioElegido ?? disponibles[0] ?? null
  const mascotaId = mascotaElegida ?? mascotas[0]?.id ?? ''
  const duraciones = servicio ? (DURACIONES[servicio] ?? []) : []
  const duracion = duracionElegida != null && duraciones.includes(duracionElegida) ? duracionElegida : (duraciones[0] ?? 0)
  const esRango = servicio === 'hospedaje' || servicio === 'guarderia'
  const precioUnitario = servicio ? cuidador.precios[servicio] : null

  const horarios =
    rango.inicio && !esRango
      ? horariosDisponibles(cuidador.horaInicio, cuidador.horaFin, duracion).filter(
          (h) => rango.inicio && fechaConHora(rango.inicio, h) > ahora,
        )
      : []
  const horaValida = horarios.includes(hora) ? hora : ''

  const intervalo = servicio
    ? intervaloReserva({
        servicio,
        rango,
        hora: horaValida,
        duracionMin: duracion,
        horaInicio: cuidador.horaInicio,
        horaFin: cuidador.horaFin,
        diasLaborales: cuidador.dias,
        ahora,
      })
    : null

  function elegirServicio(s: Servicio) {
    if (s === servicio) return
    setServicioElegido(s)
    setRango(RANGO_VACIO)
    setHora('')
    setDuracionElegida(null)
  }

  function elegirDia(dia: Date) {
    if (esRango) setRango((actual) => siguienteRango(actual, dia, servicio === 'guarderia'))
    else setRango({ inicio: dia, fin: null })
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!servicio || !mascotaId || !intervalo?.ok) return
    setEnviando(true)
    setErrorEnvio(null)
    try {
      const reserva = await crearReserva(duenoId, {
        cuidadorId: cuidador.id,
        mascotaId,
        servicio,
        inicio: intervalo.inicio,
        fin: intervalo.fin,
        notas,
      })
      navigate(`/reservas/${reserva.id}`)
    } catch (e: unknown) {
      setErrorEnvio(mensajeError(e))
      setEnviando(false)
    }
  }

  if (disponibles.length === 0) {
    return (
      <EstadoVista
        cargando={false}
        error={null}
        vacio
        mensajeVacio={`${cuidador.nombre} aún no publica servicios con precio. Escríbele para coordinar.`}
        accionVacio={
          <Button variante="secundario" enlace={`/cuidadores/${cuidador.id}`}>
            Ver perfil
          </Button>
        }
      >
        {null}
      </EstadoVista>
    )
  }

  const unidades = intervalo?.ok && servicio ? unidadesCobrables(servicio, intervalo.inicio, intervalo.fin) : 0
  const total = intervalo?.ok && servicio ? calcularPrecio(servicio, intervalo.inicio, intervalo.fin, precioUnitario) : 0
  const [singular, plural] = servicio ? ETIQUETA_UNIDAD[servicio] : ['', '']
  const puedeEnviar = Boolean(servicio && mascotaId && intervalo?.ok) && !enviando

  return (
    <form className={estilo.rejilla} onSubmit={(e) => void enviar(e)} noValidate>
      <div className={estilo.pasos}>
        <header>
          <p className={estilo.kicker}>Nueva reserva</p>
          <h1 className={estilo.titulo}>Reservar con {nombreCompleto(cuidador)}</h1>
        </header>

        <Card>
          <h2 className={estilo.paso}>
            <span className={estilo.numero}>1</span> Elige el servicio
          </h2>
          <div className={estilo.opciones} role="group" aria-label="Servicio">
            {SERVICIOS.filter((s) => disponibles.includes(s.valor)).map((s) => {
              const activo = s.valor === servicio
              return (
                <button
                  key={s.valor}
                  type="button"
                  className={clases(estilo.opcion, activo && estilo.opcionActiva)}
                  aria-pressed={activo}
                  onClick={() => elegirServicio(s.valor)}
                >
                  <span className={estilo.opcionIcono} aria-hidden="true">
                    {s.icono}
                  </span>
                  <span className={estilo.opcionTitulo}>{s.titulo}</span>
                  <small>
                    {formatearClp(cuidador.precios[s.valor] ?? 0)} {s.unidad}
                  </small>
                </button>
              )
            })}
          </div>
        </Card>

        <Card>
          <h2 className={estilo.paso}>
            <span className={estilo.numero}>2</span> ¿Para quién es?
          </h2>
          {mascotas.length === 0 ? (
            <div className={estilo.vacio}>
              <p>Primero agrega a tu mascota para que el cuidador sepa a quién va a cuidar.</p>
              <Button enlace="/mascotas/nueva" variante="secundario">
                Agregar mascota
              </Button>
            </div>
          ) : (
            <div className={estilo.opciones} role="group" aria-label="Mascota">
              {mascotas.map((m) => {
                const activo = m.id === mascotaId
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={clases(estilo.opcion, activo && estilo.opcionActiva)}
                    aria-pressed={activo}
                    onClick={() => setMascotaElegida(m.id)}
                  >
                    <span className={estilo.opcionIcono} aria-hidden="true">
                      {ICONOS_TIPO_MASCOTA[m.tipo] ?? '🐾'}
                    </span>
                    <span className={estilo.opcionTitulo}>{m.nombre}</span>
                    <small>{m.esGrupo ? `Grupo de ${m.cantidad}` : m.raza || m.tipo}</small>
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className={estilo.paso}>
            <span className={estilo.numero}>3</span>{' '}
            {servicio === 'hospedaje'
              ? 'Elige llegada y salida'
              : servicio === 'guarderia'
                ? 'Elige el día o los días'
                : 'Elige fecha y hora'}
          </h2>
          <p className={estilo.ayuda}>
            {servicio === 'hospedaje'
              ? `Toca el día de llegada y luego el de salida. Entrega y retiro a las ${cuidador.horaInicio}.`
              : servicio === 'guarderia'
                ? `Toca el primer día y, si son varios, el último. Horario ${cuidador.horaInicio}–${cuidador.horaFin}.`
                : `El cuidador atiende de ${cuidador.horaInicio} a ${cuidador.horaFin}.`}
          </p>
          <div className={estilo.fecha}>
            <Calendario
              key={servicio ?? 'sin-servicio'}
              modo={esRango ? 'rango' : 'dia'}
              seleccion={rango}
              alElegirDia={elegirDia}
              diaDeshabilitado={(dia) => !cuidador.dias.includes(dia.getDay())}
            />
            {!esRango && servicio && (
              <div className={estilo.horas}>
                <CampoSeleccion
                  etiqueta="Duración"
                  valor={String(duracion)}
                  alCambiar={(v) => setDuracionElegida(Number(v))}
                  opciones={duraciones.map((d) => ({ valor: String(d), texto: `${d} minutos` }))}
                />
                <CampoSeleccion
                  etiqueta="Hora de inicio"
                  valor={horaValida}
                  alCambiar={setHora}
                  disabled={!rango.inicio || horarios.length === 0}
                  opciones={[
                    {
                      valor: '',
                      texto: !rango.inicio
                        ? 'Primero elige una fecha'
                        : horarios.length === 0
                          ? 'Sin horarios ese día'
                          : 'Elige una hora',
                    },
                    ...horarios.map((h) => ({ valor: h, texto: h })),
                  ]}
                />
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className={estilo.paso}>
            <span className={estilo.numero}>4</span> Indicaciones para el cuidador
          </h2>
          <label className={estilo.etiqueta} htmlFor="notas-reserva">
            Notas (opcional)
          </label>
          <textarea
            id="notas-reserva"
            className={estilo.notas}
            rows={4}
            maxLength={1000}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Rutina, alimentación, medicamentos, cómo acceder al domicilio…"
          />
        </Card>
      </div>

      <aside className={estilo.lateral}>
        <Card className={estilo.resumen} aria-live="polite">
          <h2 className={estilo.resumenTitulo}>Resumen</h2>
          <dl className={estilo.detalle}>
            <dt>Servicio</dt>
            <dd>{SERVICIOS.find((s) => s.valor === servicio)?.titulo ?? '—'}</dd>
            <dt>Mascota</dt>
            <dd>{mascotas.find((m) => m.id === mascotaId)?.nombre ?? '—'}</dd>
            <dt>Desde</dt>
            <dd>{intervalo?.ok ? formatoFechaHora.format(intervalo.inicio) : '—'}</dd>
            <dt>Hasta</dt>
            <dd>
              {intervalo?.ok
                ? mismoDia(intervalo.inicio, intervalo.fin)
                  ? intervalo.fin.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                  : formatoFechaHora.format(intervalo.fin)
                : '—'}
            </dd>
          </dl>
          {intervalo?.ok && precioUnitario != null ? (
            <>
              <p className={estilo.calculo}>
                {unidades} {unidades === 1 ? singular : plural} × {formatearClp(precioUnitario)}
              </p>
              <p className={estilo.total}>
                <span>Total estimado</span>
                <strong>{formatearClp(total)}</strong>
              </p>
            </>
          ) : (
            rango.inicio && intervalo && !intervalo.ok && <p className={estilo.aviso}>{intervalo.motivo}</p>
          )}
          <p className={estilo.letraChica}>El precio final lo confirma Safe Paws al crear la reserva.</p>
          {errorEnvio && (
            <p className={estilo.error} role="alert">
              {errorEnvio}
            </p>
          )}
          <Button type="submit" tamanio="grande" disabled={!puedeEnviar} className={estilo.enviar}>
            {enviando ? 'Enviando solicitud…' : 'Solicitar reserva'}
          </Button>
          <p className={estilo.letraChica}>Tu solicitud queda pendiente hasta que {cuidador.nombre} la acepte.</p>
        </Card>
      </aside>
    </form>
  )
}

import Button from '@/components/ui/Button'
import { ETIQUETAS_ESTADO, SERVICIOS, tituloServicio } from '@/types/dominio'
import type { Mascota, PerfilPublico, Reserva } from '@/types/dominio'
import { formatearClp } from '@/utils/precios'
import AccionesReserva from './AccionesReserva'
import { iniciales, nombreCompleto } from './detallesReserva'
import { formatearRangoFechas, idContraparte, puedeVerSeguimiento } from './logicaReservas'
import type { RolReserva } from './logicaReservas'
import { useAbrirChat } from './useAbrirChat'
import estilo from './TarjetaReserva.module.css'

interface TarjetaReservaProps {
  reserva: Reserva
  rol: RolReserva
  contraparte: PerfilPublico | undefined
  mascota: Mascota | undefined
  alCambiar: (reserva: Reserva) => void
}

export default function TarjetaReserva({ reserva, rol, contraparte, mascota, alCambiar }: TarjetaReservaProps) {
  const { abrirChat, abriendo, errorChat } = useAbrirChat()
  const icono = SERVICIOS.find((s) => s.valor === reserva.servicio)?.icono ?? '🐾'
  const otroId = idContraparte(reserva, rol)
  const nombreOtro = nombreCompleto(contraparte, rol === 'dueno' ? 'Cuidador' : 'Dueño')
  const titulo = tituloServicio(reserva.servicio)

  return (
    <article className={estilo.tarjeta} aria-label={`${titulo} con ${nombreOtro}`}>
      <header className={estilo.cabecera}>
        <span className={estilo.icono} aria-hidden="true">
          {icono}
        </span>
        <div className={estilo.titulos}>
          <h3 className={estilo.titulo}>{titulo}</h3>
          <p className={estilo.mascota}>{mascota ? `Para ${mascota.nombre}` : 'Mascota'}</p>
        </div>
        <span className={estilo.estado} data-estado={reserva.estado}>
          {ETIQUETAS_ESTADO[reserva.estado]}
        </span>
      </header>

      <div className={estilo.persona}>
        {contraparte?.avatarUrl ? (
          <img className={estilo.avatar} src={contraparte.avatarUrl} alt="" />
        ) : (
          <span className={estilo.avatar} aria-hidden="true">
            {iniciales(contraparte)}
          </span>
        )}
        <div>
          <p className={estilo.rotulo}>{rol === 'dueno' ? 'Cuidador' : 'Dueño'}</p>
          <p className={estilo.nombre}>{nombreOtro}</p>
        </div>
      </div>

      <dl className={estilo.datos}>
        <div>
          <dt>Fecha</dt>
          <dd>{formatearRangoFechas(reserva.inicio, reserva.fin)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd className={estilo.precio}>{formatearClp(reserva.precioTotal)}</dd>
        </div>
      </dl>

      {reserva.notas && <p className={estilo.notas}>“{reserva.notas}”</p>}

      <AccionesReserva reserva={reserva} rol={rol} alCambiar={alCambiar} />

      <div className={estilo.enlaces}>
        {puedeVerSeguimiento(reserva.estado) && (
          <Button variante="secundario" tamanio="pequeno" enlace={`/reservas/${reserva.id}`}>
            Ver seguimiento
          </Button>
        )}
        <Button
          variante="fantasma"
          tamanio="pequeno"
          disabled={abriendo}
          aria-label={`Enviar mensaje a ${nombreOtro}`}
          onClick={() => void abrirChat(otroId)}
        >
          💬 {abriendo ? 'Abriendo…' : 'Mensaje'}
        </Button>
      </div>
      {errorChat && (
        <p className={estilo.error} role="alert">
          {errorChat}
        </p>
      )}
    </article>
  )
}

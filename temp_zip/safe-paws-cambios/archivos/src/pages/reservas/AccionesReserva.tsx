import { useState } from 'react'
import Button from '@/components/ui/Button'
import { cambiarEstadoReserva } from '@/services/supabase/reservas'
import type { Reserva } from '@/types/dominio'
import { mensajeError } from '@/utils/errores'
import { accionesDisponibles } from './logicaReservas'
import type { AccionReserva, RolReserva } from './logicaReservas'
import estilo from './AccionesReserva.module.css'

interface AccionesReservaProps {
  reserva: Reserva
  rol: RolReserva
  alCambiar: (reserva: Reserva) => void
  tamanio?: 'pequeno' | 'mediano'
}

/** Botones de cambio de estado con confirmación en línea para acciones destructivas. */
export default function AccionesReserva({ reserva, rol, alCambiar, tamanio = 'pequeno' }: AccionesReservaProps) {
  const [confirmando, setConfirmando] = useState<AccionReserva | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const acciones = accionesDisponibles(rol, reserva.estado)

  if (acciones.length === 0) return null

  async function ejecutar(accion: AccionReserva) {
    setProcesando(true)
    setError(null)
    try {
      const actualizada = await cambiarEstadoReserva(reserva.id, accion.destino)
      setConfirmando(null)
      alCambiar(actualizada)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setProcesando(false)
    }
  }

  if (confirmando) {
    const verbo = confirmando.destino === 'rechazada' ? 'rechazar' : 'cancelar'
    return (
      <div className={estilo.confirmacion} role="group" aria-label={`Confirmar ${verbo} reserva`}>
        <p className={estilo.pregunta}>¿Seguro que quieres {verbo} esta reserva? No se puede deshacer.</p>
        <div className={estilo.fila}>
          <button
            type="button"
            className={estilo.botonPeligro}
            disabled={procesando}
            onClick={() => void ejecutar(confirmando)}
          >
            {procesando ? 'Procesando…' : `Sí, ${verbo}`}
          </button>
          <Button variante="fantasma" tamanio={tamanio} disabled={procesando} onClick={() => setConfirmando(null)}>
            Volver
          </Button>
        </div>
        {error && (
          <p className={estilo.error} role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={estilo.contenedor}>
      <div className={estilo.fila}>
        {acciones.map((accion) =>
          accion.destructiva ? (
            <Button
              key={accion.destino}
              variante="fantasma"
              tamanio={tamanio}
              className={estilo.textoPeligro}
              disabled={procesando}
              onClick={() => {
                setError(null)
                setConfirmando(accion)
              }}
            >
              {accion.etiqueta}
            </Button>
          ) : (
            <Button
              key={accion.destino}
              variante="primario"
              tamanio={tamanio}
              disabled={procesando}
              onClick={() => void ejecutar(accion)}
            >
              {accion.etiqueta}
            </Button>
          ),
        )}
      </div>
      {error && (
        <p className={estilo.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

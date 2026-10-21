import { useState } from 'react'
import { clases } from '@/utils/clases'
import { inicioDelDia, mismoDia, semanasDelMes } from './fechas'
import type { RangoFechas } from './fechas'
import estilo from './Calendario.module.css'

interface CalendarioProps {
  /** `dia`: una sola fecha; `rango`: inicio → fin. */
  modo: 'dia' | 'rango'
  seleccion: RangoFechas
  alElegirDia: (dia: Date) => void
  diaDeshabilitado: (dia: Date) => boolean
  /** Meses hacia adelante que se pueden navegar (por defecto 12). */
  mesesMaximos?: number
}

const CABECERAS = [
  { corta: 'L', larga: 'Lunes' },
  { corta: 'M', larga: 'Martes' },
  { corta: 'X', larga: 'Miércoles' },
  { corta: 'J', larga: 'Jueves' },
  { corta: 'V', larga: 'Viernes' },
  { corta: 'S', larga: 'Sábado' },
  { corta: 'D', larga: 'Domingo' },
]

const formatoMes = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' })
const formatoDia = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const indiceMes = (fecha: Date) => fecha.getFullYear() * 12 + fecha.getMonth()

export default function Calendario({
  modo,
  seleccion,
  alElegirDia,
  diaDeshabilitado,
  mesesMaximos = 12,
}: CalendarioProps) {
  const [hoy] = useState(() => inicioDelDia(new Date()))
  const [mesVisible, setMesVisible] = useState(() => {
    const base = seleccion.inicio ?? hoy
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const minimo = indiceMes(hoy)
  const actual = indiceMes(mesVisible)
  const puedeRetroceder = actual > minimo
  const puedeAvanzar = actual < minimo + mesesMaximos
  const semanas = semanasDelMes(mesVisible.getFullYear(), mesVisible.getMonth())
  const { inicio, fin } = seleccion

  function mover(delta: number) {
    setMesVisible((mes) => new Date(mes.getFullYear(), mes.getMonth() + delta, 1))
  }

  function estadoDia(dia: Date) {
    const esInicio = inicio != null && mismoDia(dia, inicio)
    const esFin = fin != null && mismoDia(dia, fin)
    const enRango = modo === 'rango' && inicio != null && fin != null && dia > inicio && dia < fin
    return { esInicio, esFin, enRango, seleccionado: esInicio || esFin }
  }

  return (
    <div className={estilo.calendario}>
      <div className={estilo.navegacion}>
        <button
          type="button"
          className={estilo.flecha}
          onClick={() => mover(-1)}
          disabled={!puedeRetroceder}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <p className={estilo.mes} aria-live="polite">
          {formatoMes.format(mesVisible)}
        </p>
        <button
          type="button"
          className={estilo.flecha}
          onClick={() => mover(1)}
          disabled={!puedeAvanzar}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className={estilo.rejilla} role="group" aria-label={`Días de ${formatoMes.format(mesVisible)}`}>
        {CABECERAS.map((c) => (
          <abbr key={c.larga} title={c.larga} className={estilo.cabecera}>
            {c.corta}
          </abbr>
        ))}
        {semanas.flat().map((dia, indice) => {
          if (!dia) return <span key={`vacio-${indice}`} aria-hidden="true" />
          const deshabilitado = dia < hoy || diaDeshabilitado(dia)
          const { esInicio, esFin, enRango, seleccionado } = estadoDia(dia)
          return (
            <button
              key={dia.getTime()}
              type="button"
              className={clases(
                estilo.dia,
                mismoDia(dia, hoy) && estilo.hoy,
                enRango && estilo.enRango,
                seleccionado && estilo.seleccionado,
                modo === 'rango' && esInicio && fin != null && !esFin && estilo.bordeInicio,
                modo === 'rango' && esFin && !esInicio && estilo.bordeFin,
              )}
              disabled={deshabilitado}
              aria-pressed={seleccionado || enRango}
              aria-label={formatoDia.format(dia)}
              onClick={() => alElegirDia(dia)}
            >
              {dia.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

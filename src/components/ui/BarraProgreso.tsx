import { clases } from '@/utils/clases'
import estilo from './BarraProgreso.module.css'

interface BarraProgresoProps {
  pasoActual: number
  totalPasos: number
  etiqueta?: string
}

export default function BarraProgreso({ pasoActual, totalPasos, etiqueta }: BarraProgresoProps) {
  const porcentaje = Math.min(100, Math.max(0, (pasoActual / totalPasos) * 100))

  return (
    <div className={estilo.contenedor}>
      <div className={estilo.fila}>
        <span className={estilo.etiqueta}>{etiqueta ?? `Paso ${pasoActual} de ${totalPasos}`}</span>
        <span className={estilo.porcentaje}>{Math.round(porcentaje)}%</span>
      </div>
      <div
        className={estilo.pista}
        role="progressbar"
        aria-valuenow={pasoActual}
        aria-valuemin={1}
        aria-valuemax={totalPasos}
        aria-label={etiqueta ?? `Paso ${pasoActual} de ${totalPasos}`}
      >
        <div className={clases(estilo.relleno)} style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  )
}

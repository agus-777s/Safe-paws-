import type { ReactNode } from 'react'
import Button from './Button'
import Spinner from './Spinner'
import estilo from './EstadoVista.module.css'

interface EstadoVistaProps {
  cargando: boolean
  error: string | null
  /** Si es true y no hay error ni carga, se muestra el estado vacío. */
  vacio?: boolean
  mensajeVacio?: ReactNode
  accionVacio?: ReactNode
  alReintentar?: () => void
  etiquetaCarga?: string
  children: ReactNode
}

/** Envuelve una vista con sus estados de carga, error y vacío. */
export default function EstadoVista({
  cargando,
  error,
  vacio = false,
  mensajeVacio = 'No hay nada por aquí todavía.',
  accionVacio,
  alReintentar,
  etiquetaCarga = 'Cargando…',
  children,
}: EstadoVistaProps) {
  if (cargando) {
    return (
      <div className={estilo.centro}>
        <Spinner etiqueta={etiquetaCarga} />
      </div>
    )
  }
  if (error) {
    return (
      <div className={estilo.centro} role="alert">
        <p className={estilo.icono} aria-hidden="true">
          ⚠️
        </p>
        <p className={estilo.texto}>{error}</p>
        {alReintentar && (
          <Button variante="secundario" onClick={alReintentar}>
            Reintentar
          </Button>
        )}
      </div>
    )
  }
  if (vacio) {
    return (
      <div className={estilo.centro}>
        <p className={estilo.icono} aria-hidden="true">
          🐾
        </p>
        <p className={estilo.texto}>{mensajeVacio}</p>
        {accionVacio}
      </div>
    )
  }
  return <>{children}</>
}

import { useCallback, useEffect, useState } from 'react'
import { mensajeError } from '@/utils/errores'

export interface EstadoCarga<T> {
  datos: T | null
  cargando: boolean
  error: string | null
  recargar: () => void
  /** Reemplaza los datos en memoria (p. ej. tras una mutación o un evento Realtime). */
  establecer: (actualizar: (previo: T | null) => T | null) => void
}

interface Resultado<T> {
  /** Petición (función + versión) a la que corresponde este resultado. */
  cargar: () => Promise<T>
  version: number
  datos: T | null
  error: string | null
}

/**
 * Carga asíncrona con estados de carga/error y recarga manual.
 * `cargar` debe ser estable (useCallback) o la carga se repetirá en cada render.
 */
export function useCarga<T>(cargar: () => Promise<T>): EstadoCarga<T> {
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState<Resultado<T> | null>(null)

  useEffect(() => {
    let vigente = true
    cargar().then(
      (datos) => {
        if (vigente) setResultado({ cargar, version, datos, error: null })
      },
      (e: unknown) => {
        if (vigente) setResultado((previo) => ({ cargar, version, datos: previo?.datos ?? null, error: mensajeError(e) }))
      },
    )
    return () => {
      vigente = false
    }
  }, [cargar, version])

  // Está cargando mientras el último resultado no corresponde a la petición actual.
  const cargando = !resultado || resultado.cargar !== cargar || resultado.version !== version
  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  const establecer = useCallback(
    (actualizar: (previo: T | null) => T | null) =>
      setResultado((previo) => (previo ? { ...previo, datos: actualizar(previo.datos) } : previo)),
    [],
  )

  return {
    datos: resultado?.datos ?? null,
    cargando,
    error: cargando ? null : (resultado?.error ?? null),
    recargar,
    establecer,
  }
}

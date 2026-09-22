import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { clases } from '@/utils/clases'
import estiloCampo from './CampoTexto.module.css'

interface CampoSeleccionProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'value' | 'onChange'> {
  id?: string
  etiqueta: string
  valor: string
  alCambiar: (valor: string) => void
  opciones: Array<{ valor: string; texto: string }>
  error?: string
  requerido?: boolean
}

export default function CampoSeleccion({
  id,
  etiqueta,
  valor,
  alCambiar,
  opciones,
  error,
  requerido,
  className,
  ...props
}: CampoSeleccionProps) {
  const idGenerado = useId()
  const idEntrada = id ?? idGenerado

  return (
    <div className={clases(estiloCampo.campo, className)}>
      <label className={estiloCampo.etiqueta} htmlFor={idEntrada}>
        {etiqueta}
      </label>
      <select
        id={idEntrada}
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        required={requerido}
        aria-invalid={error ? true : undefined}
        className={clases(estiloCampo.entrada, error && estiloCampo.entradaError)}
        {...props}
      >
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.texto}
          </option>
        ))}
      </select>
      {error && (
        <p className={estiloCampo.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

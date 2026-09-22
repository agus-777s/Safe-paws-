import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { clases } from '@/utils/clases'
import estilo from './CampoTexto.module.css'

interface CampoTextoProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type' | 'value' | 'onChange'> {
  id?: string
  etiqueta: string
  tipo?: 'text' | 'email' | 'password' | 'number' | 'time' | 'tel'
  valor: string
  alCambiar: (valor: string) => void
  error?: string
  requerido?: boolean
}

export default function CampoTexto({
  id,
  etiqueta,
  tipo = 'text',
  valor,
  alCambiar,
  error,
  requerido,
  className,
  ...props
}: CampoTextoProps) {
  const idGenerado = useId()
  const idEntrada = id ?? idGenerado

  return (
    <div className={clases(estilo.campo, className)}>
      <label className={estilo.etiqueta} htmlFor={idEntrada}>
        {etiqueta}
      </label>
      <input
        id={idEntrada}
        type={tipo}
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        required={requerido}
        aria-invalid={error ? true : undefined}
        className={clases(estilo.entrada, error && estilo.entradaError)}
        {...props}
      />
      {error && (
        <p className={estilo.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
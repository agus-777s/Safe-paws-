import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from 'react'
import { clases } from '@/utils/clases'
import estilo from './Button.module.css'

export type VarianteBoton = 'primario' | 'secundario' | 'fantasma'
export type TamanioBoton = 'pequeno' | 'mediano' | 'grande'

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton
  tamanio?: TamanioBoton
  enlace?: string
  children: ReactNode
}

export default function Button({
  variante = 'primario',
  tamanio = 'mediano',
  enlace,
  className,
  children,
  ...props
}: BotonProps) {
  const clasesBoton = clases(
    estilo.boton,
    estilo[`boton--${variante}`],
    estilo[`boton--${tamanio}`],
    className,
  )

  if (enlace) {
    const onClick = props.onClick as MouseEventHandler<HTMLAnchorElement> | undefined
    return (
      <Link to={enlace} className={clasesBoton} onClick={onClick}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" {...props} className={clasesBoton}>
      {children}
    </button>
  )
}
import type { HTMLAttributes, ReactNode } from 'react'
import { clases } from '@/utils/clases'
import estilo from './Card.module.css'

interface TarjetaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export default function Card({ className, children, ...props }: TarjetaProps) {
  return (
    <div className={clases(estilo.tarjeta, className)} {...props}>
      {children}
    </div>
  )
}
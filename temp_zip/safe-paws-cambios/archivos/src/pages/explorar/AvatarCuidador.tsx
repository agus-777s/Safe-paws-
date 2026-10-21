import { clases } from '@/utils/clases'
import { iniciales } from './cuidadoresVista'
import estilo from './AvatarCuidador.module.css'

interface AvatarCuidadorProps {
  nombre: string
  apellido: string
  avatarUrl: string | null
  tamanio?: 'mediano' | 'grande'
}

export default function AvatarCuidador({ nombre, apellido, avatarUrl, tamanio = 'mediano' }: AvatarCuidadorProps) {
  const clase = clases(estilo.avatar, tamanio === 'grande' && estilo.grande)
  if (avatarUrl) return <img className={clase} src={avatarUrl} alt="" loading="lazy" />
  return (
    <span className={clase} aria-hidden="true">
      {iniciales(nombre, apellido)}
    </span>
  )
}

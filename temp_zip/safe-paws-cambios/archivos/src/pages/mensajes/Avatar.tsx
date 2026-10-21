import type { PerfilPublico } from '@/types/dominio'
import { clases } from '@/utils/clases'
import { iniciales } from './logicaChat'
import estilo from './Avatar.module.css'

interface AvatarProps {
  perfil: Pick<PerfilPublico, 'nombre' | 'apellido' | 'avatarUrl'> | null | undefined
  tamanio?: 'pequeno' | 'mediano'
}

/** Foto de la persona o sus iniciales si no tiene foto. */
export default function Avatar({ perfil, tamanio = 'mediano' }: AvatarProps) {
  return (
    <span className={clases(estilo.avatar, estilo[tamanio])} aria-hidden="true">
      {perfil?.avatarUrl ? <img src={perfil.avatarUrl} alt="" loading="lazy" /> : iniciales(perfil)}
    </span>
  )
}

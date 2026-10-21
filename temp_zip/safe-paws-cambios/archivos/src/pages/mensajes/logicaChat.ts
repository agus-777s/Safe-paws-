import type { Mensaje, PerfilPublico } from '@/types/dominio'

/** Agrega un mensaje sin duplicar (por id) y mantiene el orden cronológico. */
export function agregarMensaje(lista: Mensaje[], mensaje: Mensaje): Mensaje[] {
  const indice = lista.findIndex((m) => m.id === mensaje.id)
  if (indice >= 0) {
    const copia = [...lista]
    copia[indice] = { ...copia[indice], ...mensaje }
    return copia
  }
  const nueva = [...lista, mensaje]
  if (lista.length > 0 && lista[lista.length - 1].creadoEn > mensaje.creadoEn) {
    nueva.sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
  }
  return nueva
}

/** Id del último mensaje mío que la otra persona ya leyó (para mostrar "Leído"). */
export function ultimoLeidoPropio(lista: Mensaje[], miId: string): string | null {
  for (let i = lista.length - 1; i >= 0; i--) {
    const mensaje = lista[i]
    if (mensaje.autorId === miId && mensaje.leidoEn) return mensaje.id
  }
  return null
}

export function nombreCompleto(perfil: Pick<PerfilPublico, 'nombre' | 'apellido'> | null | undefined): string {
  if (!perfil) return 'Usuario de Safe Paws'
  return `${perfil.nombre} ${perfil.apellido}`.trim() || 'Usuario de Safe Paws'
}

export function iniciales(perfil: Pick<PerfilPublico, 'nombre' | 'apellido'> | null | undefined): string {
  if (!perfil) return '?'
  const letras = `${perfil.nombre.trim().charAt(0)}${perfil.apellido.trim().charAt(0)}`.toUpperCase()
  return letras || '?'
}

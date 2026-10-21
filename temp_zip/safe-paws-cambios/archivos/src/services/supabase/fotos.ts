import { supabase } from './client'

const BUCKET = 'fotos'
const LADO_MAXIMO = 1280

/** Reduce la imagen en el navegador antes de subirla (ahorra datos móviles). */
async function reducirImagen(archivo: File): Promise<Blob> {
  if (!archivo.type.startsWith('image/') || typeof createImageBitmap === 'undefined') return archivo
  try {
    const mapa = await createImageBitmap(archivo)
    const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height))
    if (escala === 1 && archivo.size < 1_000_000) return archivo
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.round(mapa.width * escala)
    lienzo.height = Math.round(mapa.height * escala)
    lienzo.getContext('2d')?.drawImage(mapa, 0, 0, lienzo.width, lienzo.height)
    return await new Promise<Blob>((resolver) =>
      lienzo.toBlob((blob) => resolver(blob ?? archivo), 'image/jpeg', 0.85),
    )
  } catch {
    return archivo
  }
}

/**
 * Sube una foto a `fotos/<usuario>/<carpeta>/<uuid>.jpg` y devuelve su URL pública.
 * La política de Storage solo permite escribir en la carpeta del propio usuario.
 */
export async function subirFoto(usuarioId: string, carpeta: string, archivo: File): Promise<string> {
  const contenido = await reducirImagen(archivo)
  const tipo = contenido.type || 'image/jpeg'
  const extension = tipo === 'image/png' ? 'png' : tipo === 'image/webp' ? 'webp' : 'jpg'
  const ruta = `${usuarioId}/${carpeta}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, contenido, { contentType: tipo, upsert: false })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl
}

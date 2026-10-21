/** Geocodificación con Nominatim (OpenStreetMap), limitada a Chile. */

export const SANTIAGO = { lat: -33.4489, lng: -70.6693 }

function etiquetaCorta(direccion: Record<string, string | undefined>, lat: number, lng: number) {
  const comuna =
    direccion.suburb ?? direccion.neighbourhood ?? direccion.city_district ?? direccion.city ?? direccion.town ?? direccion.village
  const ciudad = direccion.city ?? direccion.town ?? direccion.state
  if (comuna && ciudad && comuna !== ciudad) return `${comuna}, ${ciudad}`
  if (comuna) return comuna
  if (ciudad) return ciudad
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

export async function geocodificarInverso(lat: number, lng: number): Promise<string> {
  try {
    const respuesta = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es&zoom=14`,
    )
    if (!respuesta.ok) throw new Error('sin respuesta')
    const datos = (await respuesta.json()) as { address?: Record<string, string | undefined> }
    if (!datos.address) throw new Error('sin dirección')
    return etiquetaCorta(datos.address, lat, lng)
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}

/** Busca una comuna/dirección dentro de Chile y devuelve sus coordenadas. */
export async function geocodificarTexto(texto: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const respuesta = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(texto)}&countrycodes=cl&limit=1&accept-language=es`,
    )
    if (!respuesta.ok) return null
    const datos = (await respuesta.json()) as Array<{ lat: string; lon: string }>
    if (datos.length === 0) return null
    return { lat: Number(datos[0].lat), lng: Number(datos[0].lon) }
  } catch {
    return null
  }
}

/**
 * Geocodificación REAL con Nominatim (OpenStreetMap).
 * Sin API key, sin datos hardcodeados, sin lista limitada.
 * https://nominatim.org/release-docs/develop/api/Search/
 */

export interface ResultadoDireccion {
  /** id estable de Nominatim: `${source}:${osm_id}` o place_id */
  id: string
  /** Dirección completa real devuelta por Nominatim (display_name). */
  direccionCompleta: string
  /** Etiqueta corta para mostrar en el mapa (calle + comuna/ciudad). */
  nombreCorto: string
  lat: number
  lng: number
  tipo: string
}

interface NominatimItem {
  place_id: number
  osm_type?: string
  osm_id?: number
  lat: string
  lon: string
  display_name: string
  type?: string
  class?: string
  address?: Record<string, string | undefined>
}

interface NominatimReverse {
  display_name?: string
  address?: Record<string, string | undefined>
}

const BASE = 'https://nominatim.openstreetmap.org'

function etiquetaCorta(address: Record<string, string | undefined> | undefined, displayName: string): string {
  if (!address) {
    // Usa los 2 primeros componentes del display_name como fallback real.
    const partes = displayName.split(',').map((p) => p.trim()).filter(Boolean)
    return partes.slice(0, 2).join(', ') || displayName
  }
  const calle = address.road ?? address.pedestrian ?? address.footway ?? address.cycleway ?? address.amenity
  const numero = address.house_number ? ` ${address.house_number}` : ''
  const comuna =
    address.suburb ?? address.neighbourhood ?? address.city_district ?? address.quarter ?? address.city ?? address.town ?? address.village
  const ciudad = address.city ?? address.town ?? address.state

  if (calle && comuna) return `${calle}${numero}, ${comuna}`
  if (calle && ciudad) return `${calle}${numero}, ${ciudad}`
  if (comuna && ciudad && comuna !== ciudad) return `${comuna}, ${ciudad}`
  if (comuna) return numero ? `${comuna}${numero}` : comuna
  const partes = displayName.split(',').map((p) => p.trim()).filter(Boolean)
  return partes.slice(0, 2).join(', ') || displayName
}

function mapear(item: NominatimItem): ResultadoDireccion | null {
  const lat = Number(item.lat)
  const lng = Number(item.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !item.display_name) return null
  return {
    id: `${item.osm_type ?? 'place'}:${item.osm_id ?? item.place_id}`,
    direccionCompleta: item.display_name,
    nombreCorto: etiquetaCorta(item.address, item.display_name),
    lat,
    lng,
    tipo: item.type ?? item.class ?? 'lugar',
  }
}

async function buscar(url: string, signal?: AbortSignal): Promise<ResultadoDireccion[]> {
  const respuesta = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!respuesta.ok) throw new Error(`Error de búsqueda (${respuesta.status}). Intenta de nuevo.`)
  const datos = (await respuesta.json()) as NominatimItem[]
  if (!Array.isArray(datos)) throw new Error('Respuesta inesperada del servicio de mapas.')
  return datos.map(mapear).filter((r): r is ResultadoDireccion => r !== null)
}

/**
 * Busca direcciones REALES. Chile y mundo en paralelo: más rápido y con
 * fallback real (si la búsqueda acotada a Chile falla o trae poco,
 * igual se muestran los resultados mundiales).
 */
export async function buscarDirecciones(consulta: string, signal?: AbortSignal): Promise<ResultadoDireccion[]> {
  const q = consulta.trim()
  if (q.length < 3) return []

  const comun = `format=jsonv2&addressdetails=1&accept-language=es&limit=8&q=${encodeURIComponent(q)}`
  const [enChile, global] = await Promise.all([
    // 1) Chile primero (casos: "Vicuña Mackenna 1234", "Providencia", etc.)
    buscar(`${BASE}/search?${comun}&countrycodes=cl`, signal).catch(
      (): ResultadoDireccion[] => [],
    ),
    // 2) Mundo en paralelo (permite "Buenos Aires", "Madrid", etc.)
    buscar(`${BASE}/search?${comun}`, signal).catch((): ResultadoDireccion[] => []),
  ])
  if (signal?.aborted) throw new DOMException('Búsqueda cancelada', 'AbortError')
  const vistos = new Set<string>()
  const combinados: ResultadoDireccion[] = []
  for (const r of [...enChile, ...global]) {
    if (!vistos.has(r.id)) {
      vistos.add(r.id)
      combinados.push(r)
    }
    if (combinados.length >= 8) break
  }
  return combinados
}

/** Geocodificación inversa REAL: convierte lat/lng en dirección real. */
export async function geocodificacionInversa(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<{ direccion: string; direccionCompleta: string }> {
  const respuesta = await fetch(
    `${BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es&zoom=18&addressdetails=1`,
    { signal, headers: { Accept: 'application/json' } },
  )
  if (!respuesta.ok) throw new Error('No se pudo obtener la dirección de esa ubicación.')
  const datos = (await respuesta.json()) as NominatimReverse
  if (!datos.display_name) throw new Error('Sin dirección para esas coordenadas.')
  return {
    direccionCompleta: datos.display_name,
    direccion: etiquetaCorta(datos.address, datos.display_name),
  }
}

/** Compatibilidad con código existente: devuelve el primer resultado real. */
export async function geocodificarTexto(texto: string): Promise<{ lat: number; lng: number } | null> {
  const resultados = await buscarDirecciones(texto)
  if (resultados.length === 0) return null
  return { lat: resultados[0].lat, lng: resultados[0].lng }
}

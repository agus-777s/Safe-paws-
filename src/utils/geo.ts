export interface Coordenada {
  latitud: number
  longitud: number
}

const RADIO_TIERRA_KM = 6371

const aRadianes = (grados: number) => (grados * Math.PI) / 180

/** Distancia en km entre dos puntos (fórmula del haversine). */
export function distanciaKm(a: Coordenada, b: Coordenada): number {
  const dLat = aRadianes(b.latitud - a.latitud)
  const dLng = aRadianes(b.longitud - a.longitud)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aRadianes(a.latitud)) * Math.cos(aRadianes(b.latitud)) * Math.sin(dLng / 2) ** 2
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Largo total de una ruta en km. */
export function largoRutaKm(puntos: Coordenada[]): number {
  let total = 0
  for (let i = 1; i < puntos.length; i++) total += distanciaKm(puntos[i - 1], puntos[i])
  return total
}

export function formatearDistancia(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`
}

/** Duración legible: "1 h 05 min", "12 min". */
export function formatearDuracion(milisegundos: number): string {
  const minutos = Math.max(0, Math.round(milisegundos / 60000))
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return horas > 0 ? `${horas} h ${String(resto).padStart(2, '0')} min` : `${resto} min`
}

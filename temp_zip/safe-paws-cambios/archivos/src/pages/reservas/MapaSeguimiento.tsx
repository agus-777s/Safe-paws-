import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { SANTIAGO } from '@/components/mapa/geocodificacion'
import type { PuntoSeguimiento } from '@/types/dominio'
import estilo from './MapaSeguimiento.module.css'

const ICONO_POSICION = L.divIcon({
  className: estilo.marcador,
  html: '<span aria-hidden="true">🐾</span>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

const ICONO_INICIO = L.divIcon({
  className: estilo.inicio,
  html: '<span aria-hidden="true"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

export default function MapaSeguimiento({ puntos }: { puntos: PuntoSeguimiento[] }) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<L.Map | null>(null)
  const rutaRef = useRef<L.Polyline | null>(null)
  const posicionRef = useRef<L.Marker | null>(null)
  const inicioRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!contenedorRef.current || mapaRef.current) return
    const mapa = L.map(contenedorRef.current, { scrollWheelZoom: false }).setView([SANTIAGO.lat, SANTIAGO.lng], 12)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa)
    rutaRef.current = L.polyline([], { color: '#fc8a40', weight: 5, opacity: 0.9 }).addTo(mapa)
    mapaRef.current = mapa
    return () => {
      mapa.remove()
      mapaRef.current = null
      rutaRef.current = null
      posicionRef.current = null
      inicioRef.current = null
    }
  }, [])

  useEffect(() => {
    const mapa = mapaRef.current
    const ruta = rutaRef.current
    if (!mapa || !ruta || puntos.length === 0) return
    const coordenadas = puntos.map((p) => L.latLng(p.latitud, p.longitud))
    ruta.setLatLngs(coordenadas)

    const primero = coordenadas[0]
    const ultimo = coordenadas[coordenadas.length - 1]
    if (inicioRef.current) inicioRef.current.setLatLng(primero)
    else inicioRef.current = L.marker(primero, { icon: ICONO_INICIO, interactive: false }).addTo(mapa)
    if (posicionRef.current) posicionRef.current.setLatLng(ultimo)
    else
      posicionRef.current = L.marker(ultimo, { icon: ICONO_POSICION, title: 'Posición actual' }).addTo(mapa)

    if (coordenadas.length === 1) mapa.setView(ultimo, 16)
    else mapa.fitBounds(L.latLngBounds(coordenadas), { padding: [32, 32], maxZoom: 17 })
  }, [puntos])

  return (
    <div className={estilo.envoltura}>
      <div
        ref={contenedorRef}
        className={estilo.mapa}
        role="region"
        aria-label={puntos.length > 0 ? 'Mapa con la ruta del servicio' : 'Mapa sin ubicación todavía'}
      />
      {puntos.length === 0 && (
        <p className={estilo.aviso} role="status">
          📍 Aún no hay ubicación
        </p>
      )}
    </div>
  )
}

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import estilo from './MapaZona.module.css'

interface MapaZonaProps {
  latitud: number
  longitud: number
  radioKm: number
  comuna: string
}

/** Zona aproximada del cuidador: solo un círculo, nunca un pin exacto. */
export default function MapaZona({ latitud, longitud, radioKm, comuna }: MapaZonaProps) {
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contenedorRef.current) return
    const mapa = L.map(contenedorRef.current, { scrollWheelZoom: false, zoomControl: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa)
    const circulo = L.circle([latitud, longitud], {
      radius: Math.max(radioKm, 1) * 1000,
      color: '#2d5a27',
      weight: 2,
      fillColor: '#a1d494',
      fillOpacity: 0.35,
      interactive: false,
    }).addTo(mapa)
    mapa.fitBounds(circulo.getBounds(), { padding: [12, 12] })
    return () => {
      mapa.remove()
    }
  }, [latitud, longitud, radioKm])

  return (
    <div
      ref={contenedorRef}
      className={estilo.mapa}
      role="img"
      aria-label={`Zona aproximada de cobertura: ${radioKm} km alrededor de ${comuna || 'Santiago'}`}
    />
  )
}

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { geocodificarInverso } from './geocodificacion'
import estilo from './MapaCobertura.module.css'

export interface UbicacionMapa {
  lat: number
  lng: number
  direccion: string
}

interface MapaCoberturaProps {
  radioKm: number
  /** Punto inicial (Santiago por defecto). */
  centroInicial: { lat: number; lng: number }
  /** Al cambiar a un valor nuevo, el mapa vuela hasta ese punto. */
  destino?: { lat: number; lng: number } | null
  alCambiarUbicacion: (ubicacion: UbicacionMapa) => void
}

const ICONO_PIN = L.divIcon({
  className: estilo.pin,
  html: '<span aria-hidden="true">📍</span>',
  iconSize: [36, 36],
  iconAnchor: [18, 32],
})

export default function MapaCobertura({ radioKm, centroInicial, destino, alCambiarUbicacion }: MapaCoberturaProps) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<L.Map | null>(null)
  const marcadorRef = useRef<L.Marker | null>(null)
  const circuloRef = useRef<L.Circle | null>(null)
  const cambioRef = useRef(alCambiarUbicacion)
  useEffect(() => {
    cambioRef.current = alCambiarUbicacion
  }, [alCambiarUbicacion])
  const destinoPrevioRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!contenedorRef.current || mapaRef.current) return
    const mapa = L.map(contenedorRef.current, { scrollWheelZoom: true }).setView(
      [centroInicial.lat, centroInicial.lng],
      12,
    )
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa)

    const marcador = L.marker([centroInicial.lat, centroInicial.lng], { draggable: true, icon: ICONO_PIN }).addTo(mapa)
    const circulo = L.circle([centroInicial.lat, centroInicial.lng], {
      radius: radioKm * 1000,
      color: '#2d5a27',
      weight: 2,
      fillColor: '#bcf0ae',
      fillOpacity: 0.35,
    }).addTo(mapa)

    let temporizador: ReturnType<typeof setTimeout> | null = null
    async function notificar(lat: number, lng: number) {
      const direccion = await geocodificarInverso(lat, lng)
      cambioRef.current({ lat, lng, direccion })
    }
    function mover(lat: number, lng: number, avisar = true) {
      marcador.setLatLng([lat, lng])
      circulo.setLatLng([lat, lng])
      if (!avisar) return
      if (temporizador) clearTimeout(temporizador)
      temporizador = setTimeout(() => void notificar(lat, lng), 600)
    }

    marcador.on('dragend', () => {
      const posicion = marcador.getLatLng()
      mover(posicion.lat, posicion.lng)
    })
    mapa.on('click', (evento: L.LeafletMouseEvent) => {
      mover(evento.latlng.lat, evento.latlng.lng)
    })

    mapaRef.current = mapa
    marcadorRef.current = marcador
    circuloRef.current = circulo
    void notificar(centroInicial.lat, centroInicial.lng)

    return () => {
      if (temporizador) clearTimeout(temporizador)
      mapa.remove()
      mapaRef.current = null
      marcadorRef.current = null
      circuloRef.current = null
    }
    // Solo al montar: el resto se sincroniza con los efectos de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    circuloRef.current?.setRadius(radioKm * 1000)
  }, [radioKm])

  useEffect(() => {
    if (!destino || !mapaRef.current || !marcadorRef.current || !circuloRef.current) return
    if (destinoPrevioRef.current?.lat === destino.lat && destinoPrevioRef.current?.lng === destino.lng) return
    destinoPrevioRef.current = destino
    mapaRef.current.flyTo([destino.lat, destino.lng], 13, { duration: 1 })
    marcadorRef.current.setLatLng([destino.lat, destino.lng])
    circuloRef.current.setLatLng([destino.lat, destino.lng])
  }, [destino])

  return (
    <div
      ref={contenedorRef}
      className={estilo.mapa}
      role="application"
      aria-label="Mapa para elegir tu ubicación y radio de cobertura"
    />
  )
}

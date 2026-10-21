import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { SANTIAGO } from '@/components/mapa/geocodificacion'
import type { CuidadorPublico } from '@/types/dominio'
import type { Coordenada } from '@/utils/geo'
import { formatearClp } from '@/utils/precios'
import { coordenadaCuidador, nombreCompleto, precioDesde } from './cuidadoresVista'
import estilo from './MapaCuidadores.module.css'

interface MapaCuidadoresProps {
  cuidadores: CuidadorPublico[]
  ubicacion: (Coordenada & { precisionM: number }) | null
  alElegir: (id: string) => void
}

const ICONO_CUIDADOR = L.divIcon({
  className: estilo.marcador,
  html: '<span aria-hidden="true">🐾</span>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -16],
})

const ICONO_USUARIO = L.divIcon({
  className: estilo.usuario,
  html: `<span class="${estilo.pulso}"></span><span class="${estilo.punto}"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

/** Contenido del popup con DOM (no HTML interpolado) para no inyectar texto del usuario. */
function crearPopup(cuidador: CuidadorPublico, alElegir: (id: string) => void): HTMLElement {
  const caja = document.createElement('div')
  caja.className = estilo.popup
  const nombre = document.createElement('strong')
  nombre.textContent = nombreCompleto(cuidador)
  const detalle = document.createElement('span')
  const precio = precioDesde(cuidador, null)
  const partes = [cuidador.comuna, cuidador.totalResenas > 0 ? `⭐ ${cuidador.calificacion.toFixed(1)}` : null]
  if (precio) partes.push(`desde ${formatearClp(precio.monto)}`)
  detalle.textContent = partes.filter(Boolean).join(' · ')
  const boton = document.createElement('button')
  boton.type = 'button'
  boton.className = estilo.popupBoton
  boton.textContent = 'Ver perfil'
  boton.addEventListener('click', () => alElegir(cuidador.id))
  caja.append(nombre, detalle, boton)
  return caja
}

export default function MapaCuidadores({ cuidadores, ubicacion, alElegir }: MapaCuidadoresProps) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<L.Map | null>(null)
  const capaRef = useRef<L.LayerGroup | null>(null)
  const usuarioRef = useRef<{ punto: L.Marker; precision: L.Circle } | null>(null)
  const elegirRef = useRef(alElegir)
  const huboUbicacionRef = useRef(false)

  useEffect(() => {
    elegirRef.current = alElegir
  }, [alElegir])

  useEffect(() => {
    if (!contenedorRef.current || mapaRef.current) return
    const mapa = L.map(contenedorRef.current, { scrollWheelZoom: false }).setView([SANTIAGO.lat, SANTIAGO.lng], 11)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa)
    mapaRef.current = mapa
    capaRef.current = L.layerGroup().addTo(mapa)
    return () => {
      mapa.remove()
      mapaRef.current = null
      capaRef.current = null
      usuarioRef.current = null
    }
  }, [])

  // Marcadores de cuidadores (se rehacen al cambiar la lista filtrada).
  useEffect(() => {
    const mapa = mapaRef.current
    const capa = capaRef.current
    if (!mapa || !capa) return
    capa.clearLayers()
    const puntos: L.LatLngExpression[] = []
    for (const cuidador of cuidadores) {
      const coordenada = coordenadaCuidador(cuidador)
      if (!coordenada) continue
      const posicion: L.LatLngExpression = [coordenada.latitud, coordenada.longitud]
      puntos.push(posicion)
      L.marker(posicion, {
        icon: ICONO_CUIDADOR,
        title: nombreCompleto(cuidador),
        alt: `Cuidador ${nombreCompleto(cuidador)}`,
        keyboard: true,
      })
        .bindPopup(() => crearPopup(cuidador, (id) => elegirRef.current(id)))
        .addTo(capa)
    }
    if (puntos.length > 0 && !huboUbicacionRef.current) {
      mapa.fitBounds(L.latLngBounds(puntos), { padding: [32, 32], maxZoom: 14 })
    }
  }, [cuidadores])

  // Punto azul dinámico con la ubicación del usuario.
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa) return
    if (!ubicacion) {
      usuarioRef.current?.punto.remove()
      usuarioRef.current?.precision.remove()
      usuarioRef.current = null
      return
    }
    const posicion: L.LatLngExpression = [ubicacion.latitud, ubicacion.longitud]
    if (usuarioRef.current) {
      usuarioRef.current.punto.setLatLng(posicion)
      usuarioRef.current.precision.setLatLng(posicion).setRadius(ubicacion.precisionM)
    } else {
      usuarioRef.current = {
        precision: L.circle(posicion, {
          radius: ubicacion.precisionM,
          color: '#2563eb',
          weight: 1,
          fillColor: '#2563eb',
          fillOpacity: 0.1,
          interactive: false,
        }).addTo(mapa),
        punto: L.marker(posicion, { icon: ICONO_USUARIO, interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(
          mapa,
        ),
      }
    }
    if (!huboUbicacionRef.current) {
      huboUbicacionRef.current = true
      mapa.flyTo(posicion, 13, { duration: 1 })
    }
  }, [ubicacion])

  return (
    <div
      ref={contenedorRef}
      className={estilo.mapa}
      role="region"
      aria-label="Mapa de cuidadores en Santiago"
    />
  )
}

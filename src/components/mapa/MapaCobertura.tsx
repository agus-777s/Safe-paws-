import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  buscarDirecciones,
  geocodificacionInversa,
  geocodificarTexto,
  type ResultadoDireccion,
} from '@/services/mapas/geocodificacion'
import estilo from './MapaCobertura.module.css'

export interface UbicacionMapa {
  lat: number
  lng: number
  /** Dirección REAL completa (display_name de Nominatim). */
  direccion: string
  direccionCorta?: string
}

interface MapaCoberturaProps {
  radioKm: number
  /** Punto inicial (Santiago por defecto). */
  centroInicial: { lat: number; lng: number }
  /** Al cambiar a un valor nuevo, el mapa vuela hasta ese punto. */
  destino?: { lat: number; lng: number } | null
  /** Ubicación ya elegida (para mostrarla al volver al paso). */
  ubicacionInicial?: UbicacionMapa | null
  alCambiarUbicacion: (ubicacion: UbicacionMapa) => void
}

export const SANTIAGO = { lat: -33.4489, lng: -70.6693 }
export { geocodificarTexto }

const ICONO_PIN = L.divIcon({
  className: estilo.pin,
  html: '<span aria-hidden="true">📍</span>',
  iconSize: [36, 36],
  iconAnchor: [18, 32],
})

export default function MapaCobertura({
  radioKm,
  centroInicial,
  destino,
  ubicacionInicial,
  alCambiarUbicacion,
}: MapaCoberturaProps) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<L.Map | null>(null)
  const marcadorRef = useRef<L.Marker | null>(null)
  const circuloRef = useRef<L.Circle | null>(null)
  const cambioRef = useRef(alCambiarUbicacion)
  useEffect(() => {
    cambioRef.current = alCambiarUbicacion
  }, [alCambiarUbicacion])
  const destinoPrevioRef = useRef<{ lat: number; lng: number } | null>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  /**
   * Contador de "turno": cada ubicación autoritativa (selección del usuario)
   * lo incrementa. Las geocodificaciones inversas en vuelo que queden con un
   * turno antiguo se descartan para no sobrescribir la selección.
   */
  const turnoRef = useRef(0)
  /**
   * Contador de edición: se incrementa con cada tecla del buscador.
   * Una reversa en vuelo que detecte una edición posterior se descarta
   * para no borrar la consulta del usuario ni mover el marcador.
   */
  const edicionRef = useRef(0)
  /** Reversas en vuelo: el indicador se apaga solo cuando terminan todas. */
  const reversasEnVueloRef = useRef(0)
  /** Última dirección confirmada: evita re-buscar lo ya seleccionado (ref, siempre fresca). */
  const eleccionRef = useRef<string | null>(ubicacionInicial?.direccion ?? null)

  const [busqueda, setBusqueda] = useState(ubicacionInicial?.direccion ?? '')
  const [resultados, setResultados] = useState<ResultadoDireccion[]>([])
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [listaAbierta, setListaAbierta] = useState(false)
  const [seleccionada, setSeleccionada] = useState<UbicacionMapa | null>(ubicacionInicial ?? null)
  const [resolviendoPunto, setResolviendoPunto] = useState(false)
  const busquedaRef = useRef(0)

  function colocarMarcador(lat: number, lng: number, centrar = true) {
    const mapa = mapaRef.current
    const marcador = marcadorRef.current
    const circulo = circuloRef.current
    if (!mapa || !marcador || !circulo) return false
    mapa.invalidateSize()
    marcador.setLatLng([lat, lng])
    circulo.setLatLng([lat, lng])
    if (centrar) {
      // setView es la forma determinista de recentrar en Leaflet.
      mapa.setView([lat, lng], Math.max(mapa.getZoom(), 15), { animate: true })
    }
    return true
  }

  function confirmarUbicacion(ubicacion: UbicacionMapa, centrarMapa = true) {
    turnoRef.current += 1
    eleccionRef.current = ubicacion.direccion
    setSeleccionada(ubicacion)
    setBusqueda(ubicacion.direccion)
    setListaAbierta(false)
    colocarMarcador(ubicacion.lat, ubicacion.lng, centrarMapa)
    cambioRef.current(ubicacion)
  }

  async function resolverPunto(lat: number, lng: number) {
    const miTurno = ++turnoRef.current
    const miEdicion = edicionRef.current
    reversasEnVueloRef.current += 1
    setResolviendoPunto(true)
    const esVigente = () => turnoRef.current === miTurno && edicionRef.current === miEdicion
    try {
      const rev = await geocodificacionInversa(lat, lng)
      // Si el usuario seleccionó o escribió algo más nuevo, no sobrescribir.
      if (!esVigente()) return
      confirmarUbicacion(
        { lat, lng, direccion: rev.direccionCompleta, direccionCorta: rev.direccion },
        false,
      )
    } catch {
      if (!esVigente()) return
      // Aunque falle la reversa, las coordenadas REALES sí se guardan.
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      confirmarUbicacion({ lat, lng, direccion: fallback }, false)
    } finally {
      reversasEnVueloRef.current -= 1
      if (reversasEnVueloRef.current <= 0) {
        reversasEnVueloRef.current = 0
        setResolviendoPunto(false)
      }
    }
  }

  /* ---------- Búsqueda REAL con debounce + cancelación ---------- */
  useEffect(() => {
    const texto = busqueda.trim()
    // No buscar si el texto es la dirección ya confirmada (evita loops).
    if (eleccionRef.current !== null && texto === eleccionRef.current) {
      setBuscando(false)
      setErrorBusqueda(null)
      return
    }
    if (texto.length < 3) {
      setResultados([])
      setBuscando(false)
      setErrorBusqueda(null)
      return
    }
    const id = ++busquedaRef.current
    setBuscando(true)
    setErrorBusqueda(null)
    const controlador = new AbortController()
    const temporizador = setTimeout(() => {
      void (async () => {
        try {
          const encontrados = await buscarDirecciones(texto, controlador.signal)
          if (controlador.signal.aborted || busquedaRef.current !== id) return
          setResultados(encontrados)
          setListaAbierta(true)
        } catch (e) {
          if (controlador.signal.aborted || busquedaRef.current !== id) return
          setResultados([])
          setListaAbierta(true)
          setErrorBusqueda(e instanceof Error ? e.message : 'No se pudo buscar. Revisa tu conexión.')
        } finally {
          if (busquedaRef.current === id) setBuscando(false)
        }
      })()
    }, 450)
    return () => {
      clearTimeout(temporizador)
      controlador.abort()
    }
  }, [busqueda])

  /* ---------- Montaje del mapa (se reutiliza la arquitectura existente) ---------- */
  useEffect(() => {
    if (!contenedorRef.current || mapaRef.current) return
    const inicio = ubicacionInicial ?? centroInicial
    const mapa = L.map(contenedorRef.current, { scrollWheelZoom: true }).setView([inicio.lat, inicio.lng], 12)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa)

    const marcador = L.marker([inicio.lat, inicio.lng], { draggable: true, icon: ICONO_PIN }).addTo(mapa)
    const circulo = L.circle([inicio.lat, inicio.lng], {
      radius: radioKm * 1000,
      color: '#2d5a27',
      weight: 2,
      fillColor: '#bcf0ae',
      fillOpacity: 0.35,
    }).addTo(mapa)

    let temporizador: ReturnType<typeof setTimeout> | null = null
    function mover(lat: number, lng: number) {
      marcador.setLatLng([lat, lng])
      circulo.setLatLng([lat, lng])
      if (temporizador) clearTimeout(temporizador)
      temporizador = setTimeout(() => void resolverPunto(lat, lng), 600)
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
    // Gancho solo-DEV para pruebas funcionales (no existe en producción).
    if (import.meta.env.DEV) {
      const w = window as unknown as { __mapaCobertura?: L.Map; __marcadorCobertura?: L.Marker }
      w.__mapaCobertura = mapa
      w.__marcadorCobertura = marcador
    }
    // Asegura tamaño correcto y dirección REAL inicial (con guardia anti-sobrescritura).
    requestAnimationFrame(() => {
      mapa.invalidateSize()
    })
    if (!ubicacionInicial) void resolverPunto(inicio.lat, inicio.lng)

    // Cerrar la lista al hacer click fuera.
    function alClickFuera(evento: MouseEvent) {
      if (!listaRef.current?.contains(evento.target as Node)) setListaAbierta(false)
    }
    document.addEventListener('mousedown', alClickFuera)

    return () => {
      document.removeEventListener('mousedown', alClickFuera)
      if (temporizador) clearTimeout(temporizador)
      if (import.meta.env.DEV) {
        const w = window as unknown as { __mapaCobertura?: L.Map; __marcadorCobertura?: L.Marker }
        delete w.__mapaCobertura
        delete w.__marcadorCobertura
      }
      mapa.remove()
      mapaRef.current = null
      marcadorRef.current = null
      circuloRef.current = null
    }
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    circuloRef.current?.setRadius(radioKm * 1000)
  }, [radioKm])

  /* Destino externo (compatibilidad): centra y resuelve la dirección REAL. */
  useEffect(() => {
    if (!destino || !mapaRef.current || !marcadorRef.current || !circuloRef.current) return
    if (destinoPrevioRef.current?.lat === destino.lat && destinoPrevioRef.current?.lng === destino.lng) return
    destinoPrevioRef.current = destino
    colocarMarcador(destino.lat, destino.lng, true)
    void resolverPunto(destino.lat, destino.lng)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino])

  function elegirResultado(resultado: ResultadoDireccion) {
    confirmarUbicacion({
      lat: resultado.lat,
      lng: resultado.lng,
      direccion: resultado.direccionCompleta,
      direccionCorta: resultado.nombreCorto,
    })
  }

  const sinResultados = !buscando && !errorBusqueda && busqueda.trim().length >= 3 && resultados.length === 0 && listaAbierta

  return (
    <div className={estilo.contenedor}>
      <div className={estilo.buscador} ref={listaRef}>
        <span className={estilo.lupa} aria-hidden="true">🔍</span>
        <input
          type="text"
          className={estilo.entrada}
          placeholder="Buscar dirección..."
          aria-label="Buscar dirección real"
          autoComplete="off"
          value={busqueda}
          onChange={(e) => {
            edicionRef.current += 1
            setBusqueda(e.target.value)
            setListaAbierta(true)
          }}
          onFocus={() => {
            if (resultados.length > 0 || errorBusqueda || busqueda.trim().length >= 3) setListaAbierta(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setListaAbierta(false)
            if (e.key === 'Enter' && resultados.length > 0) elegirResultado(resultados[0])
          }}
        />
        {buscando && (
          <span className={estilo.cargando} role="status" aria-label="Buscando direcciones">
            <span className={estilo.spinner} aria-hidden="true" />
          </span>
        )}
        {!buscando && busqueda && (
          <button
            type="button"
            className={estilo.limpiar}
            aria-label="Limpiar búsqueda"
            onClick={() => {
              edicionRef.current += 1
              setBusqueda('')
              setResultados([])
              setErrorBusqueda(null)
            }}
          >
            ×
          </button>
        )}
        {listaAbierta && (buscando || errorBusqueda || sinResultados || resultados.length > 0) && (
          <div className={estilo.resultados} role="listbox" aria-label="Resultados de direcciones reales">
            {buscando && <p className={estilo.estado}>Buscando direcciones reales…</p>}
            {!buscando && errorBusqueda && (
              <p className={estilo.estadoError} role="alert">⚠️ {errorBusqueda}</p>
            )}
            {sinResultados && (
              <p className={estilo.estado}>Sin resultados para “{busqueda.trim()}”. Prueba con calle + comuna, ej: “Vicuña Mackenna, Santiago”.</p>
            )}
            {!buscando && !errorBusqueda &&
              resultados.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="option"
                  aria-selected={seleccionada?.direccion === r.direccionCompleta}
                  className={estilo.opcion}
                  onMouseDown={(e) => {
                    // mousedown se dispara antes que blur/cierres: selecciona sin carreras.
                    e.preventDefault()
                    elegirResultado(r)
                  }}
                  onClick={() => elegirResultado(r)}
                >
                  <span className={estilo.opcionPin} aria-hidden="true">📍</span>
                  <span className={estilo.opcionTextos}>
                    <strong className={estilo.opcionTitulo}>{r.nombreCorto}</strong>
                    <small className={estilo.opcionDetalle}>{r.direccionCompleta}</small>
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>

      <div
        ref={contenedorRef}
        className={estilo.mapa}
        role="application"
        aria-label="Mapa para elegir tu ubicación y radio de cobertura"
      />

      <p className={estilo.seleccion} aria-live="polite">
        {resolviendoPunto ? (
          <>Obteniendo dirección real…</>
        ) : seleccionada ? (
          <>
            📍 <strong>Ubicación seleccionada:</strong> {seleccionada.direccion}
            <br />
            <small>
              Lat {seleccionada.lat.toFixed(5)}, Lng {seleccionada.lng.toFixed(5)}
            </small>
          </>
        ) : (
          <>Busca una dirección o toca el mapa para marcar tu ubicación real.</>
        )}
      </p>
    </div>
  )
}

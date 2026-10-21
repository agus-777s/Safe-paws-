import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EstadoVista from '@/components/ui/EstadoVista'
import { useCarga } from '@/hooks/useCarga'
import { listarCuidadores } from '@/services/supabase/cuidadores'
import { SERVICIOS } from '@/types/dominio'
import type { Servicio } from '@/types/dominio'
import type { Coordenada } from '@/utils/geo'
import { clases } from '@/utils/clases'
import MapaCuidadores from './MapaCuidadores'
import TarjetaCuidador from './TarjetaCuidador'
import { exigirConexion, filtrarYOrdenar } from './cuidadoresVista'
import estilo from './ExplorarPage.module.css'

type EstadoUbicacion = 'inactiva' | 'buscando' | 'activa' | 'denegada' | 'no-disponible'

const MENSAJES_UBICACION: Partial<Record<EstadoUbicacion, string>> = {
  buscando: 'Buscando tu ubicación…',
  activa: 'Ordenando por cercanía a tu ubicación.',
  denegada: 'No diste permiso de ubicación. Puedes activarlo en tu navegador para ordenar por cercanía.',
  'no-disponible': 'No pudimos obtener tu ubicación en este dispositivo.',
}

export default function ExplorarPage() {
  const navigate = useNavigate()
  const [servicio, setServicio] = useState<Servicio | null>(null)
  const [texto, setTexto] = useState('')
  const [ubicacion, setUbicacion] = useState<(Coordenada & { precisionM: number }) | null>(null)
  const [estadoUbicacion, setEstadoUbicacion] = useState<EstadoUbicacion>('inactiva')
  const vigilanciaRef = useRef<number | null>(null)

  const cargar = useCallback(async () => {
    exigirConexion()
    return listarCuidadores(servicio)
  }, [servicio])
  const { datos, cargando, error, recargar } = useCarga(cargar)

  const resultados = useMemo(
    () => filtrarYOrdenar(datos ?? [], texto, ubicacion),
    [datos, texto, ubicacion],
  )
  const cuidadoresMapa = useMemo(() => resultados.map((r) => r.cuidador), [resultados])

  useEffect(
    () => () => {
      if (vigilanciaRef.current != null) navigator.geolocation.clearWatch(vigilanciaRef.current)
    },
    [],
  )

  function usarMiUbicacion() {
    if (!('geolocation' in navigator)) {
      setEstadoUbicacion('no-disponible')
      return
    }
    if (vigilanciaRef.current != null) navigator.geolocation.clearWatch(vigilanciaRef.current)
    setEstadoUbicacion('buscando')
    vigilanciaRef.current = navigator.geolocation.watchPosition(
      (posicion) => {
        setUbicacion({
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
          precisionM: Math.min(posicion.coords.accuracy, 2000),
        })
        setEstadoUbicacion('activa')
      },
      (fallo) => {
        if (vigilanciaRef.current != null) navigator.geolocation.clearWatch(vigilanciaRef.current)
        vigilanciaRef.current = null
        setEstadoUbicacion(fallo.code === fallo.PERMISSION_DENIED ? 'denegada' : 'no-disponible')
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 },
    )
  }

  const alElegir = useCallback((id: string) => navigate(`/cuidadores/${id}`), [navigate])

  const opciones: Array<{ valor: Servicio | null; titulo: string }> = [
    { valor: null, titulo: 'Todos' },
    ...SERVICIOS.map((s) => ({ valor: s.valor, titulo: s.titulo })),
  ]

  return (
    <div className={clases('contenedor', estilo.pagina)}>
      <header className={estilo.cabecera}>
        <p className={estilo.kicker}>Explorar</p>
        <h1 className={estilo.titulo}>Cuidadores cerca de ti</h1>
        <p className={estilo.descripcion}>
          Encuentra paseadores y cuidadores verificados en Santiago. Filtra por servicio y revisa su perfil antes de
          reservar.
        </p>
      </header>

      <section className={estilo.filtros} aria-label="Filtros de búsqueda">
        <div className={estilo.chips} role="group" aria-label="Tipo de servicio">
          {opciones.map((opcion) => {
            const activo = servicio === opcion.valor
            return (
              <button
                key={opcion.titulo}
                type="button"
                className={clases(estilo.chip, activo && estilo.chipActivo)}
                aria-pressed={activo}
                onClick={() => setServicio(opcion.valor)}
              >
                {opcion.titulo}
              </button>
            )
          })}
        </div>
        <div className={estilo.busqueda}>
          <label className={estilo.campoBusqueda}>
            <span className={estilo.visualmenteOculto}>Buscar por nombre o comuna</span>
            <span aria-hidden="true">🔎</span>
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por nombre o comuna"
            />
          </label>
          <button
            type="button"
            className={estilo.botonUbicacion}
            onClick={usarMiUbicacion}
            disabled={estadoUbicacion === 'buscando'}
          >
            <span aria-hidden="true">📍</span> Usar mi ubicación
          </button>
        </div>
        {MENSAJES_UBICACION[estadoUbicacion] && (
          <p
            className={clases(
              estilo.avisoUbicacion,
              (estadoUbicacion === 'denegada' || estadoUbicacion === 'no-disponible') && estilo.avisoError,
            )}
            role="status"
          >
            {MENSAJES_UBICACION[estadoUbicacion]}
          </p>
        )}
      </section>

      <div className={estilo.contenido}>
        <div className={estilo.mapaCaja}>
          <MapaCuidadores cuidadores={cuidadoresMapa} ubicacion={ubicacion} alElegir={alElegir} />
        </div>

        <section className={estilo.lista} aria-label="Resultados" aria-busy={cargando}>
          <EstadoVista
            cargando={cargando}
            error={error}
            alReintentar={recargar}
            etiquetaCarga="Buscando cuidadores…"
            vacio={resultados.length === 0}
            mensajeVacio={
              texto || servicio
                ? 'No encontramos cuidadores con esos filtros. Prueba con otro servicio o comuna.'
                : 'Aún no hay cuidadores disponibles. ¡Vuelve pronto!'
            }
          >
            <p className={estilo.conteo}>
              {resultados.length} {resultados.length === 1 ? 'cuidador' : 'cuidadores'}
            </p>
            <ul className={estilo.tarjetas}>
              {resultados.map(({ cuidador, distancia }) => (
                <li key={cuidador.id}>
                  <TarjetaCuidador cuidador={cuidador} distancia={distancia} servicioFiltrado={servicio} />
                </li>
              ))}
            </ul>
          </EstadoVista>
        </section>
      </div>
    </div>
  )
}

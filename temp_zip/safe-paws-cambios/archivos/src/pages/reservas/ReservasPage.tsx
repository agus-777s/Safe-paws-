import { useCallback, useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import EstadoVista from '@/components/ui/EstadoVista'
import { useAuth } from '@/hooks/useAuth'
import { useCarga } from '@/hooks/useCarga'
import { listarMisReservas } from '@/services/supabase/reservas'
import type { Reserva } from '@/types/dominio'
import { clases } from '@/utils/clases'
import { cargarDetalles } from './detallesReserva'
import { rolEnReserva, separarPorTiempo } from './logicaReservas'
import type { RolReserva } from './logicaReservas'
import TarjetaReserva from './TarjetaReserva'
import estilo from './ReservasPage.module.css'

type Periodo = 'proximas' | 'pasadas'

const ETIQUETA_ROL: Record<RolReserva, string> = { dueno: 'Como dueño', cuidador: 'Como cuidador' }

export default function ReservasPage() {
  const { usuario } = useAuth()
  const usuarioId = usuario?.id ?? ''
  const [rolElegido, setRolElegido] = useState<RolReserva | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>('proximas')
  const [ahora] = useState(() => Date.now())

  const cargar = useCallback(async () => cargarDetalles(await listarMisReservas(), usuarioId), [usuarioId])
  const { datos, cargando, error, recargar, establecer } = useCarga(cargar)

  const porRol = useMemo(() => {
    const grupos: Record<RolReserva, Reserva[]> = { dueno: [], cuidador: [] }
    for (const reserva of datos?.reservas ?? []) {
      const rol = rolEnReserva(reserva, usuarioId)
      if (rol) grupos[rol].push(reserva)
    }
    return grupos
  }, [datos, usuarioId])

  const rolesDisponibles = (['dueno', 'cuidador'] as const).filter((rol) => porRol[rol].length > 0)
  const rolActivo: RolReserva | null =
    rolElegido && rolesDisponibles.includes(rolElegido) ? rolElegido : (rolesDisponibles[0] ?? null)
  const { proximas, pasadas } = useMemo(
    () => separarPorTiempo(rolActivo ? porRol[rolActivo] : [], ahora),
    [porRol, rolActivo, ahora],
  )
  const visibles = periodo === 'proximas' ? proximas : pasadas

  const actualizarReserva = useCallback(
    (actualizada: Reserva) =>
      establecer((previo) =>
        previo
          ? { ...previo, reservas: previo.reservas.map((r) => (r.id === actualizada.id ? actualizada : r)) }
          : previo,
      ),
    [establecer],
  )

  if (!usuario) return null

  return (
    <div className={estilo.pagina}>
      <header className={estilo.cabecera}>
        <h1 className={estilo.titulo}>Mis reservas</h1>
        <p className={estilo.subtitulo}>Revisa tus servicios, confirma solicitudes y sigue cada paseo en vivo.</p>
      </header>

      <EstadoVista
        cargando={cargando}
        error={error}
        alReintentar={recargar}
        etiquetaCarga="Cargando reservas…"
        vacio={rolesDisponibles.length === 0}
        mensajeVacio="Aún no tienes reservas. Encuentra a alguien de confianza para tu mascota."
        accionVacio={<Button enlace="/explorar">Buscar cuidadores</Button>}
      >
        {rolesDisponibles.length > 1 && (
          <div className={estilo.pestanas} role="group" aria-label="Ver reservas">
            {rolesDisponibles.map((rol) => (
              <button
                key={rol}
                type="button"
                aria-pressed={rol === rolActivo}
                className={clases(estilo.pestana, rol === rolActivo && estilo.pestanaActiva)}
                onClick={() => setRolElegido(rol)}
              >
                {ETIQUETA_ROL[rol]} <span className={estilo.contador}>{porRol[rol].length}</span>
              </button>
            ))}
          </div>
        )}

        <div className={estilo.filtros} role="group" aria-label="Periodo">
          {(
            [
              ['proximas', `Próximas (${proximas.length})`],
              ['pasadas', `Pasadas (${pasadas.length})`],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={periodo === valor}
              className={clases(estilo.chip, periodo === valor && estilo.chipActivo)}
              onClick={() => setPeriodo(valor)}
            >
              {texto}
            </button>
          ))}
        </div>

        {visibles.length === 0 ? (
          <div className={estilo.vacioLista}>
            <p>{periodo === 'proximas' ? 'No tienes reservas próximas.' : 'No tienes reservas pasadas.'}</p>
            {periodo === 'proximas' && rolActivo === 'dueno' && (
              <Button variante="secundario" tamanio="pequeno" enlace="/explorar">
                Buscar cuidadores
              </Button>
            )}
          </div>
        ) : (
          <div className={estilo.lista}>
            {rolActivo &&
              visibles.map((reserva) => (
                <TarjetaReserva
                  key={reserva.id}
                  reserva={reserva}
                  rol={rolActivo}
                  contraparte={datos?.perfiles.get(rolActivo === 'dueno' ? reserva.cuidadorId : reserva.duenoId)}
                  mascota={datos?.mascotas.get(reserva.mascotaId)}
                  alCambiar={actualizarReserva}
                />
              ))}
          </div>
        )}
      </EstadoVista>
    </div>
  )
}

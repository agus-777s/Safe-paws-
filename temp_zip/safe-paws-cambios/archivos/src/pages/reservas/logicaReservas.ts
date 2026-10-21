import type { EstadoReserva, Reserva } from '@/types/dominio'
import { distanciaKm } from '@/utils/geo'
import type { Coordenada } from '@/utils/geo'

export type RolReserva = 'dueno' | 'cuidador'

export interface AccionReserva {
  /** Estado al que pasa la reserva. */
  destino: EstadoReserva
  etiqueta: string
  /** Requiere confirmación explícita (cancelar / rechazar). */
  destructiva: boolean
}

const ACEPTAR: AccionReserva = { destino: 'aceptada', etiqueta: 'Aceptar', destructiva: false }
const RECHAZAR: AccionReserva = { destino: 'rechazada', etiqueta: 'Rechazar', destructiva: true }
const INICIAR: AccionReserva = { destino: 'en_curso', etiqueta: 'Iniciar servicio', destructiva: false }
const FINALIZAR: AccionReserva = { destino: 'completada', etiqueta: 'Finalizar servicio', destructiva: false }
const CANCELAR: AccionReserva = { destino: 'cancelada', etiqueta: 'Cancelar', destructiva: true }

export function rolEnReserva(reserva: Pick<Reserva, 'duenoId' | 'cuidadorId'>, usuarioId: string): RolReserva | null {
  if (reserva.cuidadorId === usuarioId) return 'cuidador'
  if (reserva.duenoId === usuarioId) return 'dueno'
  return null
}

/** Acciones de estado que la interfaz ofrece. Las reglas reales las aplica el servidor. */
export function accionesDisponibles(rol: RolReserva, estado: EstadoReserva): AccionReserva[] {
  if (rol === 'cuidador') {
    if (estado === 'pendiente') return [ACEPTAR, RECHAZAR]
    if (estado === 'aceptada') return [INICIAR, CANCELAR]
    if (estado === 'en_curso') return [FINALIZAR]
    return []
  }
  if (estado === 'pendiente' || estado === 'aceptada') return [CANCELAR]
  return []
}

export function puedeVerSeguimiento(estado: EstadoReserva): boolean {
  return estado === 'aceptada' || estado === 'en_curso' || estado === 'completada'
}

export function idContraparte(reserva: Pick<Reserva, 'duenoId' | 'cuidadorId'>, rol: RolReserva): string {
  return rol === 'dueno' ? reserva.cuidadorId : reserva.duenoId
}

const ESTADOS_ACTIVOS: EstadoReserva[] = ['pendiente', 'aceptada', 'en_curso']

/** Próxima: sigue activa y no terminó. Un servicio en curso siempre es próximo. */
export function esProxima(reserva: Pick<Reserva, 'estado' | 'fin'>, ahora: number): boolean {
  if (reserva.estado === 'en_curso') return true
  return ESTADOS_ACTIVOS.includes(reserva.estado) && new Date(reserva.fin).getTime() >= ahora
}

/** Próximas en orden cronológico; pasadas de la más reciente a la más antigua. */
export function separarPorTiempo<T extends Pick<Reserva, 'estado' | 'inicio' | 'fin'>>(
  reservas: T[],
  ahora: number,
): { proximas: T[]; pasadas: T[] } {
  const proximas: T[] = []
  const pasadas: T[] = []
  for (const reserva of reservas) (esProxima(reserva, ahora) ? proximas : pasadas).push(reserva)
  const tiempo = (r: T) => new Date(r.inicio).getTime()
  proximas.sort((a, b) => tiempo(a) - tiempo(b))
  pasadas.sort((a, b) => tiempo(b) - tiempo(a))
  return { proximas, pasadas }
}

/** La reserva ocupa algún momento del día local de `ahora`. */
export function ocurreHoy(reserva: Pick<Reserva, 'inicio' | 'fin'>, ahora: Date): boolean {
  const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime()
  const finDia = inicioDia + 24 * 60 * 60 * 1000
  return new Date(reserva.inicio).getTime() < finDia && new Date(reserva.fin).getTime() >= inicioDia
}

const formatoFecha = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
const formatoHora = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' })

/** "lun, 3 nov · 10:00 – 11:00" o "lun, 3 nov 10:00 → mié, 5 nov 12:00". */
export function formatearRangoFechas(inicioIso: string, finIso: string): string {
  const inicio = new Date(inicioIso)
  const fin = new Date(finIso)
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return ''
  const mismoDia = inicio.toDateString() === fin.toDateString()
  if (mismoDia) return `${formatoFecha.format(inicio)} · ${formatoHora.format(inicio)} – ${formatoHora.format(fin)}`
  return `${formatoFecha.format(inicio)} ${formatoHora.format(inicio)} → ${formatoFecha.format(fin)} ${formatoHora.format(fin)}`
}

export const INTERVALO_MINIMO_PUNTO_MS = 10_000
export const DISTANCIA_MINIMA_PUNTO_KM = 0.01

/** Envía un punto nuevo solo si pasaron ≥ 10 s y se movió > 10 m desde el último enviado. */
export function debeRegistrarPunto(
  ultimo: (Coordenada & { tiempo: number }) | null,
  nuevo: Coordenada,
  ahora: number,
): boolean {
  if (!ultimo) return true
  if (ahora - ultimo.tiempo < INTERVALO_MINIMO_PUNTO_MS) return false
  return distanciaKm(ultimo, nuevo) > DISTANCIA_MINIMA_PUNTO_KM
}

/** Inserta sin duplicar (los eventos Realtime pueden llegar después de la carga inicial). */
export function agregarSinDuplicar<T extends { id: string | number }>(lista: T[], elemento: T): T[] {
  return lista.some((x) => x.id === elemento.id) ? lista : [...lista, elemento]
}

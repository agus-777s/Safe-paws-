import type { TipoMascota } from './perfil'

export type Servicio = 'paseo' | 'hospedaje' | 'guarderia' | 'visita'

export const SERVICIOS: Array<{ valor: Servicio; titulo: string; unidad: string; icono: string }> = [
  { valor: 'paseo', titulo: 'Paseo', unidad: 'por paseo', icono: '🦮' },
  { valor: 'hospedaje', titulo: 'Hospedaje', unidad: 'por noche', icono: '🏠' },
  { valor: 'guarderia', titulo: 'Guardería', unidad: 'por día', icono: '☀️' },
  { valor: 'visita', titulo: 'Visita a domicilio', unidad: 'por visita', icono: '🔑' },
]

export function tituloServicio(servicio: Servicio): string {
  return SERVICIOS.find((s) => s.valor === servicio)?.titulo ?? servicio
}

export interface Mascota {
  id: string
  duenoId: string
  nombre: string
  tipo: TipoMascota
  raza: string
  edadAnos: number | null
  pesoKg: number | null
  esGrupo: boolean
  cantidad: number
  fotos: string[]
  dieta: string
  notasSalud: string
}

export type NuevaMascota = Omit<Mascota, 'id' | 'duenoId'>

export type TipoRecordatorio = 'vacuna' | 'desparasitacion' | 'medicamento' | 'control' | 'otro'

export const TIPOS_RECORDATORIO: Array<{ valor: TipoRecordatorio; titulo: string }> = [
  { valor: 'vacuna', titulo: 'Vacuna' },
  { valor: 'desparasitacion', titulo: 'Desparasitación' },
  { valor: 'medicamento', titulo: 'Medicamento' },
  { valor: 'control', titulo: 'Control veterinario' },
  { valor: 'otro', titulo: 'Otro' },
]

export interface RecordatorioSalud {
  id: string
  mascotaId: string
  titulo: string
  tipo: TipoRecordatorio
  /** Fecha ISO `YYYY-MM-DD`. */
  fecha: string
  completado: boolean
}

export interface PerfilCuidador {
  id: string
  bio: string
  servicios: Servicio[]
  precios: Record<Servicio, number | null>
  comuna: string
  latitud: number | null
  longitud: number | null
  radioKm: number
  /** 0 = domingo … 6 = sábado */
  dias: number[]
  horaInicio: string
  horaFin: string
  verificado: boolean
  calificacion: number
  totalResenas: number
  activo: boolean
}

export interface CuidadorPublico extends Omit<PerfilCuidador, 'activo'> {
  nombre: string
  apellido: string
  avatarUrl: string | null
  descripcion: string
}

export type EstadoReserva = 'pendiente' | 'aceptada' | 'rechazada' | 'en_curso' | 'completada' | 'cancelada'

export const ETIQUETAS_ESTADO: Record<EstadoReserva, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Confirmada',
  rechazada: 'Rechazada',
  en_curso: 'En curso',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

export interface Reserva {
  id: string
  duenoId: string
  cuidadorId: string
  mascotaId: string
  servicio: Servicio
  inicio: string
  fin: string
  precioTotal: number
  estado: EstadoReserva
  notas: string
  iniciadoEn: string | null
  finalizadoEn: string | null
  creadoEn: string
}

export interface NuevaReserva {
  cuidadorId: string
  mascotaId: string
  servicio: Servicio
  inicio: Date
  fin: Date
  notas: string
}

export interface PuntoSeguimiento {
  id: number
  reservaId: string
  latitud: number
  longitud: number
  registradoEn: string
}

export type TipoActualizacion = 'foto' | 'nota' | 'emergencia'

export interface ActualizacionServicio {
  id: string
  reservaId: string
  autorId: string
  tipo: TipoActualizacion
  texto: string
  fotoUrl: string | null
  creadoEn: string
}

export interface PerfilPublico {
  id: string
  nombre: string
  apellido: string
  avatarUrl: string | null
  comuna: string
}

export interface Conversacion {
  id: string
  participanteA: string
  participanteB: string
  ultimoMensajeEn: string | null
}

export interface Mensaje {
  id: string
  conversacionId: string
  autorId: string
  texto: string
  fotoUrl: string | null
  leidoEn: string | null
  creadoEn: string
}

export interface Resena {
  id: string
  reservaId: string
  autorId: string
  cuidadorId: string
  puntuacion: number
  comentario: string
  creadoEn: string
}

export interface ResumenCuidador {
  gananciasMes: number
  gananciasTotal: number
  serviciosCompletados: number
  solicitudesPendientes: number
  proximosServicios: number
  calificacion: number
  totalResenas: number
}

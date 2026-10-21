import type { DatosPerfilCuidador } from '@/services/supabase/cuidadores'
import type { PerfilCuidador, Servicio } from '@/types/dominio'

export interface FormularioPerfil {
  bio: string
  servicios: Servicio[]
  /** Precios como texto mientras se editan. */
  precios: Record<Servicio, string>
  comuna: string
  latitud: number | null
  longitud: number | null
  radioKm: number
  dias: number[]
  horaInicio: string
  horaFin: string
  activo: boolean
}

export type ErroresPerfil = Partial<Record<'servicios' | 'horario' | 'comuna' | `precio_${Servicio}`, string>>

const PRECIOS_VACIOS: Record<Servicio, string> = { paseo: '', hospedaje: '', guarderia: '', visita: '' }

export function formularioDesdePerfil(perfil: PerfilCuidador | null, respaldo?: Partial<FormularioPerfil>): FormularioPerfil {
  if (!perfil) {
    return {
      bio: '',
      servicios: [],
      precios: { ...PRECIOS_VACIOS },
      comuna: '',
      latitud: null,
      longitud: null,
      radioKm: 5,
      dias: [1, 2, 3, 4, 5],
      horaInicio: '08:00',
      horaFin: '19:00',
      activo: true,
      ...respaldo,
    }
  }
  const precios = { ...PRECIOS_VACIOS }
  for (const clave of Object.keys(precios) as Servicio[]) {
    const valor = perfil.precios[clave]
    precios[clave] = valor == null ? '' : String(valor)
  }
  return {
    bio: perfil.bio,
    servicios: [...perfil.servicios],
    precios,
    comuna: perfil.comuna,
    latitud: perfil.latitud,
    longitud: perfil.longitud,
    radioKm: perfil.radioKm,
    dias: [...perfil.dias],
    horaInicio: perfil.horaInicio,
    horaFin: perfil.horaFin,
    activo: perfil.activo,
  }
}

/** Precio entero en CLP (acepta "12.000", "$ 12000"). Null si no es válido. */
export function leerPrecio(texto: string): number | null {
  const limpio = texto.replace(/[$\s.]/g, '')
  if (!/^\d+$/.test(limpio)) return null
  const valor = Number(limpio)
  return valor > 0 && Number.isSafeInteger(valor) ? valor : null
}

function minutos(hora: string): number | null {
  const coincidencia = /^(\d{2}):(\d{2})/.exec(hora)
  if (!coincidencia) return null
  return Number(coincidencia[1]) * 60 + Number(coincidencia[2])
}

export function validarFormularioPerfil(
  formulario: FormularioPerfil,
): { ok: true; datos: DatosPerfilCuidador } | { ok: false; errores: ErroresPerfil } {
  const errores: ErroresPerfil = {}
  if (formulario.servicios.length === 0) errores.servicios = 'Elige al menos un servicio.'

  const precios: Record<Servicio, number | null> = { paseo: null, hospedaje: null, guarderia: null, visita: null }
  for (const servicio of formulario.servicios) {
    const precio = leerPrecio(formulario.precios[servicio])
    if (precio == null) errores[`precio_${servicio}`] = 'Ingresa un precio en pesos (número entero mayor a 0).'
    precios[servicio] = precio
  }

  const inicio = minutos(formulario.horaInicio)
  const fin = minutos(formulario.horaFin)
  if (inicio == null || fin == null) errores.horario = 'Indica la hora de inicio y de término.'
  else if (fin <= inicio) errores.horario = 'La hora de término debe ser posterior a la de inicio.'

  if (!formulario.comuna.trim()) errores.comuna = 'Indica tu comuna o elige un punto en el mapa.'

  if (Object.keys(errores).length > 0) return { ok: false, errores }
  return {
    ok: true,
    datos: {
      bio: formulario.bio,
      servicios: formulario.servicios,
      precios,
      comuna: formulario.comuna,
      latitud: formulario.latitud,
      longitud: formulario.longitud,
      radioKm: formulario.radioKm,
      dias: [...formulario.dias].sort((a, b) => a - b),
      horaInicio: formulario.horaInicio,
      horaFin: formulario.horaFin,
      activo: formulario.activo,
    },
  }
}

export function alternar<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]
}

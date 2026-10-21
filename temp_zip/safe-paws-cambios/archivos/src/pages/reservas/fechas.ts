import type { Servicio } from '@/types/dominio'

/** Todas las fechas se construyen en hora local del navegador (Chile). */

export interface RangoFechas {
  inicio: Date | null
  fin: Date | null
}

export function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias)
}

export function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** `YYYY-MM-DD` en hora local. */
export function claveDia(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function desdeMinutos(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}

/** Día + `HH:MM` → Date local. */
export function fechaConHora(dia: Date, hora: string): Date {
  const minutos = aMinutos(hora)
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(minutos / 60), minutos % 60)
}

/**
 * Semanas del mes (lunes a domingo). Los huecos antes del día 1 y después
 * del último día son `null`. `mes` va de 0 a 11.
 */
export function semanasDelMes(anio: number, mes: number): Array<Array<Date | null>> {
  const primero = new Date(anio, mes, 1)
  const totalDias = new Date(anio, mes + 1, 0).getDate()
  const huecos = (primero.getDay() + 6) % 7 // lunes = 0
  const celdas: Array<Date | null> = Array.from({ length: huecos }, () => null)
  for (let d = 1; d <= totalDias; d++) celdas.push(new Date(anio, mes, d))
  while (celdas.length % 7 !== 0) celdas.push(null)
  const semanas: Array<Array<Date | null>> = []
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7))
  return semanas
}

/** Horas de inicio cada `pasoMin` minutos tal que inicio + duración ≤ hora fin. */
export function horariosDisponibles(horaInicio: string, horaFin: string, duracionMin: number, pasoMin = 30): string[] {
  const desde = aMinutos(horaInicio)
  const hasta = aMinutos(horaFin)
  const horarios: string[] = []
  for (let m = desde; m + duracionMin <= hasta; m += pasoMin) horarios.push(desdeMinutos(m))
  return horarios
}

/**
 * Próximo estado al tocar un día en modo rango. Si `permiteMismoDia` es
 * false (hospedaje), el día de salida debe ser posterior al de llegada.
 */
export function siguienteRango(actual: RangoFechas, dia: Date, permiteMismoDia: boolean): RangoFechas {
  const { inicio, fin } = actual
  if (!inicio || fin) return { inicio: dia, fin: null }
  if (dia < inicio) return { inicio: dia, fin: null }
  if (mismoDia(dia, inicio)) return permiteMismoDia ? { inicio, fin: dia } : { inicio, fin: null }
  return { inicio, fin: dia }
}

export type ResultadoIntervalo = { ok: true; inicio: Date; fin: Date } | { ok: false; motivo: string }

interface DatosIntervalo {
  servicio: Servicio
  rango: RangoFechas
  /** `HH:MM`, solo paseo y visita. */
  hora: string
  /** Minutos, solo paseo y visita. */
  duracionMin: number
  horaInicio: string
  horaFin: string
  /** 0 = domingo … 6 = sábado */
  diasLaborales: number[]
  ahora: Date
}

/** Traduce la selección del formulario a inicio/fin de la reserva. */
export function intervaloReserva(datos: DatosIntervalo): ResultadoIntervalo {
  const { servicio, rango, hora, duracionMin, horaInicio, horaFin, diasLaborales, ahora } = datos
  if (!rango.inicio) return { ok: false, motivo: 'Elige una fecha en el calendario.' }

  let inicio: Date
  let fin: Date

  if (servicio === 'hospedaje') {
    if (!rango.fin) return { ok: false, motivo: 'Elige el día de salida (mínimo una noche).' }
    inicio = fechaConHora(rango.inicio, horaInicio)
    fin = fechaConHora(rango.fin, horaInicio)
  } else if (servicio === 'guarderia') {
    const ultimo = rango.fin ?? rango.inicio
    for (let d = inicioDelDia(rango.inicio); d <= ultimo; d = sumarDias(d, 1)) {
      if (!diasLaborales.includes(d.getDay())) {
        return { ok: false, motivo: 'El rango incluye días en que el cuidador no trabaja.' }
      }
    }
    inicio = fechaConHora(rango.inicio, horaInicio)
    fin = fechaConHora(ultimo, horaFin)
  } else {
    if (!hora) return { ok: false, motivo: 'Elige una hora de inicio.' }
    if (!(duracionMin > 0)) return { ok: false, motivo: 'Elige la duración.' }
    inicio = fechaConHora(rango.inicio, hora)
    fin = new Date(inicio.getTime() + duracionMin * 60_000)
  }

  if (!(fin > inicio)) return { ok: false, motivo: 'El horario del cuidador no permite esta reserva.' }
  if (inicio <= ahora) return { ok: false, motivo: 'Ese horario ya pasó. Elige uno futuro.' }
  return { ok: true, inicio, fin }
}

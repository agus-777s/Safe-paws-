const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function esAyer(fecha: Date, ahora: Date): boolean {
  const ayer = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1)
  return mismoDia(fecha, ayer)
}

function hora(fecha: Date): string {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`
}

function diaMes(fecha: Date, ahora: Date): string {
  const base = `${fecha.getDate()} ${MESES[fecha.getMonth()]}`
  return fecha.getFullYear() === ahora.getFullYear() ? base : `${base} ${fecha.getFullYear()}`
}

function aFecha(iso: string | null): Date | null {
  if (!iso) return null
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

/** Última actividad de una conversación: "hoy 14:05", "ayer", "12 oct" o "12 oct 2025". */
export function formatearActividad(iso: string | null, ahora: Date = new Date()): string {
  const fecha = aFecha(iso)
  if (!fecha) return ''
  if (mismoDia(fecha, ahora)) return `hoy ${hora(fecha)}`
  if (esAyer(fecha, ahora)) return 'ayer'
  return diaMes(fecha, ahora)
}

/** Marca de tiempo de un mensaje: "14:05", "ayer 14:05" o "12 oct 14:05". */
export function formatearHoraMensaje(iso: string | null, ahora: Date = new Date()): string {
  const fecha = aFecha(iso)
  if (!fecha) return ''
  if (mismoDia(fecha, ahora)) return hora(fecha)
  if (esAyer(fecha, ahora)) return `ayer ${hora(fecha)}`
  return `${diaMes(fecha, ahora)} ${hora(fecha)}`
}

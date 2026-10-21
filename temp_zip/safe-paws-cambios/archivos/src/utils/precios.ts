import type { Servicio } from '@/types/dominio'

const MS_POR_DIA = 24 * 60 * 60 * 1000

/** Número de día de calendario en la hora local del navegador (Chile). */
function diaLocal(fecha: Date): number {
  return Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) / MS_POR_DIA
}

/**
 * Unidades a cobrar por días de calendario (no por horas: el cambio de horario
 * no altera el precio). Hospedaje = noches (mínimo 1); paseo, guardería y
 * visita = días de servicio. Misma regla que `public.calcular_precio_reserva`
 * en Supabase (America/Santiago), que es la que manda.
 */
export function unidadesCobrables(servicio: Servicio, inicio: Date, fin: Date): number {
  if (!(fin.getTime() > inicio.getTime())) return 0
  const dias = diaLocal(fin) - diaLocal(inicio)
  return servicio === 'hospedaje' ? Math.max(1, dias) : dias + 1
}

export function calcularPrecio(servicio: Servicio, inicio: Date, fin: Date, precioUnitario: number | null): number {
  if (precioUnitario == null) return 0
  return unidadesCobrables(servicio, inicio, fin) * precioUnitario
}

const formatoClp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

export function formatearClp(monto: number): string {
  return formatoClp.format(monto)
}

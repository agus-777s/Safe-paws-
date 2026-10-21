import type { Mascota, RecordatorioSalud } from '@/types/dominio'

/** Fecha local en formato `YYYY-MM-DD` (mismo formato que guarda la base). */
export function fechaIsoLocal(fecha: Date = new Date()): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

export interface RecordatorioConEstado extends RecordatorioSalud {
  vencido: boolean
}

/** Separa recordatorios en próximos (ascendente, con marca de vencido) y completados (más recientes primero). */
export function separarRecordatorios(
  recordatorios: RecordatorioSalud[],
  hoyIso: string,
): { proximos: RecordatorioConEstado[]; completados: RecordatorioConEstado[] } {
  const conEstado = recordatorios.map((r) => ({ ...r, vencido: !r.completado && r.fecha < hoyIso }))
  return {
    proximos: conEstado.filter((r) => !r.completado).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    completados: conEstado.filter((r) => r.completado).sort((a, b) => b.fecha.localeCompare(a.fecha)),
  }
}

const formatoNumero = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

export function formatearEdad(edadAnos: number): string {
  return `${formatoNumero.format(edadAnos)} ${edadAnos === 1 ? 'año' : 'años'}`
}

export function formatearPeso(pesoKg: number): string {
  return `${formatoNumero.format(pesoKg)} kg`
}

/** "Perro · Beagle · 3 años" o "Ave · Canario · Grupo de 4". */
export function describirMascota(
  mascota: Pick<Mascota, 'tipo' | 'raza' | 'edadAnos' | 'esGrupo' | 'cantidad'>,
): string {
  const partes: string[] = [mascota.tipo]
  if (mascota.raza.trim()) partes.push(mascota.raza.trim())
  if (mascota.esGrupo) partes.push(`Grupo de ${mascota.cantidad}`)
  else if (mascota.edadAnos != null) partes.push(formatearEdad(mascota.edadAnos))
  return partes.join(' · ')
}

/** Convierte "2,5" o "2.5" a número; vacío → null; inválido → NaN. */
export function leerDecimal(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (!limpio) return null
  return /^\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : Number.NaN
}

export interface CamposMascota {
  nombre: string
  tipo: string
  edad: string
  peso: string
  esGrupo: boolean
  cantidad: string
}

export type ErroresMascota = Partial<Record<'nombre' | 'tipo' | 'edad' | 'peso' | 'cantidad', string>>

export function validarMascota(campos: CamposMascota): ErroresMascota {
  const errores: ErroresMascota = {}
  if (!campos.nombre.trim()) errores.nombre = 'Escribe el nombre de tu mascota.'
  else if (campos.nombre.trim().length > 60) errores.nombre = 'El nombre es demasiado largo.'
  if (!campos.tipo) errores.tipo = 'Elige el tipo de mascota.'

  const edad = leerDecimal(campos.edad)
  if (edad !== null && (Number.isNaN(edad) || edad < 0 || edad > 50)) errores.edad = 'Ingresa una edad válida (0 a 50 años).'

  const peso = leerDecimal(campos.peso)
  if (peso !== null && (Number.isNaN(peso) || peso <= 0 || peso > 2000)) errores.peso = 'Ingresa un peso válido en kg.'

  if (campos.esGrupo) {
    const cantidad = Number(campos.cantidad)
    if (!Number.isInteger(cantidad) || cantidad < 2 || cantidad > 500) errores.cantidad = 'Un grupo debe tener al menos 2 animales.'
  }
  return errores
}

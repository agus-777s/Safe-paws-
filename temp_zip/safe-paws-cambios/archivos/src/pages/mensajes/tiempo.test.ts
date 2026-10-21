import { describe, expect, it } from 'vitest'
import { formatearActividad, formatearHoraMensaje } from './tiempo'

const ahora = new Date(2026, 9, 20, 18, 30) // 20 oct 2026, 18:30 local

describe('formatearActividad', () => {
  it('muestra la hora si fue hoy', () => {
    expect(formatearActividad(new Date(2026, 9, 20, 14, 5).toISOString(), ahora)).toBe('hoy 14:05')
  })

  it('muestra "ayer" si fue el día anterior', () => {
    expect(formatearActividad(new Date(2026, 9, 19, 23, 59).toISOString(), ahora)).toBe('ayer')
  })

  it('muestra día y mes abreviado dentro del mismo año', () => {
    expect(formatearActividad(new Date(2026, 9, 12, 9, 0).toISOString(), ahora)).toBe('12 oct')
    expect(formatearActividad(new Date(2026, 0, 3, 9, 0).toISOString(), ahora)).toBe('3 ene')
  })

  it('agrega el año si es de otro año', () => {
    expect(formatearActividad(new Date(2025, 11, 31, 9, 0).toISOString(), ahora)).toBe('31 dic 2025')
  })

  it('devuelve vacío sin fecha o con fecha inválida', () => {
    expect(formatearActividad(null, ahora)).toBe('')
    expect(formatearActividad('no-es-fecha', ahora)).toBe('')
  })
})

describe('formatearHoraMensaje', () => {
  it('solo hora si es de hoy', () => {
    expect(formatearHoraMensaje(new Date(2026, 9, 20, 8, 7).toISOString(), ahora)).toBe('08:07')
  })

  it('antepone "ayer" o la fecha', () => {
    expect(formatearHoraMensaje(new Date(2026, 9, 19, 21, 0).toISOString(), ahora)).toBe('ayer 21:00')
    expect(formatearHoraMensaje(new Date(2026, 9, 1, 10, 15).toISOString(), ahora)).toBe('1 oct 10:15')
  })
})

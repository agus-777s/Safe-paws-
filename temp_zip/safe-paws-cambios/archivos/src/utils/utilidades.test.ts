import { describe, expect, it } from 'vitest'
import { distanciaKm, formatearDistancia, formatearDuracion, largoRutaKm } from './geo'
import { calcularPrecio, formatearClp, unidadesCobrables } from './precios'

describe('geo', () => {
  it('calcula distancias reales en Santiago', () => {
    const plazaDeArmas = { latitud: -33.4378, longitud: -70.6505 }
    const costanera = { latitud: -33.4173, longitud: -70.6062 }
    expect(distanciaKm(plazaDeArmas, costanera)).toBeCloseTo(4.67, 1)
    expect(distanciaKm(plazaDeArmas, plazaDeArmas)).toBe(0)
  })

  it('suma el largo de una ruta', () => {
    const a = { latitud: 0, longitud: 0 }
    const b = { latitud: 0, longitud: 0.01 }
    const c = { latitud: 0, longitud: 0.02 }
    expect(largoRutaKm([a, b, c])).toBeCloseTo(distanciaKm(a, c), 6)
    expect(largoRutaKm([a])).toBe(0)
  })

  it('formatea distancias y duraciones', () => {
    expect(formatearDistancia(0.35)).toBe('350 m')
    expect(formatearDistancia(2.345)).toBe('2,3 km')
    expect(formatearDuracion(12 * 60000)).toBe('12 min')
    expect(formatearDuracion(65 * 60000)).toBe('1 h 05 min')
  })
})

describe('precios', () => {
  // Fechas locales (los tests corren en America/Santiago, ver vitest.config.ts).
  const inicio = new Date(2026, 10, 1, 10, 0)
  it('cobra por días de calendario: noches en hospedaje, días en el resto', () => {
    expect(unidadesCobrables('paseo', inicio, new Date(2026, 10, 1, 11, 0))).toBe(1)
    expect(unidadesCobrables('hospedaje', inicio, new Date(2026, 10, 1, 18, 0))).toBe(1)
    expect(unidadesCobrables('hospedaje', inicio, new Date(2026, 10, 3, 10, 0))).toBe(2)
    expect(unidadesCobrables('hospedaje', inicio, new Date(2026, 10, 3, 23, 0))).toBe(2)
    expect(unidadesCobrables('guarderia', new Date(2026, 10, 2, 8, 0), new Date(2026, 10, 6, 18, 0))).toBe(5)
    expect(unidadesCobrables('paseo', inicio, inicio)).toBe(0)
  })

  it('el cambio de horario no cambia el precio', () => {
    // Abril 2027: el día del cambio dura 25 h; siguen siendo 2 noches.
    expect(unidadesCobrables('hospedaje', new Date(2027, 3, 3, 12, 0), new Date(2027, 3, 5, 12, 0))).toBe(2)
    // Septiembre 2026: el día del cambio dura 23 h; sigue siendo 1 noche.
    expect(unidadesCobrables('hospedaje', new Date(2026, 8, 5, 12, 0), new Date(2026, 8, 6, 12, 0))).toBe(1)
  })

  it('calcula el total y formatea en CLP', () => {
    expect(calcularPrecio('hospedaje', inicio, new Date(2026, 10, 3, 10, 0), 25000)).toBe(50000)
    expect(calcularPrecio('hospedaje', inicio, new Date(2026, 10, 3, 10, 0), null)).toBe(0)
    expect(formatearClp(50000).replace(/\s/g, ' ')).toMatch(/\$\s?50\.000/)
  })
})

import { describe, expect, it } from 'vitest'
import type { RecordatorioSalud } from '@/types/dominio'
import { describirMascota, fechaIsoLocal, separarRecordatorios, validarMascota } from './logica'

function recordatorio(id: string, fecha: string, completado = false): RecordatorioSalud {
  return { id, mascotaId: 'm1', titulo: id, tipo: 'vacuna', fecha, completado }
}

describe('fechaIsoLocal', () => {
  it('formatea en YYYY-MM-DD local', () => {
    expect(fechaIsoLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('separarRecordatorios', () => {
  it('separa próximos y completados, marca vencidos y ordena', () => {
    const resultado = separarRecordatorios(
      [
        recordatorio('futuro', '2026-11-01'),
        recordatorio('hecho-viejo', '2026-01-01', true),
        recordatorio('vencido', '2026-10-01'),
        recordatorio('hoy', '2026-10-20'),
        recordatorio('hecho-nuevo', '2026-09-01', true),
      ],
      '2026-10-20',
    )
    expect(resultado.proximos.map((r) => [r.id, r.vencido])).toEqual([
      ['vencido', true],
      ['hoy', false],
      ['futuro', false],
    ])
    expect(resultado.completados.map((r) => r.id)).toEqual(['hecho-nuevo', 'hecho-viejo'])
  })

  it('maneja lista vacía', () => {
    expect(separarRecordatorios([], '2026-10-20')).toEqual({ proximos: [], completados: [] })
  })
})

describe('describirMascota', () => {
  it('une tipo, raza y edad', () => {
    expect(describirMascota({ tipo: 'Perro', raza: 'Beagle', edadAnos: 3, esGrupo: false, cantidad: 1 })).toBe(
      'Perro · Beagle · 3 años',
    )
    expect(describirMascota({ tipo: 'Gato', raza: '', edadAnos: 1, esGrupo: false, cantidad: 1 })).toBe('Gato · 1 año')
    expect(describirMascota({ tipo: 'Gato', raza: '', edadAnos: 0.5, esGrupo: false, cantidad: 1 })).toBe(
      'Gato · 0,5 años',
    )
    expect(describirMascota({ tipo: 'Ave', raza: 'Canario', edadAnos: null, esGrupo: true, cantidad: 4 })).toBe(
      'Ave · Canario · Grupo de 4',
    )
  })
})

describe('validarMascota', () => {
  const base = { nombre: 'Toby', tipo: 'Perro', edad: '', peso: '', esGrupo: false, cantidad: '' }

  it('acepta datos mínimos válidos', () => {
    expect(validarMascota(base)).toEqual({})
  })

  it('exige nombre y tipo', () => {
    const errores = validarMascota({ ...base, nombre: '  ', tipo: '' })
    expect(errores.nombre).toBeDefined()
    expect(errores.tipo).toBeDefined()
  })

  it('valida números decimales con coma o punto', () => {
    expect(validarMascota({ ...base, edad: '2,5', peso: '12.3' })).toEqual({})
    expect(validarMascota({ ...base, edad: '-1' }).edad).toBeDefined()
    expect(validarMascota({ ...base, peso: 'abc' }).peso).toBeDefined()
    expect(validarMascota({ ...base, edad: '60' }).edad).toBeDefined()
  })

  it('exige cantidad ≥ 2 para grupos', () => {
    expect(validarMascota({ ...base, esGrupo: true, cantidad: '1' }).cantidad).toBeDefined()
    expect(validarMascota({ ...base, esGrupo: true, cantidad: '3' })).toEqual({})
  })
})

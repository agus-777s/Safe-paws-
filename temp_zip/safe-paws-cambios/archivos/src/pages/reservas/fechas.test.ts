import { describe, expect, it } from 'vitest'
import {
  claveDia,
  fechaConHora,
  horariosDisponibles,
  inicioDelDia,
  intervaloReserva,
  semanasDelMes,
  siguienteRango,
} from './fechas'

const dia = (anio: number, mes: number, d: number) => new Date(anio, mes - 1, d)

describe('fechas del calendario', () => {
  it('arma semanas de lunes a domingo con huecos al inicio', () => {
    // Octubre 2026 parte un jueves.
    const semanas = semanasDelMes(2026, 9)
    expect(semanas[0].slice(0, 3)).toEqual([null, null, null])
    expect(semanas[0][3]?.getDate()).toBe(1)
    expect(semanas.every((semana) => semana.length === 7)).toBe(true)
    const dias = semanas.flat().filter((d): d is Date => d !== null)
    expect(dias).toHaveLength(31)
    expect(dias[30].getDate()).toBe(31)
  })

  it('combina día y hora en hora local', () => {
    const resultado = fechaConHora(dia(2026, 10, 20), '08:30')
    expect(resultado.getHours()).toBe(8)
    expect(resultado.getMinutes()).toBe(30)
    expect(claveDia(resultado)).toBe('2026-10-20')
    expect(inicioDelDia(resultado).getHours()).toBe(0)
  })

  it('lista horarios cada 30 minutos que caben en la jornada', () => {
    expect(horariosDisponibles('08:00', '10:00', 60)).toEqual(['08:00', '08:30', '09:00'])
    expect(horariosDisponibles('08:00', '09:00', 90)).toEqual([])
    expect(horariosDisponibles('19:00', '08:00', 30)).toEqual([])
  })
})

describe('selección de rango', () => {
  it('empieza, cierra y reinicia el rango', () => {
    const a = dia(2026, 11, 2)
    const b = dia(2026, 11, 5)
    let rango = siguienteRango({ inicio: null, fin: null }, a, false)
    expect(rango).toEqual({ inicio: a, fin: null })
    rango = siguienteRango(rango, b, false)
    expect(rango).toEqual({ inicio: a, fin: b })
    rango = siguienteRango(rango, b, false)
    expect(rango).toEqual({ inicio: b, fin: null })
  })

  it('un día anterior al inicio reinicia el rango', () => {
    const rango = siguienteRango({ inicio: dia(2026, 11, 5), fin: null }, dia(2026, 11, 2), false)
    expect(rango).toEqual({ inicio: dia(2026, 11, 2), fin: null })
  })

  it('hospedaje exige al menos una noche; guardería admite el mismo día', () => {
    const a = dia(2026, 11, 2)
    expect(siguienteRango({ inicio: a, fin: null }, dia(2026, 11, 2), false)).toEqual({ inicio: a, fin: null })
    expect(siguienteRango({ inicio: a, fin: null }, dia(2026, 11, 2), true)).toEqual({ inicio: a, fin: a })
  })
})

describe('intervaloReserva', () => {
  const base = {
    horaInicio: '08:00',
    horaFin: '19:00',
    diasLaborales: [1, 2, 3, 4, 5],
    ahora: dia(2026, 10, 20),
  }

  it('hospedaje: de la hora de inicio del primer día a la misma hora del último', () => {
    const resultado = intervaloReserva({
      ...base,
      servicio: 'hospedaje',
      rango: { inicio: dia(2026, 11, 2), fin: dia(2026, 11, 4) },
      hora: '',
      duracionMin: 0,
    })
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.inicio).toEqual(new Date(2026, 10, 2, 8, 0))
    expect(resultado.fin).toEqual(new Date(2026, 10, 4, 8, 0))
  })

  it('hospedaje sin día de salida no es válido', () => {
    const resultado = intervaloReserva({
      ...base,
      servicio: 'hospedaje',
      rango: { inicio: dia(2026, 11, 2), fin: null },
      hora: '',
      duracionMin: 0,
    })
    expect(resultado.ok).toBe(false)
  })

  it('guardería: de hora inicio del primer día a hora fin del último; un solo día vale', () => {
    const resultado = intervaloReserva({
      ...base,
      servicio: 'guarderia',
      rango: { inicio: dia(2026, 11, 2), fin: null },
      hora: '',
      duracionMin: 0,
    })
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.inicio).toEqual(new Date(2026, 10, 2, 8, 0))
    expect(resultado.fin).toEqual(new Date(2026, 10, 2, 19, 0))
  })

  it('guardería rechaza rangos con días que el cuidador no trabaja', () => {
    const resultado = intervaloReserva({
      ...base,
      servicio: 'guarderia',
      // Viernes 6 a lunes 9 de noviembre pasa por el fin de semana.
      rango: { inicio: dia(2026, 11, 6), fin: dia(2026, 11, 9) },
      hora: '',
      duracionMin: 0,
    })
    expect(resultado.ok).toBe(false)
  })

  it('paseo: fecha + hora + duración', () => {
    const resultado = intervaloReserva({
      ...base,
      servicio: 'paseo',
      rango: { inicio: dia(2026, 11, 2), fin: null },
      hora: '10:30',
      duracionMin: 45,
    })
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.inicio).toEqual(new Date(2026, 10, 2, 10, 30))
    expect(resultado.fin).toEqual(new Date(2026, 10, 2, 11, 15))
  })

  it('rechaza horarios en el pasado o sin hora elegida', () => {
    const pasado = intervaloReserva({
      ...base,
      ahora: new Date(2026, 10, 2, 12, 0),
      servicio: 'visita',
      rango: { inicio: dia(2026, 11, 2), fin: null },
      hora: '10:00',
      duracionMin: 30,
    })
    expect(pasado.ok).toBe(false)
    const sinHora = intervaloReserva({
      ...base,
      servicio: 'visita',
      rango: { inicio: dia(2026, 11, 2), fin: null },
      hora: '',
      duracionMin: 30,
    })
    expect(sinHora.ok).toBe(false)
  })
})

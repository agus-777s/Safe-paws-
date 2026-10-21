import { describe, expect, it } from 'vitest'
import {
  accionesDisponibles,
  agregarSinDuplicar,
  debeRegistrarPunto,
  esProxima,
  formatearRangoFechas,
  idContraparte,
  ocurreHoy,
  puedeVerSeguimiento,
  rolEnReserva,
  separarPorTiempo,
} from './logicaReservas'
import type { EstadoReserva } from '@/types/dominio'

const destinos = (rol: 'dueno' | 'cuidador', estado: EstadoReserva) =>
  accionesDisponibles(rol, estado).map((a) => a.destino)

describe('rol y acciones', () => {
  const reserva = { duenoId: 'd', cuidadorId: 'c' }

  it('detecta el rol y la contraparte', () => {
    expect(rolEnReserva(reserva, 'd')).toBe('dueno')
    expect(rolEnReserva(reserva, 'c')).toBe('cuidador')
    expect(rolEnReserva(reserva, 'x')).toBeNull()
    expect(idContraparte(reserva, 'dueno')).toBe('c')
    expect(idContraparte(reserva, 'cuidador')).toBe('d')
  })

  it('ofrece al cuidador aceptar/rechazar, iniciar y finalizar', () => {
    expect(destinos('cuidador', 'pendiente')).toEqual(['aceptada', 'rechazada'])
    expect(destinos('cuidador', 'aceptada')).toEqual(['en_curso', 'cancelada'])
    expect(destinos('cuidador', 'en_curso')).toEqual(['completada'])
    expect(destinos('cuidador', 'completada')).toEqual([])
  })

  it('ofrece al dueño solo cancelar mientras no empieza', () => {
    expect(destinos('dueno', 'pendiente')).toEqual(['cancelada'])
    expect(destinos('dueno', 'aceptada')).toEqual(['cancelada'])
    expect(destinos('dueno', 'en_curso')).toEqual([])
    expect(destinos('dueno', 'cancelada')).toEqual([])
  })

  it('marca como destructivas cancelar y rechazar', () => {
    const destructivas = accionesDisponibles('cuidador', 'pendiente').filter((a) => a.destructiva)
    expect(destructivas.map((a) => a.destino)).toEqual(['rechazada'])
    expect(accionesDisponibles('dueno', 'aceptada')[0].destructiva).toBe(true)
  })

  it('permite ver seguimiento solo en estados con servicio', () => {
    expect(puedeVerSeguimiento('aceptada')).toBe(true)
    expect(puedeVerSeguimiento('en_curso')).toBe(true)
    expect(puedeVerSeguimiento('completada')).toBe(true)
    expect(puedeVerSeguimiento('pendiente')).toBe(false)
    expect(puedeVerSeguimiento('cancelada')).toBe(false)
  })
})

describe('tiempo', () => {
  const ahora = new Date('2026-11-10T12:00:00Z').getTime()
  const base = { inicio: '2026-11-11T10:00:00Z', fin: '2026-11-11T11:00:00Z' }

  it('separa próximas y pasadas', () => {
    expect(esProxima({ ...base, estado: 'pendiente' }, ahora)).toBe(true)
    expect(esProxima({ ...base, estado: 'cancelada' }, ahora)).toBe(false)
    expect(esProxima({ estado: 'aceptada', fin: '2026-11-01T00:00:00Z' }, ahora)).toBe(false)
    expect(esProxima({ estado: 'en_curso', fin: '2026-11-01T00:00:00Z' }, ahora)).toBe(true)
  })

  it('ordena próximas ascendente y pasadas descendente', () => {
    const lista = [
      { id: 'a', estado: 'aceptada' as const, inicio: '2026-11-20T10:00:00Z', fin: '2026-11-20T11:00:00Z' },
      { id: 'b', estado: 'pendiente' as const, inicio: '2026-11-12T10:00:00Z', fin: '2026-11-12T11:00:00Z' },
      { id: 'c', estado: 'completada' as const, inicio: '2026-10-01T10:00:00Z', fin: '2026-10-01T11:00:00Z' },
      { id: 'd', estado: 'completada' as const, inicio: '2026-11-01T10:00:00Z', fin: '2026-11-01T11:00:00Z' },
    ]
    const { proximas, pasadas } = separarPorTiempo(lista, ahora)
    expect(proximas.map((r) => r.id)).toEqual(['b', 'a'])
    expect(pasadas.map((r) => r.id)).toEqual(['d', 'c'])
  })

  it('detecta reservas que ocurren hoy', () => {
    const hoy = new Date(2026, 10, 10, 9, 0)
    const iso = (d: number, h: number) => new Date(2026, 10, d, h, 0).toISOString()
    expect(ocurreHoy({ inicio: iso(10, 15), fin: iso(10, 16) }, hoy)).toBe(true)
    expect(ocurreHoy({ inicio: iso(8, 10), fin: iso(12, 10) }, hoy)).toBe(true)
    expect(ocurreHoy({ inicio: iso(11, 10), fin: iso(11, 11) }, hoy)).toBe(false)
    expect(ocurreHoy({ inicio: iso(9, 10), fin: iso(9, 11) }, hoy)).toBe(false)
  })

  it('formatea rangos de fechas en es-CL', () => {
    const mismoDia = formatearRangoFechas(new Date(2026, 10, 3, 10, 0).toISOString(), new Date(2026, 10, 3, 11, 30).toISOString())
    expect(mismoDia).toContain('10:00')
    expect(mismoDia).toContain('11:30')
    expect(mismoDia).toContain('·')
    const varios = formatearRangoFechas(new Date(2026, 10, 3, 10, 0).toISOString(), new Date(2026, 10, 5, 12, 0).toISOString())
    expect(varios).toContain('→')
    expect(formatearRangoFechas('no-fecha', 'tampoco')).toBe('')
  })
})

describe('seguimiento', () => {
  const origen = { latitud: -33.4378, longitud: -70.6505 }
  const cerca = { latitud: -33.43785, longitud: -70.6505 } // ~5,5 m
  const lejos = { latitud: -33.4381, longitud: -70.6505 } // ~33 m

  it('registra siempre el primer punto', () => {
    expect(debeRegistrarPunto(null, origen, 0)).toBe(true)
  })

  it('limita a un punto cada 10 s y con movimiento > 10 m', () => {
    const ultimo = { ...origen, tiempo: 0 }
    expect(debeRegistrarPunto(ultimo, lejos, 5_000)).toBe(false)
    expect(debeRegistrarPunto(ultimo, cerca, 15_000)).toBe(false)
    expect(debeRegistrarPunto(ultimo, lejos, 10_000)).toBe(true)
  })

  it('agrega sin duplicar por id', () => {
    const lista = [{ id: 1 }, { id: 2 }]
    expect(agregarSinDuplicar(lista, { id: 2 })).toBe(lista)
    expect(agregarSinDuplicar(lista, { id: 3 }).map((x) => x.id)).toEqual([1, 2, 3])
  })
})

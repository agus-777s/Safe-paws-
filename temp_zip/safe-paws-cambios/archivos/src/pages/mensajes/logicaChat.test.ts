import { describe, expect, it } from 'vitest'
import type { Mensaje } from '@/types/dominio'
import { agregarMensaje, iniciales, nombreCompleto, ultimoLeidoPropio } from './logicaChat'

function mensaje(id: string, autorId: string, creadoEn: string, leidoEn: string | null = null): Mensaje {
  return { id, conversacionId: 'c1', autorId, texto: id, fotoUrl: null, leidoEn, creadoEn }
}

describe('agregarMensaje', () => {
  it('no duplica por id y actualiza el existente', () => {
    const lista = [mensaje('a', 'yo', '2026-10-20T10:00:00Z')]
    const resultado = agregarMensaje(lista, { ...lista[0], leidoEn: '2026-10-20T10:01:00Z' })
    expect(resultado).toHaveLength(1)
    expect(resultado[0].leidoEn).toBe('2026-10-20T10:01:00Z')
  })

  it('agrega al final y reordena si llega fuera de orden', () => {
    const lista = [mensaje('a', 'yo', '2026-10-20T10:00:00Z'), mensaje('c', 'yo', '2026-10-20T10:05:00Z')]
    expect(agregarMensaje(lista, mensaje('b', 'otro', '2026-10-20T10:02:00Z')).map((m) => m.id)).toEqual(['a', 'b', 'c'])
    expect(agregarMensaje(lista, mensaje('d', 'otro', '2026-10-20T10:09:00Z')).map((m) => m.id)).toEqual(['a', 'c', 'd'])
  })
})

describe('ultimoLeidoPropio', () => {
  it('devuelve el último mensaje propio leído', () => {
    const lista = [
      mensaje('a', 'yo', '1', 'x'),
      mensaje('b', 'yo', '2', 'x'),
      mensaje('c', 'otro', '3', 'x'),
      mensaje('d', 'yo', '4'),
    ]
    expect(ultimoLeidoPropio(lista, 'yo')).toBe('b')
    expect(ultimoLeidoPropio([mensaje('d', 'yo', '4')], 'yo')).toBeNull()
  })
})

describe('nombres', () => {
  it('arma nombre e iniciales con respaldo', () => {
    expect(nombreCompleto({ nombre: 'Ana', apellido: 'Rojas' })).toBe('Ana Rojas')
    expect(nombreCompleto(null)).toBe('Usuario de Safe Paws')
    expect(iniciales({ nombre: 'ana', apellido: 'rojas' })).toBe('AR')
    expect(iniciales({ nombre: '', apellido: '' })).toBe('?')
  })
})

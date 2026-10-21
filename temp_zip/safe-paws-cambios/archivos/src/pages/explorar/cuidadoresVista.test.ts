import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/supabase/client', () => ({ supabaseConfigurado: true }))

import type { CuidadorPublico } from '@/types/dominio'
import { filtrarYOrdenar, iniciales, precioDesde, serviciosConPrecio } from './cuidadoresVista'

function cuidador(parcial: Partial<CuidadorPublico>): CuidadorPublico {
  return {
    id: 'x',
    bio: '',
    servicios: [],
    precios: { paseo: null, hospedaje: null, guarderia: null, visita: null },
    comuna: '',
    latitud: null,
    longitud: null,
    radioKm: 5,
    dias: [],
    horaInicio: '08:00',
    horaFin: '19:00',
    verificado: false,
    calificacion: 0,
    totalResenas: 0,
    nombre: '',
    apellido: '',
    avatarUrl: null,
    descripcion: '',
    ...parcial,
  }
}

describe('vista de cuidadores', () => {
  it('iniciales con respaldo', () => {
    expect(iniciales('ana', 'pérez')).toBe('AP')
    expect(iniciales('', '')).toBe('🐾')
  })

  it('solo considera servicios ofrecidos con precio', () => {
    const c = cuidador({
      servicios: ['paseo', 'hospedaje', 'visita'],
      precios: { paseo: 8000, hospedaje: 20000, guarderia: 5000, visita: null },
    })
    expect(serviciosConPrecio(c)).toEqual(['paseo', 'hospedaje'])
    expect(precioDesde(c, null)).toEqual({ monto: 8000, unidad: 'por paseo' })
    expect(precioDesde(c, 'hospedaje')).toEqual({ monto: 20000, unidad: 'por noche' })
    expect(precioDesde(c, 'guarderia')).toBeNull()
  })

  it('filtra sin tildes y ordena por distancia dejando sin coordenadas al final', () => {
    const lejos = cuidador({ id: 'lejos', nombre: 'Lucía', comuna: 'Maipú', latitud: -33.51, longitud: -70.76 })
    const cerca = cuidador({ id: 'cerca', nombre: 'Pedro', comuna: 'Ñuñoa', latitud: -33.456, longitud: -70.597 })
    const sin = cuidador({ id: 'sin', nombre: 'Sin', comuna: 'Ñuñoa' })
    const yo = { latitud: -33.45, longitud: -70.6 }
    expect(filtrarYOrdenar([lejos, sin, cerca], '', yo).map((r) => r.cuidador.id)).toEqual(['cerca', 'lejos', 'sin'])
    expect(filtrarYOrdenar([lejos, sin, cerca], 'nunoa', null).map((r) => r.cuidador.id)).toEqual(['sin', 'cerca'])
    expect(filtrarYOrdenar([lejos], 'lucia', null)[0].distancia).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { alternar, formularioDesdePerfil, leerPrecio, validarFormularioPerfil } from './formularioPerfil'
import type { PerfilCuidador } from '@/types/dominio'

const base = () => ({
  ...formularioDesdePerfil(null),
  servicios: ['paseo' as const],
  precios: { paseo: '12.000', hospedaje: '', guarderia: '', visita: '' },
  comuna: 'Ñuñoa',
})

describe('formulario de perfil de cuidador', () => {
  it('lee precios enteros en CLP', () => {
    expect(leerPrecio('12.000')).toBe(12000)
    expect(leerPrecio('$ 8000')).toBe(8000)
    expect(leerPrecio('0')).toBeNull()
    expect(leerPrecio('12,5')).toBeNull()
    expect(leerPrecio('')).toBeNull()
  })

  it('valida y arma los datos para guardar', () => {
    const resultado = validarFormularioPerfil({ ...base(), dias: [5, 1, 3] })
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.datos.precios).toEqual({ paseo: 12000, hospedaje: null, guarderia: null, visita: null })
    expect(resultado.datos.dias).toEqual([1, 3, 5])
  })

  it('exige al menos un servicio', () => {
    const resultado = validarFormularioPerfil({ ...base(), servicios: [] })
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(resultado.errores.servicios).toBeDefined()
  })

  it('exige precio para cada servicio elegido e ignora los no elegidos', () => {
    const resultado = validarFormularioPerfil({ ...base(), servicios: ['paseo', 'hospedaje'] })
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(resultado.errores.precio_hospedaje).toBeDefined()
    expect(resultado.errores.precio_paseo).toBeUndefined()
  })

  it('exige hora de término posterior a la de inicio', () => {
    const resultado = validarFormularioPerfil({ ...base(), horaInicio: '18:00', horaFin: '09:00' })
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(resultado.errores.horario).toMatch(/posterior/)
  })

  it('carga un perfil existente', () => {
    const perfil: PerfilCuidador = {
      id: 'c',
      bio: 'Hola',
      servicios: ['visita'],
      precios: { paseo: null, hospedaje: null, guarderia: null, visita: 9000 },
      comuna: 'Macul',
      latitud: -33.5,
      longitud: -70.6,
      radioKm: 10,
      dias: [6],
      horaInicio: '09:00',
      horaFin: '13:00',
      verificado: false,
      calificacion: 0,
      totalResenas: 0,
      activo: false,
    }
    const formulario = formularioDesdePerfil(perfil)
    expect(formulario.precios.visita).toBe('9000')
    expect(formulario.precios.paseo).toBe('')
    expect(formulario.activo).toBe(false)
  })

  it('alterna valores en una lista', () => {
    expect(alternar([1, 2], 2)).toEqual([1])
    expect(alternar([1], 3)).toEqual([1, 3])
  })
})

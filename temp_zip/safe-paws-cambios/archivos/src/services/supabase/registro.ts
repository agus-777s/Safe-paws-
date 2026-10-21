import { guardarPerfilCuidador } from './cuidadores'
import { subirFoto } from './fotos'
import { crearMascota, listarMascotas } from './mascotas'
import { guardarPerfil } from './perfiles'
import type { Servicio } from '@/types/dominio'
import type { DatosCuidador, DatosMascota, Perfil, TipoMascota } from '@/types/perfil'
import { DIAS_SEMANA, esRolCuidador, esRolDueno } from '@/types/perfil'

const SERVICIO_DESDE_REGISTRO: Record<string, Servicio> = {
  Paseo: 'paseo',
  Hospedaje: 'hospedaje',
  Guardería: 'guarderia',
  'Visita a domicilio': 'visita',
}

function aEntero(texto: string): number | null {
  const limpio = texto.replace(/[^\d]/g, '')
  return limpio ? Number(limpio) : null
}

function aDecimal(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (!limpio) return null
  const numero = Number(limpio)
  return Number.isFinite(numero) && numero >= 0 ? numero : null
}

/** El wizard pide precio por paseo y por noche; visita y guardería parten de esos valores. */
export function datosCuidadorDesdeRegistro(datos: DatosCuidador) {
  const servicios = [...new Set(datos.servicios.map((s) => SERVICIO_DESDE_REGISTRO[s]).filter(Boolean))]
  const precioPaseo = aEntero(datos.precioPaseo)
  const precioNoche = aEntero(datos.precioNoche)
  return {
    bio: '',
    servicios,
    precios: {
      paseo: servicios.includes('paseo') ? (precioPaseo ?? precioNoche) : null,
      hospedaje: servicios.includes('hospedaje') ? (precioNoche ?? precioPaseo) : null,
      guarderia: servicios.includes('guarderia') ? (precioNoche ?? precioPaseo) : null,
      visita: servicios.includes('visita') ? (precioPaseo ?? precioNoche) : null,
    },
    comuna: datos.zona,
    latitud: datos.latitud,
    longitud: datos.longitud,
    radioKm: datos.radioKm,
    dias: datos.dias.map((dia) => DIAS_SEMANA.indexOf(dia)).filter((indice) => indice >= 0),
    horaInicio: datos.horaInicio,
    horaFin: datos.horaFin,
    activo: true,
  }
}

async function dataUrlAArchivo(dataUrl: string, nombre: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob()
  return new File([blob], nombre, { type: blob.type || 'image/jpeg' })
}

async function subirSiEsDataUrl(usuarioId: string, carpeta: string, valor: string): Promise<string> {
  if (!valor.startsWith('data:')) return valor
  return subirFoto(usuarioId, carpeta, await dataUrlAArchivo(valor, 'foto.jpg'))
}

function mascotaValida(mascota: DatosMascota): mascota is DatosMascota & { tipo: TipoMascota } {
  return Boolean(mascota.nombre.trim() && mascota.tipo)
}

/**
 * Persiste el resultado del wizard: perfil, mascotas (tabla) y perfil de cuidador.
 * Se puede repetir sin duplicar mascotas.
 */
export async function guardarRegistro(perfil: Perfil): Promise<void> {
  const avatarUrl = perfil.avatarUrl ? await subirSiEsDataUrl(perfil.id, 'perfil', perfil.avatarUrl) : null
  await guardarPerfil({ ...perfil, avatarUrl, mascotas: [] })

  if (esRolDueno(perfil.rol)) {
    const existentes = await listarMascotas(perfil.id)
    if (existentes.length === 0) {
      for (const mascota of perfil.mascotas.filter(mascotaValida)) {
        const fotos = await Promise.all(mascota.fotos.map((foto) => subirSiEsDataUrl(perfil.id, 'mascotas', foto)))
        await crearMascota(perfil.id, {
          nombre: mascota.nombre,
          tipo: mascota.tipo,
          raza: mascota.raza,
          edadAnos: aDecimal(mascota.edadAnos),
          pesoKg: aDecimal(mascota.pesoKg),
          esGrupo: mascota.modo === 'grupo',
          cantidad: mascota.modo === 'grupo' ? (aEntero(mascota.cantidad ?? '') ?? 1) : 1,
          fotos,
          dieta: '',
          notasSalud: '',
        })
      }
    }
  }

  if (esRolCuidador(perfil.rol) && perfil.datosCuidador) {
    await guardarPerfilCuidador(perfil.id, datosCuidadorDesdeRegistro(perfil.datosCuidador))
  }
}

import { supabase } from './client'
import type { Mascota, NuevaMascota, RecordatorioSalud, TipoRecordatorio } from '@/types/dominio'
import type { TipoMascota } from '@/types/perfil'

interface FilaMascota {
  id: string
  dueno_id: string
  nombre: string
  tipo: TipoMascota
  raza: string
  edad_anos: number | string | null
  peso_kg: number | string | null
  es_grupo: boolean
  cantidad: number
  fotos: string[] | null
  dieta: string
  notas_salud: string
}

interface FilaRecordatorio {
  id: string
  mascota_id: string
  titulo: string
  tipo: TipoRecordatorio
  fecha: string
  completado: boolean
}

const aNumero = (valor: number | string | null) => (valor == null ? null : Number(valor))

function filaAMascota(fila: FilaMascota): Mascota {
  return {
    id: fila.id,
    duenoId: fila.dueno_id,
    nombre: fila.nombre,
    tipo: fila.tipo,
    raza: fila.raza,
    edadAnos: aNumero(fila.edad_anos),
    pesoKg: aNumero(fila.peso_kg),
    esGrupo: fila.es_grupo,
    cantidad: fila.cantidad,
    fotos: fila.fotos ?? [],
    dieta: fila.dieta,
    notasSalud: fila.notas_salud,
  }
}

function mascotaAFila(mascota: Partial<NuevaMascota>) {
  return {
    nombre: mascota.nombre?.trim(),
    tipo: mascota.tipo,
    raza: mascota.raza?.trim(),
    edad_anos: mascota.edadAnos,
    peso_kg: mascota.pesoKg,
    es_grupo: mascota.esGrupo,
    cantidad: mascota.cantidad,
    fotos: mascota.fotos,
    dieta: mascota.dieta,
    notas_salud: mascota.notasSalud,
  }
}

function filaARecordatorio(fila: FilaRecordatorio): RecordatorioSalud {
  return {
    id: fila.id,
    mascotaId: fila.mascota_id,
    titulo: fila.titulo,
    tipo: fila.tipo,
    fecha: fila.fecha,
    completado: fila.completado,
  }
}

/** Mascotas de un dueño. (Un cuidador ve la ficha de una mascota a cargo con `obtenerMascota`.) */
export async function listarMascotas(duenoId: string): Promise<Mascota[]> {
  const { data, error } = await supabase
    .from('mascotas')
    .select('*')
    .eq('dueno_id', duenoId)
    .order('creado_en', { ascending: true })
  if (error) throw error
  return (data as FilaMascota[]).map(filaAMascota)
}

export async function obtenerMascota(id: string): Promise<Mascota | null> {
  const { data, error } = await supabase.from('mascotas').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? filaAMascota(data as FilaMascota) : null
}

export async function crearMascota(duenoId: string, mascota: NuevaMascota): Promise<Mascota> {
  const { data, error } = await supabase
    .from('mascotas')
    .insert({ ...mascotaAFila(mascota), dueno_id: duenoId })
    .select('*')
    .single()
  if (error) throw error
  return filaAMascota(data as FilaMascota)
}

export async function actualizarMascota(id: string, cambios: Partial<NuevaMascota>): Promise<Mascota> {
  const { data, error } = await supabase.from('mascotas').update(mascotaAFila(cambios)).eq('id', id).select('*').single()
  if (error) throw error
  return filaAMascota(data as FilaMascota)
}

export async function eliminarMascota(id: string): Promise<void> {
  const { error } = await supabase.from('mascotas').delete().eq('id', id)
  if (error) throw error
}

export async function listarRecordatorios(mascotaId: string): Promise<RecordatorioSalud[]> {
  const { data, error } = await supabase
    .from('recordatorios_salud')
    .select('*')
    .eq('mascota_id', mascotaId)
    .order('fecha', { ascending: true })
  if (error) throw error
  return (data as FilaRecordatorio[]).map(filaARecordatorio)
}

export async function crearRecordatorio(
  recordatorio: Omit<RecordatorioSalud, 'id' | 'completado'>,
): Promise<RecordatorioSalud> {
  const { data, error } = await supabase
    .from('recordatorios_salud')
    .insert({
      mascota_id: recordatorio.mascotaId,
      titulo: recordatorio.titulo.trim(),
      tipo: recordatorio.tipo,
      fecha: recordatorio.fecha,
    })
    .select('*')
    .single()
  if (error) throw error
  return filaARecordatorio(data as FilaRecordatorio)
}

export async function marcarRecordatorio(id: string, completado: boolean): Promise<void> {
  const { error } = await supabase.from('recordatorios_salud').update({ completado }).eq('id', id)
  if (error) throw error
}

export async function eliminarRecordatorio(id: string): Promise<void> {
  const { error } = await supabase.from('recordatorios_salud').delete().eq('id', id)
  if (error) throw error
}

import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './client'
import type { Conversacion, Mensaje, PerfilPublico } from '@/types/dominio'

interface FilaConversacion {
  id: string
  participante_a: string
  participante_b: string
  ultimo_mensaje_en: string | null
}

interface FilaMensaje {
  id: string
  conversacion_id: string
  autor_id: string
  texto: string
  foto_url: string | null
  leido_en: string | null
  creado_en: string
}

interface FilaPerfilPublico {
  id: string
  nombre: string
  apellido: string
  avatar_url: string | null
  comuna: string
}

function filaAConversacion(fila: FilaConversacion): Conversacion {
  return {
    id: fila.id,
    participanteA: fila.participante_a,
    participanteB: fila.participante_b,
    ultimoMensajeEn: fila.ultimo_mensaje_en,
  }
}

function filaAMensaje(fila: FilaMensaje): Mensaje {
  return {
    id: fila.id,
    conversacionId: fila.conversacion_id,
    autorId: fila.autor_id,
    texto: fila.texto,
    fotoUrl: fila.foto_url,
    leidoEn: fila.leido_en,
    creadoEn: fila.creado_en,
  }
}

export function otroParticipante(conversacion: Conversacion, miId: string): string {
  return conversacion.participanteA === miId ? conversacion.participanteB : conversacion.participanteA
}

/** Nombre y foto de otras personas (solo las que la base permite ver). */
export async function obtenerPerfilesPublicos(ids: string[]): Promise<Map<string, PerfilPublico>> {
  const unicos = [...new Set(ids)].filter(Boolean)
  const mapa = new Map<string, PerfilPublico>()
  if (unicos.length === 0) return mapa
  const { data, error } = await supabase.rpc('perfiles_publicos', { p_ids: unicos })
  if (error) throw error
  for (const fila of (data ?? []) as FilaPerfilPublico[]) {
    mapa.set(fila.id, {
      id: fila.id,
      nombre: fila.nombre,
      apellido: fila.apellido,
      avatarUrl: fila.avatar_url,
      comuna: fila.comuna,
    })
  }
  return mapa
}

export async function abrirConversacion(otroId: string): Promise<string> {
  const { data, error } = await supabase.rpc('abrir_conversacion', { p_otro: otroId })
  if (error) throw error
  return data as string
}

export async function listarConversaciones(): Promise<Conversacion[]> {
  const { data, error } = await supabase
    .from('conversaciones')
    .select('*')
    .order('ultimo_mensaje_en', { ascending: false, nullsFirst: false })
  if (error) throw error
  return (data as FilaConversacion[]).map(filaAConversacion)
}

export async function obtenerConversacion(id: string): Promise<Conversacion | null> {
  const { data, error } = await supabase.from('conversaciones').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? filaAConversacion(data as FilaConversacion) : null
}

export async function listarMensajes(conversacionId: string): Promise<Mensaje[]> {
  const { data, error } = await supabase
    .from('mensajes')
    .select('*')
    .eq('conversacion_id', conversacionId)
    .order('creado_en', { ascending: true })
  if (error) throw error
  return (data as FilaMensaje[]).map(filaAMensaje)
}

export async function enviarMensaje(
  conversacionId: string,
  contenido: { texto?: string; fotoUrl?: string | null },
): Promise<Mensaje> {
  const { data, error } = await supabase
    .from('mensajes')
    .insert({ conversacion_id: conversacionId, texto: contenido.texto?.trim() ?? '', foto_url: contenido.fotoUrl ?? null })
    .select('*')
    .single()
  if (error) throw error
  return filaAMensaje(data as FilaMensaje)
}

export async function marcarLeidos(conversacionId: string): Promise<void> {
  const { error } = await supabase.rpc('marcar_mensajes_leidos', { p_conversacion: conversacionId })
  if (error) throw error
}

/** Mensajes nuevos y cambios (p. ej. `leido_en`) de una conversación. */
export function escucharMensajes(
  conversacionId: string,
  alMensaje: (mensaje: Mensaje) => void,
  alActualizar?: (mensaje: Mensaje) => void,
): RealtimeChannel {
  const filtro = `conversacion_id=eq.${conversacionId}`
  return supabase
    .channel(`mensajes-${conversacionId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: filtro }, (carga) =>
      alMensaje(filaAMensaje(carga.new as FilaMensaje)),
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensajes', filter: filtro }, (carga) =>
      alActualizar?.(filaAMensaje(carga.new as FilaMensaje)),
    )
    .subscribe()
}

// ---------------------------------------------------------------------------
// Seguridad: silenciar, bloquear, reportar
// ---------------------------------------------------------------------------

export async function obtenerSilenciada(conversacionId: string, miId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('ajustes_conversacion')
    .select('silenciada')
    .eq('conversacion_id', conversacionId)
    .eq('usuario_id', miId)
    .maybeSingle()
  if (error) throw error
  return Boolean((data as { silenciada: boolean } | null)?.silenciada)
}

export async function cambiarSilenciada(conversacionId: string, miId: string, silenciada: boolean): Promise<void> {
  const { error } = await supabase
    .from('ajustes_conversacion')
    .upsert({ conversacion_id: conversacionId, usuario_id: miId, silenciada }, { onConflict: 'conversacion_id,usuario_id' })
  if (error) throw error
}

/** Estado de bloqueo entre yo y otra persona, en ambos sentidos. */
export async function obtenerBloqueo(miId: string, otroId: string): Promise<{ yoBloquee: boolean; meBloquearon: boolean }> {
  const { data, error } = await supabase
    .from('bloqueos')
    .select('bloqueador_id, bloqueado_id')
    .or(`and(bloqueador_id.eq.${miId},bloqueado_id.eq.${otroId}),and(bloqueador_id.eq.${otroId},bloqueado_id.eq.${miId})`)
  if (error) throw error
  const filas = (data ?? []) as Array<{ bloqueador_id: string; bloqueado_id: string }>
  return {
    yoBloquee: filas.some((f) => f.bloqueador_id === miId),
    meBloquearon: filas.some((f) => f.bloqueador_id === otroId),
  }
}

export async function bloquear(otroId: string): Promise<void> {
  const { error } = await supabase.from('bloqueos').insert({ bloqueado_id: otroId })
  if (error && error.code !== '23505') throw error
}

export async function desbloquear(miId: string, otroId: string): Promise<void> {
  const { error } = await supabase.from('bloqueos').delete().eq('bloqueador_id', miId).eq('bloqueado_id', otroId)
  if (error) throw error
}

export async function reportar(otroId: string, motivo: string, conversacionId?: string): Promise<void> {
  const { error } = await supabase
    .from('reportes')
    .insert({ reportado_id: otroId, motivo: motivo.trim(), conversacion_id: conversacionId ?? null })
  if (error) throw error
}

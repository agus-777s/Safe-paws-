import { useCallback } from 'react'
import Card from '@/components/ui/Card'
import EstadoVista from '@/components/ui/EstadoVista'
import { useCarga } from '@/hooks/useCarga'
import { obtenerPerfilesPublicos } from '@/services/supabase/chat'
import { listarResenasCuidador } from '@/services/supabase/reservas'
import type { PerfilPublico } from '@/types/dominio'
import { exigirConexion } from './cuidadoresVista'
import estilo from './CuidadorPage.module.css'

const formatoFecha = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

export default function ResenasCuidador({ cuidadorId }: { cuidadorId: string }) {
  const cargar = useCallback(async () => {
    exigirConexion()
    const resenas = await listarResenasCuidador(cuidadorId)
    // Los nombres son un extra: si la base no permite verlos, se muestran anónimos.
    const autores = await obtenerPerfilesPublicos(resenas.map((r) => r.autorId)).catch(
      () => new Map<string, PerfilPublico>(),
    )
    return { resenas, autores }
  }, [cuidadorId])
  const { datos, cargando, error, recargar } = useCarga(cargar)

  return (
    <Card>
      <h2 className={estilo.subtitulo}>Reseñas</h2>
      <EstadoVista
        cargando={cargando}
        error={error}
        alReintentar={recargar}
        etiquetaCarga="Cargando reseñas…"
        vacio={!datos || datos.resenas.length === 0}
        mensajeVacio="Todavía no tiene reseñas. ¡Sé el primero en contar tu experiencia!"
      >
        <ul className={estilo.resenas}>
          {datos?.resenas.map((resena) => {
            const autor = datos.autores.get(resena.autorId)
            return (
              <li key={resena.id} className={estilo.resena}>
                <div className={estilo.resenaCabecera}>
                  <strong>{autor ? `${autor.nombre} ${autor.apellido.charAt(0)}.`.trim() : 'Dueño de mascota'}</strong>
                  <span
                    className={estilo.estrellas}
                    aria-label={`${resena.puntuacion} de 5 estrellas`}
                    role="img"
                  >
                    {'★'.repeat(resena.puntuacion)}
                    <span className={estilo.estrellasVacias}>{'★'.repeat(Math.max(0, 5 - resena.puntuacion))}</span>
                  </span>
                </div>
                <time className={estilo.suave} dateTime={resena.creadoEn}>
                  {formatoFecha.format(new Date(resena.creadoEn))}
                </time>
                {resena.comentario && <p className={estilo.resenaTexto}>{resena.comentario}</p>}
              </li>
            )
          })}
        </ul>
      </EstadoVista>
    </Card>
  )
}

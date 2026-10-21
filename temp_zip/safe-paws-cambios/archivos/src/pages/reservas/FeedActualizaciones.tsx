import type { ActualizacionServicio } from '@/types/dominio'
import { clases } from '@/utils/clases'
import estilo from './FeedActualizaciones.module.css'

const formatoHora = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const TITULOS = { foto: '📷 Foto', nota: '📝 Nota', emergencia: '🚨 Emergencia' } as const

export default function FeedActualizaciones({ actualizaciones }: { actualizaciones: ActualizacionServicio[] }) {
  const ordenadas = [...actualizaciones].sort(
    (a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime(),
  )

  if (ordenadas.length === 0) {
    return <p className={estilo.vacio}>Aún no hay novedades. Las fotos y notas del servicio aparecerán aquí.</p>
  }

  return (
    <ol className={estilo.feed}>
      {ordenadas.map((a) => (
        <li key={a.id} className={clases(estilo.item, a.tipo === 'emergencia' && estilo.emergencia)}>
          <div className={estilo.meta}>
            <span className={estilo.tipo}>{TITULOS[a.tipo]}</span>
            <time dateTime={a.creadoEn} className={estilo.hora}>
              {formatoHora.format(new Date(a.creadoEn))}
            </time>
          </div>
          {a.fotoUrl && (
            <a href={a.fotoUrl} target="_blank" rel="noreferrer" className={estilo.enlaceFoto}>
              <img src={a.fotoUrl} alt="Foto del servicio" className={estilo.foto} loading="lazy" />
            </a>
          )}
          {a.texto && <p className={estilo.texto}>{a.texto}</p>}
        </li>
      ))}
    </ol>
  )
}

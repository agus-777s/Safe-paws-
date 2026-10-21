import { useCallback, useId, useState } from 'react'
import type { FormEvent } from 'react'
import Button from '@/components/ui/Button'
import EstadoVista from '@/components/ui/EstadoVista'
import { useCarga } from '@/hooks/useCarga'
import { crearResena, obtenerResenaDeReserva } from '@/services/supabase/reservas'
import type { Reserva } from '@/types/dominio'
import { clases } from '@/utils/clases'
import { mensajeError } from '@/utils/errores'
import estilo from './FormularioResena.module.css'

const ESTRELLAS = [1, 2, 3, 4, 5] as const

function Estrellas({ valor }: { valor: number }) {
  return (
    <span className={estilo.estrellasFijas} aria-label={`${valor} de 5 estrellas`}>
      {ESTRELLAS.map((n) => (
        <span key={n} aria-hidden="true" className={n <= valor ? estilo.llena : estilo.vacia}>
          ★
        </span>
      ))}
    </span>
  )
}

export default function FormularioResena({ reserva }: { reserva: Pick<Reserva, 'id' | 'cuidadorId'> }) {
  const cargar = useCallback(() => obtenerResenaDeReserva(reserva.id), [reserva.id])
  const { datos: resena, cargando, error, recargar } = useCarga(cargar)
  const [puntuacion, setPuntuacion] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const nombreGrupo = useId()
  const idComentario = useId()

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (puntuacion < 1) {
      setErrorEnvio('Elige de 1 a 5 estrellas.')
      return
    }
    setEnviando(true)
    setErrorEnvio(null)
    try {
      await crearResena(reserva, puntuacion, comentario)
      recargar()
    } catch (e) {
      setErrorEnvio(mensajeError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className={estilo.panel} aria-labelledby={`${idComentario}-titulo`}>
      <h2 id={`${idComentario}-titulo`} className={estilo.titulo}>
        Tu reseña
      </h2>
      <EstadoVista cargando={cargando} error={error} alReintentar={recargar} etiquetaCarga="Cargando reseña…">
        {resena ? (
          <div className={estilo.resena}>
            <Estrellas valor={resena.puntuacion} />
            {resena.comentario && <p className={estilo.comentario}>“{resena.comentario}”</p>}
            <p className={estilo.gracias}>¡Gracias por ayudar a otros dueños! 🐾</p>
          </div>
        ) : (
          <form className={estilo.formulario} onSubmit={(e) => void enviar(e)}>
            <fieldset className={estilo.grupo}>
              <legend className={estilo.leyenda}>¿Cómo fue el servicio?</legend>
              <div className={estilo.estrellas}>
                {ESTRELLAS.map((n) => (
                  <label key={n} className={clases(estilo.estrella, n <= puntuacion && estilo.llena)}>
                    <input
                      type="radio"
                      name={nombreGrupo}
                      value={n}
                      checked={puntuacion === n}
                      onChange={() => setPuntuacion(n)}
                      className={estilo.radio}
                    />
                    <span aria-hidden="true">★</span>
                    <span className={estilo.soloLector}>
                      {n} {n === 1 ? 'estrella' : 'estrellas'}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor={idComentario} className={estilo.leyenda}>
              Comentario (opcional)
            </label>
            <textarea
              id={idComentario}
              className={estilo.areaTexto}
              rows={3}
              maxLength={1000}
              placeholder="Cuéntanos cómo le fue a tu mascota"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
            {errorEnvio && (
              <p className={estilo.error} role="alert">
                {errorEnvio}
              </p>
            )}
            <Button type="submit" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Publicar reseña'}
            </Button>
          </form>
        )}
      </EstadoVista>
    </section>
  )
}

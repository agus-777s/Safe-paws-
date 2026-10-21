import { useState } from 'react'
import Button from '@/components/ui/Button'
import { obtenerTelefonoContraparte, publicarActualizacion } from '@/services/supabase/reservas'
import { mensajeError } from '@/utils/errores'
import { useAbrirChat } from './useAbrirChat'
import estilo from './BotonEmergencia.module.css'

interface BotonEmergenciaProps {
  reservaId: string
  cuidadorId: string
  alPublicar: () => void
}

type Fase = 'inicial' | 'confirmando' | 'enviando' | 'enviada'

export default function BotonEmergencia({ reservaId, cuidadorId, alPublicar }: BotonEmergenciaProps) {
  const [fase, setFase] = useState<Fase>('inicial')
  const [error, setError] = useState<string | null>(null)
  const [telefono, setTelefono] = useState<string | null>(null)
  const { abrirChat, abriendo, errorChat } = useAbrirChat()

  async function activar() {
    setFase('enviando')
    setError(null)
    try {
      await publicarActualizacion(reservaId, 'emergencia', { texto: 'El dueño activó el botón de emergencia' })
      setFase('enviada')
      alPublicar()
      obtenerTelefonoContraparte(reservaId).then(setTelefono, () => setTelefono(null))
    } catch (e) {
      setError(mensajeError(e))
      setFase('confirmando')
    }
  }

  return (
    <section className={estilo.panel} aria-label="Emergencia">
      {fase === 'inicial' && (
        <button type="button" className={estilo.boton} onClick={() => setFase('confirmando')}>
          🚨 Botón de emergencia
        </button>
      )}

      {(fase === 'confirmando' || fase === 'enviando') && (
        <div className={estilo.confirmacion} role="group" aria-label="Confirmar emergencia">
          <p className={estilo.pregunta}>¿Activar la alerta de emergencia?</p>
          <p className={estilo.texto}>Avisaremos de inmediato al cuidador y quedará registrado en el servicio.</p>
          <div className={estilo.fila}>
            <button
              type="button"
              className={estilo.boton}
              disabled={fase === 'enviando'}
              onClick={() => void activar()}
            >
              {fase === 'enviando' ? 'Enviando alerta…' : 'Sí, activar emergencia'}
            </button>
            <Button variante="fantasma" disabled={fase === 'enviando'} onClick={() => setFase('inicial')}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {fase === 'enviada' && (
        <div className={estilo.enviada} role="alert">
          <p className={estilo.pregunta}>Alerta enviada al cuidador.</p>
          {telefono && (
            <p className={estilo.texto}>
              Teléfono del cuidador: <a href={`tel:${telefono.replace(/\s/g, '')}`}>{telefono}</a>
            </p>
          )}
          <p className={estilo.texto}>
            Llama al <a href="tel:133">133 (Carabineros)</a> o a tu veterinario si la situación lo requiere.
          </p>
          <div className={estilo.fila}>
            <Button variante="secundario" disabled={abriendo} onClick={() => void abrirChat(cuidadorId)}>
              💬 {abriendo ? 'Abriendo…' : 'Abrir chat con el cuidador'}
            </Button>
            <Button variante="fantasma" onClick={() => setFase('inicial')}>
              Cerrar
            </Button>
          </div>
        </div>
      )}

      {(error || errorChat) && (
        <p className={estilo.error} role="alert">
          {error ?? errorChat}
        </p>
      )}
    </section>
  )
}

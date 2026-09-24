import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '@/components/ui/Logo'
import { useAuth } from '@/hooks/useAuth'
import { completarOnboarding } from '@/services/supabase/perfiles'
import { clases } from '@/utils/clases'
import estilo from './OnboardingPage.module.css'

const CLAVE_BIENVENIDA = 'safe-paws-bienvenida-vista'

// Textos exactos de Stitch Safe Paws Care App
const DIAPOSITIVAS = [
  {
    titulo: 'Encuentra cuidadores de confianza',
    texto: 'Conecta con personas apasionadas que cuidarán de tu mascota como si fuera suya.',
    fondo: '/stitch/fondo-onboarding-1.jpg',
    variante: 'claro' as const,
  },
  {
    titulo: 'Seguimiento en tiempo real',
    texto: 'Observa la ruta de tu mascota en vivo. Tranquilidad y seguridad en cada paso que dan juntos.',
    fondo: '/stitch/fondo-onboarding-2.jpg',
    variante: 'mapa' as const,
  },
  {
    titulo: 'Pagos seguros y sin preocupaciones',
    texto: 'Transacciones protegidas para que solo te enfoques en el cariño hacia tu mascota.',
    fondo: '/stitch/fondo-onboarding-3.jpg',
    variante: 'seguro' as const,
  },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { usuario, refrescarPerfil } = useAuth()
  const [indice, setIndice] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const tactoInicio = useRef<number | null>(null)
  const esUltima = indice === DIAPOSITIVAS.length - 1
  const activa = DIAPOSITIVAS[indice]

  function irA(nuevo: number) {
    setIndice(Math.min(DIAPOSITIVAS.length - 1, Math.max(0, nuevo)))
  }

  async function finalizar(omitir: boolean) {
    if (guardando) return
    setGuardando(true)
    try {
      window.localStorage.setItem(CLAVE_BIENVENIDA, '1')
    } catch {
      // Sin almacenamiento: se continúa igual.
    }
    if (usuario && !omitir) {
      try {
        await completarOnboarding(usuario.id)
        await refrescarPerfil()
      } catch {
        // El perfil se sincronizará después; no bloquea la entrada.
      }
      navigate('/', { replace: true })
    } else if (usuario && omitir) {
      navigate('/', { replace: true })
    } else {
      // Pre-auth: onboarding siempre antes de iniciar sesión.
      navigate('/iniciar-sesion', { replace: true })
    }
  }

  function manejarCta() {
    if (esUltima) {
      void finalizar(false)
    } else {
      irA(indice + 1)
    }
  }

  return (
    <div
      className={estilo.pagina}
      onTouchStart={(evento) => {
        tactoInicio.current = evento.changedTouches[0].screenX
      }}
      onTouchEnd={(evento) => {
        if (tactoInicio.current === null) return
        const diferencia = evento.changedTouches[0].screenX - tactoInicio.current
        if (diferencia < -50) irA(indice + 1)
        if (diferencia > 50) irA(indice - 1)
        tactoInicio.current = null
      }}
    >
      <header className={estilo.marca}>
        <h1 className={estilo.nombre}>
          <Logo ancho={30} alto={30} />
          <span>Safe Paws</span>
        </h1>
      </header>

      {/* Ilustración contenida: misma etapa y escala en las 3 pantallas,
          sin ampliar más allá de su resolución nativa (512×512 y 286×512). */}
      <figure className={estilo.ilustracion} aria-hidden="true">
        <img
          key={activa.fondo}
          src={activa.fondo}
          alt=""
          className={estilo.ilusImg}
          loading={activa.variante === 'claro' ? 'eager' : 'lazy'}
        />
        {activa.variante === 'mapa' && (
          <div className={estilo.pinFlotante}>
            <span className={estilo.pin}>🐾</span>
            <span className={estilo.pinOnda} />
          </div>
        )}
        {activa.variante === 'seguro' && <div className={estilo.escudo}>🛡️</div>}
      </figure>

      <main className={estilo.contenido}>
        <section key={activa.titulo} className={estilo.diapositiva} aria-live="polite">
          <h2 className={estilo.titulo}>{activa.titulo}</h2>
          <p className={estilo.texto}>{activa.texto}</p>
        </section>
      </main>

      <footer className={estilo.pie}>
        <div className={estilo.puntos} role="tablist" aria-label="Diapositivas de bienvenida">
          {DIAPOSITIVAS.map((diapositiva, posicion) => (
            <button
              key={diapositiva.titulo}
              type="button"
              role="tab"
              aria-selected={posicion === indice}
              aria-label={`Ir a la diapositiva ${posicion + 1}`}
              className={clases(estilo.punto, posicion === indice && estilo.puntoActivo)}
              onClick={() => irA(posicion)}
            />
          ))}
        </div>

        <button
          type="button"
          className={estilo.boton}
          disabled={guardando}
          onClick={manejarCta}
        >
          {guardando ? 'Preparando todo…' : 'Empezar'}
        </button>

        {!esUltima && (
          <button type="button" className={estilo.omitir} onClick={() => void finalizar(true)}>
            Omitir
          </button>
        )}
      </footer>
    </div>
  )
}

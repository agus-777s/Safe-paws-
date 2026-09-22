import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EstadoConexion from '@/components/ui/EstadoConexion'
import { useAuth } from '@/hooks/useAuth'
import { clases } from '@/utils/clases'
import estilo from './InicioPage.module.css'

const datosServicios = [
  {
    icono: '🦮',
    titulo: 'Paseos',
    descripcion: 'Paseos a medida con seguimiento en vivo y reporte con fotos.',
  },
  {
    icono: '🏠',
    titulo: 'Hospedaje',
    descripcion: 'Noches seguras en hogares verificados cuando tengas que viajar.',
  },
  {
    icono: '🧸',
    titulo: 'Guardería',
    descripcion: 'Cuidado diurno con juegos, socialización y mucho cariño.',
  },
  {
    icono: '🚪',
    titulo: 'Visitas a domicilio',
    descripcion: 'Alimentación y compañía sin sacar a tu mascota de casa.',
  },
]

const pasos = [
  {
    numero: '1',
    titulo: 'Crea tu cuenta gratis',
    texto: 'Cuéntanos sobre ti y tu mascota en menos de 2 minutos.',
  },
  {
    numero: '2',
    titulo: 'Elige a tu cuidador',
    texto: 'Filtra por zona, precio y reseñas verificadas cerca de ti.',
  },
  {
    numero: '3',
    titulo: 'Reserva y relájate',
    texto: 'Pagos seguros, seguimiento en vivo y soporte siempre.',
  },
]

export default function InicioPage() {
  const { usuario, perfil } = useAuth()
  const esCuidador = perfil?.rol === 'cuidador'

  return (
    <div className={estilo.pagina}>
      {/* ===== HERO: texto + foto ===== */}
      <section className={clases(estilo.hero, 'contenedor')}>
        <div className={estilo.heroTexto}>
          {esCuidador ? (
            <>
              <span className={estilo.insignia}>🏠 Panel de cuidador</span>
              <h1 className={estilo.heroTitulo}>
                Ofrece tus servicios y gestiona tus solicitudes
              </h1>
              <p className={estilo.heroDescripcion}>
                Revisa tus servicios activos, tu zona de cobertura y tus tarifas. Pronto podrás
                recibir solicitudes de dueños cerca de ti.
              </p>
            </>
          ) : (
            <>
              <span className={estilo.insignia}>🐾 +500 cuidadores verificados en Santiago</span>
              <h1 className={estilo.heroTitulo}>
                Tu mascota en las mejores manos, incluso cuando no estás
              </h1>
              <p className={estilo.heroDescripcion}>
                Paseos, hospedaje y guardería con cuidadores verificados, seguimiento en tiempo
                real y pagos protegidos. Todo desde tu computador o tu teléfono.
              </p>
            </>
          )}
          <div className={estilo.heroAcciones}>
            {usuario ? (
              <Button enlace="/mi-cuenta" tamanio="grande">
                Ir a Mi cuenta
              </Button>
            ) : (
              <>
                <Button enlace="/registro" tamanio="grande">
                  Buscar un cuidador
                </Button>
                <Button enlace="/iniciar-sesion" variante="secundario" tamanio="grande">
                  Iniciar sesión
                </Button>
              </>
            )}
          </div>
          <dl className={estilo.stats}>
            <div>
              <dt>4.9★</dt>
              <dd>Calificación promedio</dd>
            </div>
            <div>
              <dt>+12 mil</dt>
              <dd>Paseos felices</dd>
            </div>
            <div>
              <dt>24/7</dt>
              <dd>Soporte y seguimiento</dd>
            </div>
          </dl>
          <EstadoConexion />
        </div>

        <div className={estilo.heroVisual}>
          <img
            src="/stitch/fondo-onboarding-1.jpg"
            alt="Cuidador abrazando a un perro golden en un parque"
            className={estilo.heroFoto}
          />
          <div className={estilo.flotante1}>
            <span aria-hidden="true">📍</span>
            <div>
              <strong>Paseo en curso</strong>
              <small>Rocky · 25 min · en vivo</small>
            </div>
          </div>
          <div className={estilo.flotante2}>
            <span aria-hidden="true">🛡️</span>
            <div>
              <strong>Pago seguro</strong>
              <small>Protegido por Safe Paws</small>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SERVICIOS ===== */}
      <section className={clases(estilo.seccion, 'contenedor')}>
        <p className={estilo.kicker}>Nuestros servicios</p>
        <h2 className={estilo.seccionTitulo}>Todo lo que tu mejor amigo necesita</h2>
        <div className={estilo.rejilla}>
          {datosServicios.map((servicio) => (
            <Card key={servicio.titulo} className={estilo.tarjetaServicio}>
              <span className={estilo.tarjetaIcono} aria-hidden="true">
                {servicio.icono}
              </span>
              <h3 className={estilo.tarjetaTitulo}>{servicio.titulo}</h3>
              <p className={estilo.tarjetaDescripcion}>{servicio.descripcion}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ===== CÓMO FUNCIONA ===== */}
      <section className={clases(estilo.seccion, 'contenedor')}>
        <p className={estilo.kicker}>Cómo funciona</p>
        <h2 className={estilo.seccionTitulo}>Reservar es así de fácil</h2>
        <ol className={estilo.pasos}>
          {pasos.map((paso) => (
            <li key={paso.numero} className={estilo.paso}>
              <span className={estilo.pasoNumero} aria-hidden="true">
                {paso.numero}
              </span>
              <h3 className={estilo.tarjetaTitulo}>{paso.titulo}</h3>
              <p className={estilo.tarjetaDescripcion}>{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ===== IMAGEN + CTA ===== */}
      <section className={clases(estilo.seccion, 'contenedor')}>
        <div className={estilo.llamada}>
          <img
            src="/stitch/fondo-onboarding-2.jpg"
            alt="Ruta de paseo con pin de mascota en un parque"
            className={estilo.llamadaFoto}
            loading="lazy"
          />
          <div className={estilo.llamadaTextoBloque}>
            <h2 className={estilo.llamadaTitulo}>Mira cada paso en tiempo real</h2>
            <p className={estilo.llamadaTexto}>
              Recibe la ruta en vivo, fotos y reportes de cada paseo. Regístrate gratis y
              encuentra al cuidador perfecto a minutos de tu casa.
            </p>
            <div className={estilo.llamadaAcciones}>
              <Button enlace="/registro" tamanio="grande">
                Comenzar ahora
              </Button>
              <Button enlace="/iniciar-sesion" variante="secundario" tamanio="grande">
                Ya tengo cuenta
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

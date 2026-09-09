import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EstadoConexion from '@/components/ui/EstadoConexion'
import Logo from '@/components/ui/Logo'
import { useAuth } from '@/hooks/useAuth'
import { clases } from '@/utils/clases'
import estilo from './InicioPage.module.css'

const datosServicios = [
  {
    titulo: 'Paseos',
    descripcion: 'Paseos a medida para mantener a tu mascota activa, sana y feliz.',
  },
  {
    titulo: 'Hospedaje',
    descripcion: 'Cuidadores de confianza cuando tienes que viajar o ausentarte.',
  },
  {
    titulo: 'Guardería',
    descripcion: 'Cuidado diurno con actividades, juegos y mucho cariño.',
  },
  {
    titulo: 'Visitas a domicilio',
    descripcion: 'Alimentación, compañía y atención en la comodidad de tu hogar.',
  },
]

export default function InicioPage() {
  const { usuario } = useAuth()

  return (
    <div className={estilo.pagina}>
      <section className={clases(estilo.hero, 'contenedor')}>
        <div className={estilo.heroTexto}>
          <h1 className={estilo.heroTitulo}>El cuidado que tus mascotas merecen</h1>
          <p className={estilo.heroDescripcion}>
            Conectamos a dueños de mascotas con cuidadores verificados para paseos, hospedaje,
            guardería y visitas a domicilio.
          </p>
          <div className={estilo.heroAcciones}>
            {usuario ? (
              <Button enlace="/mi-cuenta" tamanio="grande">
                Ir a Mi cuenta
              </Button>
            ) : (
              <>
                <Button enlace="/registro" tamanio="grande">
                  Crea tu cuenta
                </Button>
                <Button enlace="/iniciar-sesion" variante="secundario" tamanio="grande">
                  Iniciar sesión
                </Button>
              </>
            )}
          </div>
          <EstadoConexion />
        </div>

        <div className={estilo.heroVisual} aria-hidden="true">
          <Logo ancho={260} alto={260} />
        </div>
      </section>

      <section className={clases(estilo.seccion, 'contenedor')}>
        <h2 className={estilo.seccionTitulo}>Nuestros servicios</h2>
        <div className={estilo.rejilla}>
          {datosServicios.map((servicio) => (
            <Card key={servicio.titulo} className={estilo.tarjetaServicio}>
              <h3 className={estilo.tarjetaTitulo}>{servicio.titulo}</h3>
              <p className={estilo.tarjetaDescripcion}>{servicio.descripcion}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className={clases(estilo.seccion, 'contenedor')}>
        <Card className={estilo.llamada}>
          <h2 className={estilo.llamadaTitulo}>¿Listo para empezar?</h2>
          <p className={estilo.llamadaTexto}>
            Regístrate gratis y encuentra al cuidador perfecto para tu mascota.
          </p>
          <Button enlace="/registro" tamanio="grande">
            Comenzar ahora
          </Button>
        </Card>
      </section>
    </div>
  )
}
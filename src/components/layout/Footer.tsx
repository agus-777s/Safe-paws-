import Logo from '@/components/ui/Logo'
import estilo from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={estilo.pie}>
      <div className={`contenedor ${estilo.contenido}`}>
        <p className={estilo.marca}>
          <Logo ancho={20} alto={20} />
          <strong>Safe Paws</strong>
        </p>
        <p className={estilo.texto}>© {new Date().getFullYear()} Safe Paws. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
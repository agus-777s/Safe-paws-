import Button from '@/components/ui/Button'
import estilo from './NoEncontradaPage.module.css'

export default function NoEncontradaPage() {
  return (
    <div className={estilo.pagina}>
      <p className={estilo.codigo} aria-hidden="true">
        404
      </p>
      <h1 className={estilo.titulo}>Página no encontrada</h1>
      <p className={estilo.texto}>La página que buscas no existe o fue movida.</p>
      <Button enlace="/">Volver al inicio</Button>
    </div>
  )
}
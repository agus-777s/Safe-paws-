import estilo from './Spinner.module.css'

export default function Spinner({ etiqueta }: { etiqueta?: string }) {
  return (
    <span className={estilo.envuelve} role="status">
      <span className={estilo.rueda} aria-hidden="true" />
      {etiqueta && <span>{etiqueta}</span>}
    </span>
  )
}
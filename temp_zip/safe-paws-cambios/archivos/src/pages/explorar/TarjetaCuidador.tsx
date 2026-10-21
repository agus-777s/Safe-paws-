import { Link } from 'react-router-dom'
import { tituloServicio } from '@/types/dominio'
import type { CuidadorPublico, Servicio } from '@/types/dominio'
import { formatearDistancia } from '@/utils/geo'
import { formatearClp } from '@/utils/precios'
import AvatarCuidador from './AvatarCuidador'
import { nombreCompleto, precioDesde } from './cuidadoresVista'
import estilo from './TarjetaCuidador.module.css'

interface TarjetaCuidadorProps {
  cuidador: CuidadorPublico
  distancia: number | null
  servicioFiltrado: Servicio | null
}

export default function TarjetaCuidador({ cuidador, distancia, servicioFiltrado }: TarjetaCuidadorProps) {
  const nombre = nombreCompleto(cuidador)
  const precio = precioDesde(cuidador, servicioFiltrado)

  return (
    <Link to={`/cuidadores/${cuidador.id}`} className={estilo.tarjeta} aria-label={`Ver perfil de ${nombre}`}>
      <AvatarCuidador nombre={cuidador.nombre} apellido={cuidador.apellido} avatarUrl={cuidador.avatarUrl} />
      <div className={estilo.cuerpo}>
        <div className={estilo.cabecera}>
          <h3 className={estilo.nombre}>{nombre}</h3>
          {cuidador.verificado && <span className={estilo.verificado}>✓ Verificado</span>}
        </div>
        <p className={estilo.meta}>
          <span>📍 {cuidador.comuna || 'Santiago'}</span>
          {distancia != null && <span>· a {formatearDistancia(distancia)}</span>}
        </p>
        <p className={estilo.meta}>
          {cuidador.totalResenas > 0 ? (
            <span>
              ⭐ <strong>{cuidador.calificacion.toFixed(1)}</strong> ({cuidador.totalResenas}{' '}
              {cuidador.totalResenas === 1 ? 'reseña' : 'reseñas'})
            </span>
          ) : (
            <span>Sin reseñas aún</span>
          )}
        </p>
        {cuidador.servicios.length > 0 && (
          <ul className={estilo.servicios} aria-label="Servicios">
            {cuidador.servicios.map((s) => (
              <li key={s} className={estilo.chip}>
                {tituloServicio(s)}
              </li>
            ))}
          </ul>
        )}
      </div>
      {precio && (
        <p className={estilo.precio}>
          <small>desde</small>
          <strong>{formatearClp(precio.monto)}</strong>
          <small>{precio.unidad}</small>
        </p>
      )}
    </Link>
  )
}

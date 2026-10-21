import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'
import EstadoVista from '@/components/ui/EstadoVista'
import { useAuth } from '@/hooks/useAuth'
import { useCarga } from '@/hooks/useCarga'
import { listarMascotas } from '@/services/supabase/mascotas'
import { ICONOS_TIPO_MASCOTA } from '@/types/perfil'
import { clases } from '@/utils/clases'
import { describirMascota } from './logica'
import estilo from './MascotasPage.module.css'

export default function MascotasPage() {
  const { usuario } = useAuth()
  const usuarioId = usuario?.id ?? ''

  const cargar = useCallback(() => listarMascotas(usuarioId), [usuarioId])
  const { datos: mascotas, cargando, error, recargar } = useCarga(cargar)
  const lista = mascotas ?? []

  return (
    <div className={clases('contenedor', estilo.pagina)}>
      <header className={estilo.encabezado}>
        <div>
          <h1 className={estilo.titulo}>Mis mascotas</h1>
          <p className={estilo.subtitulo}>La ficha técnica de cada una: dieta, salud y recordatorios.</p>
        </div>
        {lista.length > 0 && <Button enlace="/mascotas/nueva">+ Agregar mascota</Button>}
      </header>

      <EstadoVista
        cargando={cargando}
        error={error}
        alReintentar={recargar}
        etiquetaCarga="Cargando tus mascotas…"
        vacio={lista.length === 0}
        mensajeVacio="Aún no registras mascotas. Agrega la primera para que tus cuidadores conozcan su ficha."
        accionVacio={<Button enlace="/mascotas/nueva">Agregar mascota</Button>}
      >
        <ul className={estilo.grilla}>
          {lista.map((mascota) => (
            <li key={mascota.id}>
              <Link to={`/mascotas/${mascota.id}`} className={estilo.tarjeta}>
                <span className={estilo.foto}>
                  {mascota.fotos[0] ? (
                    <img src={mascota.fotos[0]} alt="" loading="lazy" />
                  ) : (
                    <span className={estilo.emoji} aria-hidden="true">
                      {ICONOS_TIPO_MASCOTA[mascota.tipo]}
                    </span>
                  )}
                </span>
                <span className={estilo.info}>
                  <span className={estilo.nombre}>{mascota.nombre}</span>
                  <span className={estilo.detalle}>{describirMascota(mascota)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </EstadoVista>
    </div>
  )
}

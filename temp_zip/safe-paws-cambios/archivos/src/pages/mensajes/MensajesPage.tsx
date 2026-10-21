import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'
import EstadoVista from '@/components/ui/EstadoVista'
import { useAuth } from '@/hooks/useAuth'
import { useCarga } from '@/hooks/useCarga'
import { listarConversaciones, obtenerPerfilesPublicos, otroParticipante } from '@/services/supabase/chat'
import type { Conversacion, PerfilPublico } from '@/types/dominio'
import { clases } from '@/utils/clases'
import Avatar from './Avatar'
import { nombreCompleto } from './logicaChat'
import { formatearActividad } from './tiempo'
import estilo from './MensajesPage.module.css'

interface DatosBandeja {
  conversaciones: Conversacion[]
  perfiles: Map<string, PerfilPublico>
}

export default function MensajesPage() {
  const { usuario } = useAuth()
  const miId = usuario?.id ?? ''

  const cargar = useCallback(async (): Promise<DatosBandeja> => {
    const conversaciones = await listarConversaciones()
    const perfiles = await obtenerPerfilesPublicos(conversaciones.map((c) => otroParticipante(c, miId)))
    return { conversaciones, perfiles }
  }, [miId])

  const { datos, cargando, error, recargar } = useCarga(cargar)
  const conversaciones = datos?.conversaciones ?? []

  return (
    <div className={clases('contenedor', estilo.pagina)}>
      <header className={estilo.encabezado}>
        <h1 className={estilo.titulo}>Mensajes</h1>
        <p className={estilo.subtitulo}>Coordina cuidados y resuelve dudas con dueños y cuidadores.</p>
      </header>

      <EstadoVista
        cargando={cargando}
        error={error}
        alReintentar={recargar}
        etiquetaCarga="Cargando conversaciones…"
        vacio={conversaciones.length === 0}
        mensajeVacio="Aún no tienes conversaciones"
        accionVacio={<Button enlace="/explorar">Buscar cuidadores</Button>}
      >
        <ul className={estilo.lista}>
          {conversaciones.map((conversacion) => {
            const otroId = otroParticipante(conversacion, miId)
            const perfil = datos?.perfiles.get(otroId)
            const actividad = formatearActividad(conversacion.ultimoMensajeEn)
            return (
              <li key={conversacion.id}>
                <Link to={`/mensajes/${conversacion.id}`} className={estilo.item}>
                  <Avatar perfil={perfil} />
                  <span className={estilo.cuerpo}>
                    <span className={estilo.nombre}>{nombreCompleto(perfil)}</span>
                    <span className={estilo.detalle}>
                      {perfil?.comuna ? perfil.comuna : 'Conversación'}
                    </span>
                  </span>
                  <span className={estilo.hora}>{actividad || 'Sin mensajes'}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </EstadoVista>
    </div>
  )
}

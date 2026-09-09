import { useEffect, useState } from 'react'
import { supabase } from '@/services/supabase/client'
import estilo from './EstadoConexion.module.css'

type Estado = 'verificando' | 'conectado' | 'no-configurado' | 'error'

const estaConfigurado = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)

const textos: Record<Estado, string> = {
  verificando: 'Verificando conexión con Supabase…',
  conectado: 'Conectado a Supabase',
  'no-configurado': 'Supabase no está configurado',
  error: 'No se pudo conectar con Supabase',
}

export default function EstadoConexion() {
  const [estado, setEstado] = useState<Estado>(estaConfigurado ? 'verificando' : 'no-configurado')

  useEffect(() => {
    if (!estaConfigurado) return

    let activo = true
    void supabase.auth.getSession().then(
      () => {
        if (activo) setEstado('conectado')
      },
      () => {
        if (activo) setEstado('error')
      },
    )

    return () => {
      activo = false
    }
  }, [])

  return (
    <p className={estilo.estado}>
      <span className={`${estilo.punto} ${estilo[`punto--${estado}`]}`} />
      {textos[estado]}
    </p>
  )
}
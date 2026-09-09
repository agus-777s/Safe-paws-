import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import estilo from './MiCuentaPage.module.css'

export default function MiCuentaPage() {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  if (!usuario) return null

  async function manejarCierreSesion() {
    try {
      await cerrarSesion()
      navigate('/')
    } catch {
      console.error('No se pudo cerrar la sesión.')
    }
  }

  const nombre = usuario.user_metadata?.nombre

  return (
    <div className={estilo.pagina}>
      <h1 className={estilo.titulo}>Mi cuenta</h1>
      <Card className={estilo.tarjeta}>
        <p className={estilo.nombre}>{nombre ?? usuario.email}</p>
        <p className={estilo.correo}>{usuario.email}</p>
        <div className={estilo.acciones}>
          <Button variante="secundario" onClick={() => void manejarCierreSesion()}>
            Cerrar sesión
          </Button>
        </div>
      </Card>
    </div>
  )
}
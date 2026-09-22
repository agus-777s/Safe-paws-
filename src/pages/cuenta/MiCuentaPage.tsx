import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import estilo from './MiCuentaPage.module.css'

export default function MiCuentaPage() {
  const { usuario, perfil, cerrarSesion } = useAuth()
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

  const nombre = perfil ? `${perfil.nombre} ${perfil.apellido}`.trim() : (usuario.user_metadata?.nombre as string | undefined)
  const etiquetaRol = perfil?.rol === 'dueno' ? 'Dueño' : perfil?.rol === 'cuidador' ? 'Cuidador' : null

  return (
    <div className={estilo.pagina}>
      <h1 className={estilo.titulo}>Mi cuenta</h1>
      <Card className={estilo.tarjeta}>
        <p className={estilo.nombre}>{nombre || usuario.email}</p>
        <p className={estilo.correo}>{usuario.email}</p>
        {etiquetaRol && <p className={estilo.correo}>Rol: {etiquetaRol}</p>}
        {perfil && perfil.mascotas.length > 0 && (
          <p className={estilo.correo}>
            Mascotas: {perfil.mascotas.map((m) => m.nombre).filter(Boolean).join(', ') || `${perfil.mascotas.length} registrada(s)`}
          </p>
        )}
        <div className={estilo.acciones}>
          <Button variante="secundario" onClick={() => void manejarCierreSesion()}>
            Cerrar sesión
          </Button>
        </div>
      </Card>
    </div>
  )
}
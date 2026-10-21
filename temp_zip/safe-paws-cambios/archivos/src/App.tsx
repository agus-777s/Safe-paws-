import { BrowserRouter, Route, Routes } from 'react-router-dom'
import RutaProtegida from '@/components/routing/RutaProtegida'
import PuertaPerfil from '@/components/routing/PuertaPerfil'
import { AuthProvider } from '@/context/AuthProvider'
import AppLayout from '@/components/layout/AppLayout'
import InicioPage from '@/pages/inicio/InicioPage'
import IniciarSesionPage from '@/pages/auth/IniciarSesionPage'
import RegistroPage from '@/pages/auth/RegistroPage'
import OnboardingPage from '@/pages/onboarding/OnboardingPage'
import MiCuentaPage from '@/pages/cuenta/MiCuentaPage'
import ExplorarPage from '@/pages/explorar/ExplorarPage'
import CuidadorPage from '@/pages/explorar/CuidadorPage'
import ReservarPage from '@/pages/reservas/ReservarPage'
import ReservasPage from '@/pages/reservas/ReservasPage'
import SeguimientoPage from '@/pages/reservas/SeguimientoPage'
import MensajesPage from '@/pages/mensajes/MensajesPage'
import ConversacionPage from '@/pages/mensajes/ConversacionPage'
import MascotasPage from '@/pages/mascotas/MascotasPage'
import MascotaFormPage from '@/pages/mascotas/MascotaFormPage'
import MascotaPage from '@/pages/mascotas/MascotaPage'
import PanelCuidadorPage from '@/pages/panel/PanelCuidadorPage'
import EditarPerfilCuidadorPage from '@/pages/panel/EditarPerfilCuidadorPage'
import NoEncontradaPage from '@/pages/errores/NoEncontradaPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/iniciar-sesion" element={<IniciarSesionPage />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route path="/bienvenida" element={<OnboardingPage />} />
            <Route path="/" element={<InicioPage />} />
            <Route path="/explorar" element={<ExplorarPage />} />
            <Route path="/cuidadores/:id" element={<CuidadorPage />} />
            <Route element={<PuertaPerfil />}>
              <Route element={<RutaProtegida />}>
                <Route path="/mi-cuenta" element={<MiCuentaPage />} />
                <Route path="/reservar/:cuidadorId" element={<ReservarPage />} />
                <Route path="/reservas" element={<ReservasPage />} />
                <Route path="/reservas/:id" element={<SeguimientoPage />} />
                <Route path="/mensajes" element={<MensajesPage />} />
                <Route path="/mensajes/:id" element={<ConversacionPage />} />
                <Route path="/mascotas" element={<MascotasPage />} />
                <Route path="/mascotas/nueva" element={<MascotaFormPage />} />
                <Route path="/mascotas/:id" element={<MascotaPage />} />
                <Route path="/mascotas/:id/editar" element={<MascotaFormPage />} />
                <Route path="/panel" element={<PanelCuidadorPage />} />
                <Route path="/panel/perfil" element={<EditarPerfilCuidadorPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NoEncontradaPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

import { BrowserRouter, Route, Routes } from 'react-router-dom'
import RutaProtegida from '@/components/routing/RutaProtegida'
import { AuthProvider } from '@/context/AuthProvider'
import AppLayout from '@/components/layout/AppLayout'
import InicioPage from '@/pages/inicio/InicioPage'
import IniciarSesionPage from '@/pages/auth/IniciarSesionPage'
import RegistroPage from '@/pages/auth/RegistroPage'
import MiCuentaPage from '@/pages/cuenta/MiCuentaPage'
import NoEncontradaPage from '@/pages/errores/NoEncontradaPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<InicioPage />} />
            <Route path="/iniciar-sesion" element={<IniciarSesionPage />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route element={<RutaProtegida />}>
              <Route path="/mi-cuenta" element={<MiCuentaPage />} />
            </Route>
            <Route path="*" element={<NoEncontradaPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
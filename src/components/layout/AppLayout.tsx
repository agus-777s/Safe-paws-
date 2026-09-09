import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import estilo from './AppLayout.module.css'

export default function AppLayout() {
  return (
    <div className={estilo.estructura}>
      <Navbar />
      <main className={estilo.principal}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
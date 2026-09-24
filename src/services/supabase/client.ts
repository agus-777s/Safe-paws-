import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clavePublicable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigurado = Boolean(url && clavePublicable)

if (!supabaseConfigurado) {
  // No lanzar: la app debe renderizar igual (p. ej. en Vercel sin variables
  // configuradas) y mostrar el estado "no configurado" en la interfaz.
  console.warn(
    'Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY. Revisa el archivo .env.local usando .env.example como referencia.',
  )
}

export const supabase = createClient(
  url || 'https://supabase-no-configurado.local',
  clavePublicable || 'clave-no-configurada',
)
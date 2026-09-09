import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clavePublicable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !clavePublicable) {
  throw new Error(
    'Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY. Revisa el archivo .env.local usando .env.example como referencia.',
  )
}

export const supabase = createClient(url, clavePublicable)
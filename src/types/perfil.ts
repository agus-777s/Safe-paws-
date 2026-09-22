export type RolUsuario = 'dueno' | 'cuidador'

// Tipos de mascota según Stitch (pantalla 04: Perro, Gato, Ave, Reptil, Acuáticos, Ganadería)
export type TipoMascota = 'Perro' | 'Gato' | 'Ave' | 'Reptil' | 'Acuáticos' | 'Ganadería'

export const TIPOS_MASCOTA: TipoMascota[] = ['Perro', 'Gato', 'Ave', 'Reptil', 'Acuáticos', 'Ganadería']

export const ICONOS_TIPO_MASCOTA: Record<TipoMascota, string> = {
  Perro: '🐶',
  Gato: '🐱',
  Ave: '🐦',
  Reptil: '🦎',
  Acuáticos: '🐠',
  Ganadería: '🐄',
}

// Sugerencias de raza por tipo para el buscador (pantalla 04: "Buscar Raza/Especie")
export const RAZAS_SUGERIDAS: Record<TipoMascota, string[]> = {
  Perro: ['Golden Retriever', 'Labrador', 'Bulldog', 'Poodle', 'Beagle', 'Pastor Alemán', 'Mestizo'],
  Gato: ['Siamés', 'Persa', 'Maine Coon', 'Británico', 'Mestizo'],
  Ave: ['Canario', 'Periquito', 'Ninfa', 'Loro', 'Otra'],
  Reptil: ['Tortuga', 'Iguana', 'Gecko', 'Serpiente', 'Otro'],
  Acuáticos: ['Betta', 'Guppy', 'Goldfish', 'Tetra', 'Otro'],
  Ganadería: ['Vaca', 'Cabra', 'Oveja', 'Caballo', 'Gallina', 'Otro'],
}

export type ModoMascota = 'individual' | 'grupo'

export interface DatosMascota {
  id: string
  modo: ModoMascota
  nombre: string
  tipo: TipoMascota | ''
  raza: string
  edadAnos: string
  pesoKg: string
  cantidad?: string
  /** Fotos en dataURL (máx 3, reducidas para guardar en el perfil). */
  fotos: string[]
}

export interface DatosCuidador {
  servicios: string[]
  tarifa: string
  zona: string
  disponibilidad: string
  precioPaseo: string
  precioNoche: string
  dias: string[]
  horaInicio: string
  horaFin: string
  radioKm: number
  /** Solo el nombre del archivo de verificación (el documento no se sube al perfil). */
  verificacionNombre: string | null
}

export interface Perfil {
  id: string
  nombre: string
  apellido: string
  descripcion: string
  telefono: string
  rol: RolUsuario | null
  mascotas: DatosMascota[]
  datosCuidador: DatosCuidador | null
  onboardingCompleto: boolean
}

export const ROLES: Array<{ valor: RolUsuario; titulo: string; descripcion: string; icono: string }> = [
  {
    valor: 'dueno',
    titulo: 'Usuario (Dueño)',
    descripcion: 'Busco cuidadores, paseadores y servicios de confianza para mi mascota.',
    icono: '🐶',
  },
  {
    valor: 'cuidador',
    titulo: 'Cuidador',
    descripcion: 'Quiero ofrecer mis servicios de paseo, alojamiento o guardería.',
    icono: '🏠',
  },
]

// Servicios según Stitch (pantalla 07: Paseo, Hospedaje, Guardería, Visita a domicilio, Otros)
export const SERVICIOS_CUIDADOR = ['Paseo', 'Hospedaje', 'Guardería', 'Visita a domicilio', 'Otros']

export const DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

// Comunas de Santiago según el buscador de Stitch (pantalla 07)
export const COMUNAS_SANTIAGO = [
  'Providencia, Santiago',
  'Las Condes, Santiago',
  'Santiago Centro, Santiago',
  'Ñuñoa, Santiago',
  'Vitacura, Santiago',
  'La Reina, Santiago',
  'Macul, Santiago',
  'Peñalolén, Santiago',
  'San Miguel, Santiago',
]

export const RADIOS_KM = [5, 10, 15, 20, 30, 50]

// Sugerencias de precio por noche según Stitch (pantalla 07)
export const SUGERENCIAS_PRECIO_NOCHE = [10000, 20000, 30000, 40000]

export function crearMascotaVacia(modo: ModoMascota = 'individual'): DatosMascota {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `mascota-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  return { id, modo, nombre: '', tipo: '', raza: '', edadAnos: '', pesoKg: '', cantidad: '', fotos: [] }
}

export function crearDatosCuidadorVacios(): DatosCuidador {
  return {
    servicios: [],
    tarifa: '',
    zona: '',
    disponibilidad: '',
    precioPaseo: '',
    precioNoche: '',
    dias: [],
    horaInicio: '08:00',
    horaFin: '19:00',
    radioKm: 5,
    verificacionNombre: null,
  }
}

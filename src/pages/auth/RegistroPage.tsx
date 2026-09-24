import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import BarraProgreso from '@/components/ui/BarraProgreso'
import Button from '@/components/ui/Button'
import CampoTexto from '@/components/ui/CampoTexto'
import Logo from '@/components/ui/Logo'
import MapaCobertura, { SANTIAGO, geocodificarTexto } from '@/components/mapa/MapaCobertura'
import type { UbicacionMapa } from '@/components/mapa/MapaCobertura'
import { useAuth } from '@/hooks/useAuth'
import { guardarPerfil, guardarPerfilPendiente } from '@/services/supabase/perfiles'
import type { DatosCuidador, DatosMascota, ModoMascota, Perfil, RolUsuario, TipoMascota } from '@/types/perfil'
import {
  COMUNAS_SANTIAGO,
  DIAS_SEMANA,
  ICONOS_TIPO_MASCOTA,
  RADIOS_KM,
  RAZAS_SUGERIDAS,
  ROLES,
  SERVICIOS_CUIDADOR,
  SUGERENCIAS_PRECIO_NOCHE,
  TIPOS_MASCOTA,
  crearDatosCuidadorVacios,
  crearMascotaVacia,
} from '@/types/perfil'
import { mensajeError } from '@/utils/errores'
import { clases } from '@/utils/clases'
import estilo from './RegistroPage.module.css'

const TOTAL_PASOS = 4
const MAX_MASCOTAS = 3
const MAX_FOTOS_MASCOTA = 3

/** Reduce una imagen a máx 800px y la devuelve como dataURL (para guardar en el perfil). */
function reducirImagen(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      try {
        const max = 800
        const escala = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * escala))
        canvas.height = Math.max(1, Math.round(img.height * escala))
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      } catch (e) {
        URL.revokeObjectURL(url)
        reject(e instanceof Error ? e : new Error('No se pudo procesar la imagen.'))
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }
    img.src = url
  })
}

function iniciales(nombre: string, apellido: string) {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || '🐾'
}

/** Normaliza un texto para búsquedas: sin tildes, minúsculas y sin espacios extra. */
function normalizar(texto: string) {
  return texto.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export default function RegistroPage() {
  const { usuario, sesionCargando, registrarse, refrescarPerfil } = useAuth()
  const navigate = useNavigate()

  const [paso, setPaso] = useState(1)
  // Paso 1 (Stitch 02 — compartido)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)
  // Paso 2 (Stitch 03 — compartido): el rol se mantiene todo el flujo
  const [rol, setRol] = useState<RolUsuario | null>(null)
  // Paso 3 DUEÑO (Stitch 04)
  const [modoMascotas, setModoMascotas] = useState<ModoMascota>('individual')
  const [mascotas, setMascotas] = useState<DatosMascota[]>([crearMascotaVacia()])
  const [fotoObjetivo, setFotoObjetivo] = useState<string | null>(null)
  const [razaModalPara, setRazaModalPara] = useState<string | null>(null)
  const [razaFiltro, setRazaFiltro] = useState('')
  // Paso 3 CUIDADOR (Stitch 07)
  const [cuidador, setCuidador] = useState<DatosCuidador>(() => crearDatosCuidadorVacios())
  const [busquedaZona, setBusquedaZona] = useState('')
  const [zonaEnfocada, setZonaEnfocada] = useState(false)
  const [destinoMapa, setDestinoMapa] = useState<{ lat: number; lng: number } | null>(null)
  const [sugerenciasPrecio, setSugerenciasPrecio] = useState(false)
  // Paso 4 (Stitch 05 dueño / 06 cuidador)
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false)
  const [aceptaComunicaciones, setAceptaComunicaciones] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)

  const inputFotoPerfil = useRef<HTMLInputElement>(null)
  const inputFotoMascota = useRef<HTMLInputElement>(null)
  const inputVerificacion = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!sesionCargando && usuario) {
      navigate('/', { replace: true })
    }
  }, [sesionCargando, usuario, navigate])

  const esDueno = rol === 'dueno'
  const esCuidador = rol === 'cuidador'

  const titulosPaso: Record<number, string> = {
    1: 'Datos Personales',
    2: 'Elige tu rol',
    3: esCuidador ? 'Servicios' : 'Detalles de Mascota',
    4: 'Confirmación',
  }

  /* ---------- Mascotas (solo Dueño) ---------- */

  function actualizarMascota(id: string, cambios: Partial<DatosMascota>) {
    setMascotas((actuales) => actuales.map((m) => (m.id === id ? { ...m, ...cambios } : m)))
  }

  function agregarMascota() {
    setMascotas((actuales) =>
      actuales.length >= MAX_MASCOTAS ? actuales : [...actuales, crearMascotaVacia(modoMascotas)],
    )
  }

  function eliminarMascota(id: string) {
    setMascotas((actuales) => (actuales.length <= 1 ? actuales : actuales.filter((m) => m.id !== id)))
  }

  function cambiarModoMascotas(modo: ModoMascota) {
    setModoMascotas(modo)
    setMascotas((actuales) => actuales.map((m) => ({ ...m, modo })))
  }

  async function agregarFotosMascota(archivos: FileList | null) {
    if (!archivos || !fotoObjetivo) return
    const mascota = mascotas.find((m) => m.id === fotoObjetivo)
    if (!mascota) return
    const espacio = MAX_FOTOS_MASCOTA - mascota.fotos.length
    if (espacio <= 0) return
    try {
      const nuevas = await Promise.all(
        Array.from(archivos)
          .slice(0, espacio)
          .filter((a) => a.type.startsWith('image/'))
          .map((a) => reducirImagen(a)),
      )
      if (nuevas.length > 0) actualizarMascota(fotoObjetivo, { fotos: [...mascota.fotos, ...nuevas] })
    } catch {
      setError('No se pudieron leer las fotos. Intenta con JPG o PNG.')
    }
  }

  function quitarFotoMascota(id: string, indice: number) {
    const mascota = mascotas.find((m) => m.id === id)
    if (!mascota) return
    actualizarMascota(id, { fotos: mascota.fotos.filter((_, i) => i !== indice) })
  }

  /* ---------- Cuidador (solo Cuidador) ---------- */

  function setCampoCuidador<K extends keyof DatosCuidador>(campo: K, valor: DatosCuidador[K]) {
    setCuidador((actual) => ({ ...actual, [campo]: valor }))
  }

  function alternarServicio(servicio: string) {
    setCuidador((actual) => ({
      ...actual,
      servicios: actual.servicios.includes(servicio)
        ? actual.servicios.filter((s) => s !== servicio)
        : [...actual.servicios, servicio],
    }))
  }

  function alternarDia(dia: string) {
    setCuidador((actual) => ({
      ...actual,
      dias: actual.dias.includes(dia) ? actual.dias.filter((d) => d !== dia) : [...actual.dias, dia],
    }))
  }

  function manejarUbicacionMapa(ubicacion: UbicacionMapa) {
    setCuidador((actual) => ({
      ...actual,
      zona: ubicacion.direccion,
      latitud: ubicacion.lat,
      longitud: ubicacion.lng,
    }))
    setBusquedaZona('')
  }

  function elegirComuna(comuna: string) {
    setCampoCuidador('zona', comuna)
    setBusquedaZona('')
    setZonaEnfocada(false)
    void geocodificarTexto(comuna).then((punto) => {
      if (!punto) return
      setDestinoMapa(punto)
      setCuidador((actual) => ({ ...actual, latitud: punto.lat, longitud: punto.lng }))
    })
  }

  /* ---------- Validación y navegación ---------- */

  function validarPaso(actual: number): string | null {
    if (actual === 1) {
      if (!nombre.trim() || !apellido.trim() || !telefono.trim()) {
        return 'Completa tu nombre, apellido y teléfono para continuar.'
      }
      return null
    }
    if (actual === 2) {
      if (!rol) return 'Elige un rol para personalizar tu experiencia.'
      return null
    }
    if (actual === 3) {
      if (esDueno) {
        const incompleta = mascotas.some((m) => !m.nombre.trim() || !m.tipo)
        if (incompleta) return 'Cada mascota necesita al menos un nombre y un tipo.'
      }
      if (esCuidador) {
        if (cuidador.servicios.length === 0) return 'Selecciona al menos un servicio que quieras ofrecer.'
        if (!cuidador.zona.trim()) return 'Indica la zona donde ofreces tus servicios.'
      }
      return null
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return 'Escribe un correo electrónico válido.'
    if (contrasena.length < 6) return 'La contraseña debe tener al menos 6 caracteres.'
    if (contrasena !== confirmacion) return 'Las contraseñas no coinciden.'
    if (!aceptaTerminos) {
      return 'Debes aceptar los Términos del servicio.'
    }
    if (esDueno && !aceptaPrivacidad) {
      return 'Debes aceptar la Política de privacidad.'
    }
    if (esCuidador && !aceptaComunicaciones) {
      return 'Debes aceptar recibir comunicaciones y alertas importantes.'
    }
    return null
  }

  function avanzar() {
    const problema = validarPaso(paso)
    if (problema) {
      setError(problema)
      return
    }
    setError(null)
    setPaso((actual) => Math.min(TOTAL_PASOS, actual + 1))
    window.scrollTo({ top: 0 })
  }

  function retroceder() {
    if (paso === 1) {
      navigate('/iniciar-sesion')
      return
    }
    setError(null)
    setPaso((actual) => Math.max(1, actual - 1))
    window.scrollTo({ top: 0 })
  }

  function lanzarConfeti() {
    try {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } })
      window.setTimeout(() => {
        confetti({ particleCount: 45, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } })
        confetti({ particleCount: 45, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } })
      }, 300)
    } catch {
      // El confeti es decorativo: si falla, el registro sigue válido.
    }
  }

  async function finalizar() {
    const problema = validarPaso(4)
    if (problema) {
      setError(problema)
      return
    }
    setError(null)
    setEnviando(true)
    try {
      const resultado = await registrarse({ nombre: `${nombre.trim()} ${apellido.trim()}`.trim(), correo, contrasena })
      const perfil: Perfil = {
        id: resultado.idUsuario ?? '',
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        descripcion: descripcion.trim(),
        telefono: telefono.trim(),
        rol,
        mascotas: esDueno ? mascotas : [],
        datosCuidador: esCuidador
          ? {
              ...cuidador,
              servicios: cuidador.servicios,
              tarifa: (cuidador.precioNoche || cuidador.precioPaseo).trim(),
              zona: cuidador.zona.trim(),
              disponibilidad:
                `Días ${cuidador.dias.join(' ') || '—'} · ${cuidador.horaInicio}–${cuidador.horaFin}`.trim(),
            }
          : null,
        onboardingCompleto: false,
      }
      if (resultado.sesionIniciada && resultado.idUsuario) {
        try {
          await guardarPerfil(perfil)
          await refrescarPerfil()
        } catch {
          guardarPerfilPendiente(perfil)
        }
      } else {
        guardarPerfilPendiente(perfil)
      }
      setExito(true)
      if (esCuidador) lanzarConfeti()
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setEnviando(false)
    }
  }

  const primeraMascota = mascotas[0]
  const detalleMascota =
    [primeraMascota?.tipo, primeraMascota?.raza, primeraMascota?.edadAnos ? `${primeraMascota.edadAnos} años` : '']
      .filter(Boolean)
      .join(' • ') || 'Completa los datos de tu mascota'
  const zonasSugeridas =
    busquedaZona.trim().length >= 2
      ? COMUNAS_SANTIAGO.filter((c) => c.toLowerCase().includes(busquedaZona.trim().toLowerCase()))
      : []
  const mascotaRaza = mascotas.find((m) => m.id === razaModalPara)
  const razasDisponibles = mascotaRaza?.tipo
    ? RAZAS_SUGERIDAS[mascotaRaza.tipo].filter((r) =>
        normalizar(r).includes(normalizar(razaFiltro)),
      )
    : []

  return (
    <div className={estilo.pagina}>
      <div className={estilo.contenedor}>
        <header className={estilo.barra}>
          <button
            type="button"
            className={estilo.atras}
            onClick={retroceder}
            aria-label={paso === 1 ? 'Volver a iniciar sesión' : 'Volver al paso anterior'}
          >
            ←
          </button>
          <p className={estilo.marca}>Registro</p>
          <span className={estilo.espaciador} aria-hidden="true" />
        </header>

        <BarraProgreso
          pasoActual={paso}
          totalPasos={TOTAL_PASOS}
          etiqueta={`${titulosPaso[paso]} · Paso ${paso}/${TOTAL_PASOS}`}
        />

        {error && (
          <p className={estilo.error} role="alert">
            {error}
          </p>
        )}

        {paso === 1 && (
          <section className={estilo.tarjeta} aria-label="Datos personales">
            <div className={estilo.avatarBloque}>
              <button
                type="button"
                className={estilo.avatarBoton}
                onClick={() => inputFotoPerfil.current?.click()}
                aria-label="Subir foto de perfil"
              >
                <span className={estilo.avatar} aria-hidden="true">
                  {fotoPerfil ? (
                    <img src={fotoPerfil} alt="" className={estilo.avatarImg} />
                  ) : nombre || apellido ? (
                    iniciales(nombre, apellido)
                  ) : (
                    <Logo ancho={30} alto={30} />
                  )}
                </span>
                <span className={estilo.avatarMas} aria-hidden="true">
                  +
                </span>
              </button>
              <input
                ref={inputFotoPerfil}
                type="file"
                accept="image/*"
                className={estilo.archivoOculto}
                aria-label="Foto de perfil"
                onChange={(e) => {
                  const archivo = e.target.files?.[0]
                  if (archivo) {
                    void reducirImagen(archivo).then(setFotoPerfil).catch(() => setError('No se pudo leer la foto.'))
                  }
                  e.target.value = ''
                }}
              />
              <p className={estilo.avatarTexto}>Sube una foto de perfil</p>
            </div>
            <div className={estilo.rejilla}>
              <CampoTexto id="nombre" etiqueta="Nombre" valor={nombre} alCambiar={setNombre} autoComplete="given-name" requerido />
              <CampoTexto id="apellido" etiqueta="Apellido" valor={apellido} alCambiar={setApellido} autoComplete="family-name" requerido />
            </div>
            <CampoTexto
              id="telefono"
              etiqueta="Teléfono"
              tipo="text"
              valor={telefono}
              alCambiar={setTelefono}
              autoComplete="tel"
              placeholder="+56 9 1234 5678"
              requerido
            />
            <div className={estilo.campoArea}>
              <label className={estilo.etiquetaArea} htmlFor="descripcion">
                Descripción breve
              </label>
              <textarea
                id="descripcion"
                className={estilo.area}
                rows={3}
                maxLength={150}
                placeholder="Ej: Amante de los perros, paseo todos los días..."
                value={descripcion}
                onChange={(evento) => setDescripcion(evento.target.value)}
              />
              <p className={estilo.contador}>{descripcion.length}/150</p>
            </div>
          </section>
        )}

        {paso === 2 && (
          <section aria-label="Selección de rol">
            <p className={estilo.tituloSeccion}>Elige tu rol</p>
            <p className={estilo.subtituloSeccion}>Selecciona cómo usarás Safe Paws para personalizar tu experiencia.</p>
            <div className={estilo.roles}>
              {ROLES.map((opcion) => (
                <label
                  key={opcion.valor}
                  className={clases(estilo.tarjetaRol, rol === opcion.valor && estilo.tarjetaRolActiva)}
                >
                  <input
                    type="radio"
                    name="rol"
                    value={opcion.valor}
                    checked={rol === opcion.valor}
                    onChange={() => setRol(opcion.valor)}
                    className={estilo.radioOculto}
                  />
                  <span className={estilo.rolImagen} aria-hidden="true">
                    <img
                      src={opcion.imagen}
                      alt=""
                      className={estilo.rolImg}
                      loading="lazy"
                    />
                  </span>
                  <span className={estilo.rolIcono} aria-hidden="true">
                    {opcion.icono}
                  </span>
                  <span className={estilo.rolTitulo}>{opcion.titulo}</span>
                  <span className={estilo.rolTexto}>{opcion.descripcion}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {paso === 3 && esDueno && (
          <section className={estilo.tarjeta} aria-label="Registrar mascota">
            <p className={estilo.tituloSeccion}>Registrar Mascota</p>
            <p className={estilo.subtituloSeccion}>
              Sube fotos de tus compañeros y cuéntanos sobre ellos para brindarles el mejor cuidado.
            </p>
            <div className={estilo.pestanas} role="group" aria-label="Tipo de registro de mascotas">
              {(
                [
                  { valor: 'individual', texto: 'Mascotas Individuales' },
                  { valor: 'grupo', texto: 'Grupos de animales' },
                ] as const
              ).map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  className={clases(estilo.pestana, modoMascotas === opcion.valor && estilo.pestanaActiva)}
                  onClick={() => cambiarModoMascotas(opcion.valor)}
                >
                  {opcion.texto}
                </button>
              ))}
            </div>
            {mascotas.map((mascota, indice) => (
              <article key={mascota.id} className={estilo.mascota}>
                <div className={estilo.mascotaEncabezado}>
                  <p className={estilo.mascotaTitulo}>
                    {modoMascotas === 'grupo' ? `Grupo ${indice + 1}` : `Mascota ${indice + 1}`}
                  </p>
                  {mascotas.length > 1 && (
                    <button type="button" className={estilo.eliminar} onClick={() => eliminarMascota(mascota.id)}>
                      Eliminar
                    </button>
                  )}
                </div>
                <p className={estilo.etiquetaBloque}>
                  {modoMascotas === 'grupo' ? 'Foto representativa (Máx 3)' : 'Fotos de tu mascota (Máx 3)'}
                </p>
                <div className={estilo.fotos}>
                  {mascota.fotos.map((foto, i) => (
                    <span key={i} className={estilo.fotoMini}>
                      <img src={foto} alt={`Foto ${i + 1} de ${mascota.nombre || 'tu mascota'}`} />
                      <button
                        type="button"
                        className={estilo.fotoQuitar}
                        aria-label={`Quitar foto ${i + 1}`}
                        onClick={() => quitarFotoMascota(mascota.id, i)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {mascota.fotos.length < MAX_FOTOS_MASCOTA && (
                    <button
                      type="button"
                      className={estilo.fotoAgregar}
                      onClick={() => {
                        setFotoObjetivo(mascota.id)
                        inputFotoMascota.current?.click()
                      }}
                    >
                      <span aria-hidden="true">📷</span>
                      Subir Foto
                    </button>
                  )}
                </div>
                <p className={estilo.etiquetaBloque}>
                  {modoMascotas === 'grupo' ? 'Tipo de Animal' : 'Tipo de Mascota'}
                </p>
                <div className={estilo.tipos} role="group" aria-label="Tipo de mascota">
                  {TIPOS_MASCOTA.map((tipo: TipoMascota) => (
                    <button
                      key={tipo}
                      type="button"
                      aria-pressed={mascota.tipo === tipo}
                      className={clases(estilo.tipoBtn, mascota.tipo === tipo && estilo.tipoBtnActivo)}
                      onClick={() => actualizarMascota(mascota.id, { tipo })}
                    >
                      <span aria-hidden="true">{ICONOS_TIPO_MASCOTA[tipo]}</span>
                      {tipo}
                    </button>
                  ))}
                </div>
                <CampoTexto
                  id={`mascota-nombre-${mascota.id}`}
                  etiqueta="Nombre de la mascota"
                  valor={mascota.nombre}
                  alCambiar={(valor) => actualizarMascota(mascota.id, { nombre: valor })}
                  requerido
                />
                {modoMascotas === 'grupo' && (
                  <CampoTexto
                    id={`mascota-cantidad-${mascota.id}`}
                    etiqueta="Cantidad aproximada"
                    valor={mascota.cantidad ?? ''}
                    alCambiar={(valor) => actualizarMascota(mascota.id, { cantidad: valor })}
                    placeholder="Ej: 5"
                  />
                )}
                <div className={estilo.razaFila}>
                  <div className={estilo.razaCampo}>
                    <CampoTexto
                      id={`mascota-raza-${mascota.id}`}
                      etiqueta="Raza / Especie"
                      valor={mascota.raza}
                      alCambiar={(valor) => actualizarMascota(mascota.id, { raza: valor })}
                      placeholder="Ej: Golden Retriever"
                    />
                  </div>
                  <button
                    type="button"
                    className={estilo.razaBuscar}
                    onClick={() => {
                      setRazaModalPara(mascota.id)
                      setRazaFiltro('')
                    }}
                  >
                    Buscar
                  </button>
                </div>
                <div className={estilo.rejilla}>
                  <CampoTexto
                    id={`mascota-edad-${mascota.id}`}
                    etiqueta="Edad (años)"
                    valor={mascota.edadAnos}
                    alCambiar={(valor) => actualizarMascota(mascota.id, { edadAnos: valor })}
                    placeholder="Ej: 3"
                  />
                  <CampoTexto
                    id={`mascota-peso-${mascota.id}`}
                    etiqueta={modoMascotas === 'grupo' ? 'Peso (Opcional)' : 'Peso (kg)'}
                    valor={mascota.pesoKg}
                    alCambiar={(valor) => actualizarMascota(mascota.id, { pesoKg: valor })}
                    placeholder="Ej: 28"
                  />
                </div>
              </article>
            ))}
            <input
              ref={inputFotoMascota}
              type="file"
              accept="image/*"
              multiple
              className={estilo.archivoOculto}
              aria-label="Fotos de la mascota"
              onChange={(e) => {
                void agregarFotosMascota(e.target.files)
                e.target.value = ''
              }}
            />
            {mascotas.length < MAX_MASCOTAS && (
              <button type="button" className={estilo.agregar} onClick={agregarMascota}>
                + Añadir otra mascota
              </button>
            )}
          </section>
        )}

        {paso === 3 && esCuidador && (
          <section className={estilo.tarjeta} aria-label="Configurar servicios">
            <p className={estilo.tituloSeccion}>Configura tus servicios</p>
            <p className={estilo.subtituloSeccion}>
              Define qué servicios ofreces, tu disponibilidad y tu zona de cobertura para encontrar a los clientes
              ideales.
            </p>
            <p className={estilo.etiquetaBloque}>Servicios que ofreces</p>
            <div className={estilo.chips} role="group" aria-label="Servicios">
              {SERVICIOS_CUIDADOR.map((servicio) => (
                <button
                  key={servicio}
                  type="button"
                  aria-pressed={cuidador.servicios.includes(servicio)}
                  className={clases(estilo.chip, cuidador.servicios.includes(servicio) && estilo.chipActivo)}
                  onClick={() => alternarServicio(servicio)}
                >
                  {servicio}
                </button>
              ))}
            </div>
            <p className={estilo.etiquetaBloque}>Disponibilidad semanal</p>
            <div className={estilo.dias} role="group" aria-label="Días disponibles">
              {DIAS_SEMANA.map((dia) => (
                <button
                  key={dia}
                  type="button"
                  aria-pressed={cuidador.dias.includes(dia)}
                  className={clases(estilo.dia, cuidador.dias.includes(dia) && estilo.diaActivo)}
                  onClick={() => alternarDia(dia)}
                >
                  {dia}
                </button>
              ))}
            </div>
            <div className={estilo.rejilla}>
              <CampoTexto
                id="hora-inicio"
                etiqueta="Hora inicio"
                tipo="time"
                valor={cuidador.horaInicio}
                alCambiar={(valor) => setCampoCuidador('horaInicio', valor)}
                requerido
              />
              <CampoTexto
                id="hora-fin"
                etiqueta="Hora fin"
                tipo="time"
                valor={cuidador.horaFin}
                alCambiar={(valor) => setCampoCuidador('horaFin', valor)}
                requerido
              />
            </div>
            <p className={estilo.etiquetaBloque}>Zona de cobertura</p>
            <div className={estilo.zonaBuscador}>
              <CampoTexto
                id="zona"
                etiqueta="Buscar comuna o ciudad"
                valor={busquedaZona || cuidador.zona}
                alCambiar={(valor) => {
                  setBusquedaZona(valor)
                  setCampoCuidador('zona', valor)
                }}
                placeholder="Ej: Providencia"
                requerido
                onFocus={() => setZonaEnfocada(true)}
                onBlur={() => setZonaEnfocada(false)}
              />
              {zonaEnfocada && zonasSugeridas.length > 0 && (
                <div className={estilo.zonaResultados} role="listbox" aria-label="Comunas sugeridas">
                  {zonasSugeridas.map((comuna) => (
                    <button
                      key={comuna}
                      type="button"
                      role="option"
                      aria-selected={cuidador.zona === comuna}
                      className={estilo.zonaOpcion}
                      onMouseDown={() => elegirComuna(comuna)}
                    >
                      {comuna}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div
              className={estilo.cobertura}
              onFocus={() => setZonaEnfocada(false)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setZonaEnfocada(false)
              }}
            >
              <p className={estilo.ayuda}>Toca el mapa o arrastra el pin para marcar tu ubicación real.</p>
              <MapaCobertura
                radioKm={cuidador.radioKm}
                centroInicial={SANTIAGO}
                destino={destinoMapa}
                alCambiarUbicacion={manejarUbicacionMapa}
              />
              <p className={estilo.coberturaTexto}>{cuidador.zona || 'Santiago de Chile'}</p>
            </div>
            <div className={estilo.infoFila}>
              <span>Radio de servicio</span>
              <strong>{cuidador.radioKm} km</strong>
            </div>
            <div className={estilo.chips} role="group" aria-label="Radio de servicio">
              {RADIOS_KM.map((km) => (
                <button
                  key={km}
                  type="button"
                  aria-pressed={cuidador.radioKm === km}
                  className={clases(estilo.chip, cuidador.radioKm === km && estilo.chipActivo)}
                  onClick={() => setCampoCuidador('radioKm', km)}
                >
                  {km} km
                </button>
              ))}
            </div>
            <p className={estilo.etiquetaBloque}>Tarifas base</p>
            <CampoTexto
              id="precio-paseo"
              etiqueta="Precio por paseo (CLP)"
              tipo="number"
              valor={cuidador.precioPaseo}
              alCambiar={(valor) => setCampoCuidador('precioPaseo', valor)}
              placeholder="15000"
            />
            <p className={estilo.ayuda}>Sugerido en tu zona: $5.000 - $10.000 CLP</p>
            <div className={estilo.zonaBuscador}>
              <CampoTexto
                id="precio-noche"
                etiqueta="Precio por noche (Hospedaje)"
                tipo="number"
                valor={cuidador.precioNoche}
                alCambiar={(valor) => setCampoCuidador('precioNoche', valor)}
                placeholder="10500"
                onFocus={() => setSugerenciasPrecio(true)}
                onBlur={() => setSugerenciasPrecio(false)}
              />
              {sugerenciasPrecio && (
                <div className={estilo.zonaResultados} role="listbox" aria-label="Precios sugeridos">
                  {SUGERENCIAS_PRECIO_NOCHE.map((precio) => (
                    <button
                      key={precio}
                      type="button"
                      role="option"
                      aria-selected={false}
                      className={estilo.zonaOpcion}
                      onMouseDown={() => {
                        setCampoCuidador('precioNoche', String(precio))
                        setSugerenciasPrecio(false)
                      }}
                    >
                      ${precio.toLocaleString('es-CL')} CLP
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className={estilo.etiquetaBloque}>Verificación de identidad</p>
            <p className={estilo.subtituloSeccion}>
              Sube una foto de tu identificación oficial para generar confianza en la comunidad.
            </p>
            <button
              type="button"
              className={estilo.subida}
              onClick={() => inputVerificacion.current?.click()}
            >
              <span aria-hidden="true">📄</span>
              {cuidador.verificacionNombre ?? 'Toca para subir documento'}
              <small>JPG, PNG o PDF (Máx. 5MB)</small>
            </button>
            <input
              ref={inputVerificacion}
              type="file"
              accept="image/*,.pdf"
              className={estilo.archivoOculto}
              aria-label="Documento de identidad"
              onChange={(e) => {
                const archivo = e.target.files?.[0]
                if (archivo) setCampoCuidador('verificacionNombre', archivo.name)
                e.target.value = ''
              }}
            />
          </section>
        )}

        {paso === 4 && esDueno && (
          <section aria-label="Confirmación de dueño">
            <p className={estilo.tituloSeccion}>Revisa tus datos</p>
            <div className={estilo.resumen}>
              <div className={estilo.resumenEncabezado}>
                <div className={estilo.avatar} aria-hidden="true">
                  {primeraMascota?.fotos[0] ? (
                    <img src={primeraMascota.fotos[0]} alt="" className={estilo.avatarImg} />
                  ) : (
                    primeraMascota?.nombre?.charAt(0).toUpperCase() || '🐾'
                  )}
                </div>
                <div>
                  <p className={estilo.resumenNombre}>{primeraMascota?.nombre || 'Tu mascota'}</p>
                  <p className={estilo.resumenDetalle}>{detalleMascota}</p>
                </div>
              </div>
              <dl className={estilo.resumenLista}>
                <div className={estilo.resumenFila}>
                  <dt>Dueño</dt>
                  <dd>{`${nombre} ${apellido}`.trim() || '—'}</dd>
                </div>
                <div className={estilo.resumenFila}>
                  <dt>Email</dt>
                  <dd>{correo || '—'}</dd>
                </div>
                <div className={estilo.resumenFila}>
                  <dt>Teléfono</dt>
                  <dd>{telefono || '—'}</dd>
                </div>
              </dl>
            </div>
            <div className={estilo.tarjeta}>
              <CampoTexto id="correo" etiqueta="Correo electrónico" tipo="email" valor={correo} alCambiar={setCorreo} autoComplete="email" requerido />
              <div className={estilo.rejilla}>
                <CampoTexto
                  id="contrasena"
                  etiqueta="Contraseña (mín. 6)"
                  tipo="password"
                  valor={contrasena}
                  alCambiar={setContrasena}
                  autoComplete="new-password"
                  requerido
                />
                <CampoTexto
                  id="confirmacion"
                  etiqueta="Confirmar contraseña"
                  tipo="password"
                  valor={confirmacion}
                  alCambiar={setConfirmacion}
                  autoComplete="new-password"
                  requerido
                />
              </div>
              <label className={estilo.casilla}>
                <input type="checkbox" checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)} />
                <span>
                  He leído y acepto los <strong>Términos y condiciones</strong> del servicio.
                </span>
              </label>
              <label className={estilo.casilla}>
                <input type="checkbox" checked={aceptaPrivacidad} onChange={(e) => setAceptaPrivacidad(e.target.checked)} />
                <span>
                  Acepto la <strong>Política de privacidad</strong> y el tratamiento de mis datos.
                </span>
              </label>
            </div>
          </section>
        )}

        {paso === 4 && esCuidador && (
          <section aria-label="Confirmación de cuidador">
            <p className={estilo.tituloSeccion}>Revisa tus datos</p>
            <div className={estilo.resumen}>
              <div className={estilo.resumenEncabezado}>
                <div className={estilo.avatar} aria-hidden="true">
                  {iniciales(nombre, apellido)}
                </div>
                <div>
                  <p className={estilo.resumenNombre}>{`${nombre} ${apellido}`.trim() || 'Tu perfil'}</p>
                  <p className={estilo.resumenDetalle}>Cuidador de mascotas</p>
                </div>
              </div>
              <dl className={estilo.resumenLista}>
                <div className={estilo.resumenFila}>
                  <dt>Correo electrónico</dt>
                  <dd>{correo || '—'}</dd>
                </div>
                <div className={estilo.resumenFila}>
                  <dt>Teléfono</dt>
                  <dd>{telefono || '—'}</dd>
                </div>
                <div className={estilo.resumenFila}>
                  <dt>Ubicación</dt>
                  <dd>{cuidador.zona || '—'}</dd>
                </div>
              </dl>
              <p className={estilo.etiquetaBloque}>Servicios ofrecidos</p>
              <div className={estilo.chips}>
                {cuidador.servicios.map((s) => (
                  <span key={s} className={clases(estilo.chip, estilo.chipActivo)}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className={estilo.tarjeta}>
              <CampoTexto id="correo" etiqueta="Correo electrónico" tipo="email" valor={correo} alCambiar={setCorreo} autoComplete="email" requerido />
              <div className={estilo.rejilla}>
                <CampoTexto
                  id="contrasena"
                  etiqueta="Contraseña (mín. 6)"
                  tipo="password"
                  valor={contrasena}
                  alCambiar={setContrasena}
                  autoComplete="new-password"
                  requerido
                />
                <CampoTexto
                  id="confirmacion"
                  etiqueta="Confirmar contraseña"
                  tipo="password"
                  valor={confirmacion}
                  alCambiar={setConfirmacion}
                  autoComplete="new-password"
                  requerido
                />
              </div>
              <label className={estilo.casilla}>
                <input type="checkbox" checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)} />
                <span>
                  Acepto los <strong>Términos y Condiciones</strong> de la plataforma.
                </span>
              </label>
              <label className={estilo.casilla}>
                <input
                  type="checkbox"
                  checked={aceptaComunicaciones}
                  onChange={(e) => setAceptaComunicaciones(e.target.checked)}
                />
                <span>Acepto recibir comunicaciones y alertas importantes.</span>
              </label>
            </div>
          </section>
        )}

        <div
          className={estilo.acciones}
          onFocus={() => {
            setZonaEnfocada(false)
            setSugerenciasPrecio(false)
          }}
        >
          {paso < TOTAL_PASOS ? (
            <Button
              tamanio="grande"
              className={estilo.boton}
              disabled={paso === 2 && !rol}
              onClick={avanzar}
            >
              {paso === 3 && esCuidador ? 'Continuar al último paso →' : 'Continuar →'}
            </Button>
          ) : (
            <Button
              tamanio="grande"
              className={estilo.boton}
              disabled={
                enviando ||
                !aceptaTerminos ||
                (esDueno && !aceptaPrivacidad) ||
                (esCuidador && !aceptaComunicaciones)
              }
              onClick={() => void finalizar()}
            >
              {enviando ? 'Creando tu cuenta…' : 'Finalizar Registro'}
            </Button>
          )}
          <p className={estilo.pies}>
            ¿Ya tienes cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link>
          </p>
        </div>
      </div>

      {razaModalPara && (
        <div className={estilo.exito} role="dialog" aria-modal="true" aria-label="Buscar raza o especie">
          <div className={estilo.exitoTarjeta}>
            <h2 className={estilo.exitoTitulo}>Buscar Raza/Especie</h2>
            <CampoTexto
              id="raza-filtro"
              etiqueta="Escribe para filtrar"
              valor={razaFiltro}
              alCambiar={setRazaFiltro}
              placeholder="Ej: Golden"
            />
            <div className={estilo.razaLista}>
              {razasDisponibles.length === 0 && (
                <p className={estilo.subtituloSeccion}>
                  {mascotaRaza?.tipo ? 'Sin coincidencias. Puedes escribirla directamente.' : 'Elige primero el tipo de mascota.'}
                </p>
              )}
              {razasDisponibles.map((raza) => (
                <button
                  key={raza}
                  type="button"
                  className={estilo.razaOpcion}
                  onClick={() => {
                    actualizarMascota(razaModalPara, { raza })
                    setRazaModalPara(null)
                  }}
                >
                  {raza}
                </button>
              ))}
            </div>
            <Button
              tamanio="grande"
              variante="secundario"
              className={estilo.boton}
              onClick={() => setRazaModalPara(null)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}

      {exito && (
        <div className={estilo.exito} role="dialog" aria-modal="true" aria-label="Registro completado">
          <div className={estilo.exitoTarjeta}>
            <div className={estilo.exitoMedalla} aria-hidden="true">
              🐾
            </div>
            <h2 className={estilo.exitoTitulo}>¡Bienvenido a Safe Paws!</h2>
            <p className={estilo.exitoTexto}>
              {esDueno
                ? `El perfil de ${primeraMascota?.nombre || 'tu mascota'} se ha creado exitosamente. Ya puedes empezar a disfrutar de todos nuestros servicios.`
                : 'Tu perfil de cuidador ha sido creado con éxito. ¡Estamos felices de tenerte con nosotros!'}
            </p>
            <Button tamanio="grande" className={estilo.boton} enlace="/">
              ¡Listo! Ir al Inicio →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useCallback, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SANTIAGO } from '@/components/mapa/geocodificacion'
import MapaCobertura from '@/components/mapa/MapaCobertura'
import type { UbicacionMapa } from '@/components/mapa/MapaCobertura'
import Button from '@/components/ui/Button'
import CampoSeleccion from '@/components/ui/CampoSeleccion'
import CampoTexto from '@/components/ui/CampoTexto'
import EstadoVista from '@/components/ui/EstadoVista'
import { useAuth } from '@/hooks/useAuth'
import { useCarga } from '@/hooks/useCarga'
import { guardarPerfilCuidador, obtenerMiPerfilCuidador } from '@/services/supabase/cuidadores'
import { SERVICIOS } from '@/types/dominio'
import type { PerfilCuidador } from '@/types/dominio'
import { DIAS_SEMANA, RADIOS_KM } from '@/types/perfil'
import type { Perfil } from '@/types/perfil'
import { clases } from '@/utils/clases'
import { mensajeError } from '@/utils/errores'
import { alternar, formularioDesdePerfil, validarFormularioPerfil } from './formularioPerfil'
import type { ErroresPerfil, FormularioPerfil } from './formularioPerfil'
import estilo from './EditarPerfilCuidadorPage.module.css'

const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function EditarPerfilCuidadorPage() {
  const { usuario, perfil } = useAuth()
  const usuarioId = usuario?.id ?? ''
  const cargar = useCallback(() => obtenerMiPerfilCuidador(usuarioId), [usuarioId])
  const { datos, cargando, error, recargar } = useCarga(cargar)

  if (!usuario) return null

  return (
    <div className={estilo.pagina}>
      <Link to="/panel" className={estilo.volver}>
        ← Mi panel
      </Link>
      <EstadoVista cargando={cargando} error={error} alReintentar={recargar} etiquetaCarga="Cargando tu perfil…">
        {!cargando && !error && (
          <FormularioPerfilCuidador key={datos?.id ?? 'nuevo'} usuarioId={usuarioId} existente={datos} perfil={perfil} />
        )}
      </EstadoVista>
    </div>
  )
}

interface FormularioProps {
  usuarioId: string
  existente: PerfilCuidador | null
  perfil: Perfil | null
}

/** Datos del registro (onboarding) para precargar un perfil nuevo. */
function respaldoDesdeRegistro(perfil: Perfil | null): Partial<FormularioPerfil> {
  const registro = perfil?.datosCuidador
  if (!registro) return {}
  return {
    bio: perfil.descripcion ?? '',
    comuna: registro.zona ?? '',
    latitud: registro.latitud,
    longitud: registro.longitud,
    radioKm: registro.radioKm || 5,
    horaInicio: registro.horaInicio || '08:00',
    horaFin: registro.horaFin || '19:00',
  }
}

function FormularioPerfilCuidador({ usuarioId, existente, perfil }: FormularioProps) {
  const navigate = useNavigate()
  const { refrescarPerfil } = useAuth()
  const [formulario, setFormulario] = useState<FormularioPerfil>(() =>
    formularioDesdePerfil(existente, respaldoDesdeRegistro(perfil)),
  )
  const [errores, setErrores] = useState<ErroresPerfil>({})
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const [exito, setExito] = useState(false)
  const primeraUbicacionRef = useRef(true)
  const idBio = useId()

  // Solo el centro al montar; luego el mapa se mueve por sí mismo.
  const [centroInicial] = useState(() =>
    formulario.latitud != null && formulario.longitud != null
      ? { lat: formulario.latitud, lng: formulario.longitud }
      : SANTIAGO,
  )

  const cambiar = <K extends keyof FormularioPerfil>(campo: K, valor: FormularioPerfil[K]) =>
    setFormulario((previo) => ({ ...previo, [campo]: valor }))

  const alCambiarUbicacion = useCallback((ubicacion: UbicacionMapa) => {
    const esPrimera = primeraUbicacionRef.current
    primeraUbicacionRef.current = false
    setFormulario((previo) => ({
      ...previo,
      latitud: ubicacion.lat,
      longitud: ubicacion.lng,
      // Al montar, el mapa notifica el punto inicial: no pisar la comuna ya escrita.
      comuna: esPrimera && previo.comuna.trim() ? previo.comuna : ubicacion.direccion,
    }))
  }, [])

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErrorGuardado(null)
    const resultado = validarFormularioPerfil(formulario)
    if (!resultado.ok) {
      setErrores(resultado.errores)
      return
    }
    setErrores({})
    setGuardando(true)
    try {
      await guardarPerfilCuidador(usuarioId, resultado.datos)
      setExito(true)
      await refrescarPerfil().catch(() => undefined)
      navigate('/panel', { state: { aviso: 'Perfil de cuidador guardado.' } })
    } catch (e) {
      setErrorGuardado(mensajeError(e))
      setGuardando(false)
    }
  }

  const hayErrores = Object.keys(errores).length > 0

  return (
    <form className={estilo.formulario} onSubmit={(e) => void guardar(e)} noValidate>
      <header>
        <h1 className={estilo.titulo}>{existente ? 'Editar perfil de cuidador' : 'Crea tu perfil de cuidador'}</h1>
        <p className={estilo.subtitulo}>Así te verán los dueños en el buscador.</p>
      </header>

      <section className={estilo.seccion}>
        <label htmlFor={idBio} className={estilo.etiqueta}>
          Sobre ti
        </label>
        <textarea
          id={idBio}
          className={estilo.areaTexto}
          rows={4}
          maxLength={1000}
          placeholder="Cuenta tu experiencia con mascotas, tu casa, tu rutina…"
          value={formulario.bio}
          onChange={(e) => cambiar('bio', e.target.value)}
        />
      </section>

      <fieldset className={estilo.seccion}>
        <legend className={estilo.etiqueta}>Servicios que ofreces</legend>
        <div className={estilo.chips}>
          {SERVICIOS.map((servicio) => {
            const activo = formulario.servicios.includes(servicio.valor)
            return (
              <button
                key={servicio.valor}
                type="button"
                aria-pressed={activo}
                className={clases(estilo.chip, activo && estilo.chipActivo)}
                onClick={() => cambiar('servicios', alternar(formulario.servicios, servicio.valor))}
              >
                <span aria-hidden="true">{servicio.icono}</span> {servicio.titulo}
              </button>
            )
          })}
        </div>
        {errores.servicios && (
          <p className={estilo.error} role="alert">
            {errores.servicios}
          </p>
        )}
        {formulario.servicios.length > 0 && (
          <div className={estilo.precios}>
            {SERVICIOS.filter((s) => formulario.servicios.includes(s.valor)).map((servicio) => (
              <CampoTexto
                key={servicio.valor}
                etiqueta={`Precio ${servicio.titulo.toLowerCase()} (CLP ${servicio.unidad})`}
                valor={formulario.precios[servicio.valor]}
                alCambiar={(valor) =>
                  cambiar('precios', { ...formulario.precios, [servicio.valor]: valor.replace(/[^\d.]/g, '') })
                }
                inputMode="numeric"
                placeholder="Ej: 15.000"
                requerido
                error={errores[`precio_${servicio.valor}`]}
              />
            ))}
          </div>
        )}
      </fieldset>

      <section className={estilo.seccion}>
        <h2 className={estilo.etiqueta}>Zona de cobertura</h2>
        <p className={estilo.ayuda}>Toca el mapa o arrastra el pin hasta tu ubicación.</p>
        <MapaCobertura
          radioKm={formulario.radioKm}
          centroInicial={centroInicial}
          destino={null}
          alCambiarUbicacion={alCambiarUbicacion}
        />
        <div className={estilo.dosColumnas}>
          <CampoTexto
            etiqueta="Comuna"
            valor={formulario.comuna}
            alCambiar={(valor) => cambiar('comuna', valor)}
            placeholder="Ej: Ñuñoa, Santiago"
            requerido
            error={errores.comuna}
          />
          <CampoSeleccion
            etiqueta="Radio de cobertura"
            valor={String(formulario.radioKm)}
            alCambiar={(valor) => cambiar('radioKm', Number(valor))}
            opciones={RADIOS_KM.map((km) => ({ valor: String(km), texto: `${km} km` }))}
          />
        </div>
      </section>

      <fieldset className={estilo.seccion}>
        <legend className={estilo.etiqueta}>Días disponibles</legend>
        <div className={estilo.chips}>
          {DIAS_SEMANA.map((letra, indice) => {
            const activo = formulario.dias.includes(indice)
            return (
              <button
                key={NOMBRES_DIAS[indice]}
                type="button"
                aria-pressed={activo}
                aria-label={NOMBRES_DIAS[indice]}
                className={clases(estilo.chipDia, activo && estilo.chipActivo)}
                onClick={() => cambiar('dias', alternar(formulario.dias, indice))}
              >
                {letra}
              </button>
            )
          })}
        </div>
        <div className={estilo.dosColumnas}>
          <CampoTexto
            etiqueta="Desde"
            tipo="time"
            valor={formulario.horaInicio}
            alCambiar={(valor) => cambiar('horaInicio', valor)}
            requerido
          />
          <CampoTexto
            etiqueta="Hasta"
            tipo="time"
            valor={formulario.horaFin}
            alCambiar={(valor) => cambiar('horaFin', valor)}
            requerido
          />
        </div>
        {errores.horario && (
          <p className={estilo.error} role="alert">
            {errores.horario}
          </p>
        )}
      </fieldset>

      <label className={estilo.casilla}>
        <input type="checkbox" checked={formulario.activo} onChange={(e) => cambiar('activo', e.target.checked)} />
        <span>
          <strong>Perfil visible en el buscador</strong>
          <span className={estilo.ayuda}> Desactívalo si quieres tomarte un descanso.</span>
        </span>
      </label>

      {hayErrores && (
        <p className={estilo.error} role="alert">
          Revisa los campos marcados antes de guardar.
        </p>
      )}
      {errorGuardado && (
        <p className={estilo.error} role="alert">
          {errorGuardado}
        </p>
      )}
      {exito && (
        <p className={estilo.exito} role="status">
          ¡Perfil guardado! Volviendo a tu panel…
        </p>
      )}

      <div className={estilo.acciones}>
        <Button type="submit" tamanio="grande" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar perfil'}
        </Button>
        <Button variante="fantasma" enlace="/panel">
          Cancelar
        </Button>
      </div>
    </form>
  )
}

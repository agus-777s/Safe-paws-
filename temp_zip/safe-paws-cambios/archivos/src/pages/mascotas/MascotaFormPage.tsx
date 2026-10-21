import { useCallback, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '@/components/ui/Button'
import CampoTexto from '@/components/ui/CampoTexto'
import EstadoVista from '@/components/ui/EstadoVista'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { useCarga } from '@/hooks/useCarga'
import { subirFoto } from '@/services/supabase/fotos'
import { actualizarMascota, crearMascota, eliminarMascota, obtenerMascota } from '@/services/supabase/mascotas'
import type { Mascota, NuevaMascota } from '@/types/dominio'
import { ICONOS_TIPO_MASCOTA, RAZAS_SUGERIDAS, TIPOS_MASCOTA } from '@/types/perfil'
import type { TipoMascota } from '@/types/perfil'
import { clases } from '@/utils/clases'
import { mensajeError } from '@/utils/errores'
import { leerDecimal, validarMascota } from './logica'
import type { ErroresMascota } from './logica'
import estilo from './MascotaFormPage.module.css'

const MAX_FOTOS = 3

export default function MascotaFormPage() {
  const { id } = useParams<{ id: string }>()
  const { usuario } = useAuth()
  const esEdicion = Boolean(id)

  const cargar = useCallback(async (): Promise<Mascota | null> => (id ? obtenerMascota(id) : null), [id])
  const { datos: mascota, cargando, error, recargar } = useCarga(cargar)

  const noEncontrada = esEdicion && !mascota
  const ajena = Boolean(mascota && usuario && mascota.duenoId !== usuario.id)

  return (
    <div className={clases('contenedor', estilo.pagina)}>
      <h1 className={estilo.titulo}>{esEdicion ? 'Editar mascota' : 'Agregar mascota'}</h1>
      <EstadoVista
        cargando={cargando}
        error={error ?? (ajena ? 'Solo el dueño puede editar esta mascota.' : null)}
        alReintentar={ajena ? undefined : recargar}
        etiquetaCarga="Cargando mascota…"
        vacio={noEncontrada}
        mensajeVacio="No encontramos esta mascota."
        accionVacio={
          <Button variante="secundario" enlace="/mascotas">
            Volver a mis mascotas
          </Button>
        }
      >
        {usuario && <Formulario key={mascota?.id ?? 'nueva'} usuarioId={usuario.id} mascota={mascota} />}
      </EstadoVista>
    </div>
  )
}

interface FormularioProps {
  usuarioId: string
  mascota: Mascota | null
}

function aTexto(valor: number | null): string {
  return valor == null ? '' : String(valor).replace('.', ',')
}

function Formulario({ usuarioId, mascota }: FormularioProps) {
  const navigate = useNavigate()
  const idBase = useId()
  const archivoRef = useRef<HTMLInputElement>(null)

  const [nombre, setNombre] = useState(mascota?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoMascota | ''>(mascota?.tipo ?? '')
  const [raza, setRaza] = useState(mascota?.raza ?? '')
  const [edad, setEdad] = useState(aTexto(mascota?.edadAnos ?? null))
  const [peso, setPeso] = useState(aTexto(mascota?.pesoKg ?? null))
  const [esGrupo, setEsGrupo] = useState(mascota?.esGrupo ?? false)
  const [cantidad, setCantidad] = useState(mascota?.esGrupo ? String(mascota.cantidad) : '')
  const [fotos, setFotos] = useState<string[]>(mascota?.fotos ?? [])
  const [dieta, setDieta] = useState(mascota?.dieta ?? '')
  const [notasSalud, setNotasSalud] = useState(mascota?.notasSalud ?? '')

  const [errores, setErrores] = useState<ErroresMascota>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [errorFotos, setErrorFotos] = useState<string | null>(null)
  const [subiendoFotos, setSubiendoFotos] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  const idDatalist = `${idBase}-razas`
  const ocupado = guardando || subiendoFotos || eliminando

  async function agregarFotos(evento: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(evento.target.files ?? [])
    evento.target.value = ''
    if (archivos.length === 0) return
    const disponibles = MAX_FOTOS - fotos.length
    const imagenes = archivos.filter((a) => a.type.startsWith('image/'))
    if (imagenes.length < archivos.length) setErrorFotos('Solo se aceptan imágenes.')
    else if (imagenes.length > disponibles) setErrorFotos(`Puedes subir hasta ${MAX_FOTOS} fotos.`)
    else setErrorFotos(null)

    setSubiendoFotos(true)
    try {
      for (const archivo of imagenes.slice(0, disponibles)) {
        const url = await subirFoto(usuarioId, 'mascotas', archivo)
        setFotos((previas) => [...previas, url].slice(0, MAX_FOTOS))
      }
    } catch (e) {
      setErrorFotos(mensajeError(e))
    } finally {
      setSubiendoFotos(false)
    }
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nuevosErrores = validarMascota({ nombre, tipo, edad, peso, esGrupo, cantidad })
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0 || !tipo) {
      setErrorGeneral('Revisa los campos marcados.')
      return
    }
    setErrorGeneral(null)
    const datos: NuevaMascota = {
      nombre: nombre.trim(),
      tipo,
      raza: raza.trim(),
      edadAnos: leerDecimal(edad),
      pesoKg: leerDecimal(peso),
      esGrupo,
      cantidad: esGrupo ? Number(cantidad) : 1,
      fotos,
      dieta: dieta.trim(),
      notasSalud: notasSalud.trim(),
    }
    setGuardando(true)
    try {
      const guardada = mascota ? await actualizarMascota(mascota.id, datos) : await crearMascota(usuarioId, datos)
      navigate(`/mascotas/${guardada.id}`)
    } catch (e) {
      setErrorGeneral(mensajeError(e))
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!mascota) return
    setEliminando(true)
    setErrorGeneral(null)
    try {
      await eliminarMascota(mascota.id)
      navigate('/mascotas')
    } catch (e) {
      setErrorGeneral(mensajeError(e))
      setEliminando(false)
    }
  }

  return (
    <form className={estilo.formulario} onSubmit={(e) => void guardar(e)} noValidate>
      <section className={estilo.seccion}>
        <h2 className={estilo.seccionTitulo}>Datos básicos</h2>

        <fieldset className={estilo.grupo}>
          <legend className={estilo.etiqueta}>Tipo de mascota *</legend>
          <div className={estilo.tipos}>
            {TIPOS_MASCOTA.map((opcion) => (
              <button
                key={opcion}
                type="button"
                className={clases(estilo.tipo, tipo === opcion && estilo.tipoActivo)}
                aria-pressed={tipo === opcion}
                onClick={() => setTipo(opcion)}
              >
                <span className={estilo.tipoIcono} aria-hidden="true">
                  {ICONOS_TIPO_MASCOTA[opcion]}
                </span>
                {opcion}
              </button>
            ))}
          </div>
          {errores.tipo && (
            <p className={estilo.error} role="alert">
              {errores.tipo}
            </p>
          )}
        </fieldset>

        <CampoTexto etiqueta={esGrupo ? 'Nombre del grupo *' : 'Nombre *'} valor={nombre} alCambiar={setNombre} requerido error={errores.nombre} maxLength={60} placeholder={esGrupo ? 'Ej: Gallinas del patio' : 'Ej: Toby'} />

        <div className={estilo.campo}>
          <label className={estilo.etiqueta} htmlFor={`${idBase}-raza`}>
            Raza o especie
          </label>
          <input
            id={`${idBase}-raza`}
            className={estilo.entrada}
            value={raza}
            onChange={(e) => setRaza(e.target.value)}
            list={tipo ? idDatalist : undefined}
            maxLength={60}
            placeholder={tipo ? `Ej: ${RAZAS_SUGERIDAS[tipo][0]}` : 'Elige primero el tipo'}
          />
          {tipo && (
            <datalist id={idDatalist}>
              {RAZAS_SUGERIDAS[tipo].map((sugerencia) => (
                <option key={sugerencia} value={sugerencia} />
              ))}
            </datalist>
          )}
        </div>

        <label className={estilo.interruptor}>
          <input type="checkbox" checked={esGrupo} onChange={(e) => setEsGrupo(e.target.checked)} />
          <span>Es un grupo de animales (p. ej. gallinas, peces)</span>
        </label>

        <div className={estilo.fila}>
          {esGrupo ? (
            <CampoTexto etiqueta="Cantidad *" tipo="number" valor={cantidad} alCambiar={setCantidad} error={errores.cantidad} min={2} step={1} inputMode="numeric" />
          ) : (
            <CampoTexto etiqueta="Edad (años)" valor={edad} alCambiar={setEdad} error={errores.edad} inputMode="decimal" placeholder="Ej: 2,5" />
          )}
          <CampoTexto etiqueta="Peso (kg)" valor={peso} alCambiar={setPeso} error={errores.peso} inputMode="decimal" placeholder="Ej: 12,4" />
        </div>
      </section>

      <section className={estilo.seccion}>
        <h2 className={estilo.seccionTitulo}>Fotos</h2>
        <p className={estilo.ayuda}>Hasta {MAX_FOTOS} fotos. La primera será la portada.</p>
        <div className={estilo.fotos}>
          {fotos.map((url, indice) => (
            <div key={url} className={estilo.fotoMini}>
              <img src={url} alt={`Foto ${indice + 1} de ${nombre || 'la mascota'}`} />
              <button
                type="button"
                className={estilo.fotoQuitar}
                aria-label={`Quitar foto ${indice + 1}`}
                onClick={() => setFotos((previas) => previas.filter((f) => f !== url))}
                disabled={ocupado}
              >
                ×
              </button>
            </div>
          ))}
          {fotos.length < MAX_FOTOS && (
            <button type="button" className={estilo.fotoAgregar} onClick={() => archivoRef.current?.click()} disabled={ocupado}>
              {subiendoFotos ? (
                <Spinner />
              ) : (
                <>
                  <span aria-hidden="true">📷</span>
                  Agregar
                </>
              )}
            </button>
          )}
        </div>
        <input ref={archivoRef} type="file" accept="image/*" multiple className={estilo.oculto} onChange={(e) => void agregarFotos(e)} tabIndex={-1} aria-hidden="true" />
        {subiendoFotos && <p className={estilo.ayuda}>Subiendo fotos…</p>}
        {errorFotos && (
          <p className={estilo.error} role="alert">
            {errorFotos}
          </p>
        )}
      </section>

      <section className={estilo.seccion}>
        <h2 className={estilo.seccionTitulo}>Ficha técnica</h2>
        <div className={estilo.campo}>
          <label className={estilo.etiqueta} htmlFor={`${idBase}-dieta`}>
            Dieta
          </label>
          <textarea id={`${idBase}-dieta`} className={estilo.area} rows={3} maxLength={1000} value={dieta} onChange={(e) => setDieta(e.target.value)} placeholder="Marca de alimento, porciones, horarios, alergias alimentarias…" />
        </div>
        <div className={estilo.campo}>
          <label className={estilo.etiqueta} htmlFor={`${idBase}-salud`}>
            Notas de salud
          </label>
          <textarea id={`${idBase}-salud`} className={estilo.area} rows={3} maxLength={1000} value={notasSalud} onChange={(e) => setNotasSalud(e.target.value)} placeholder="Medicamentos, condiciones, veterinario de cabecera…" />
        </div>
      </section>

      {errorGeneral && (
        <p className={estilo.errorGeneral} role="alert">
          {errorGeneral}
        </p>
      )}

      <div className={estilo.acciones}>
        <Button type="submit" tamanio="grande" disabled={ocupado}>
          {guardando ? 'Guardando…' : mascota ? 'Guardar cambios' : 'Agregar mascota'}
        </Button>
        <Button variante="fantasma" enlace={mascota ? `/mascotas/${mascota.id}` : '/mascotas'}>
          Cancelar
        </Button>
      </div>

      {mascota && (
        <section className={estilo.zonaPeligro} aria-label="Eliminar mascota">
          {confirmarEliminar ? (
            <>
              <p>
                ¿Eliminar a <strong>{mascota.nombre}</strong>? Se borrarán también sus recordatorios. Esta acción no se puede deshacer.
              </p>
              <div className={estilo.acciones}>
                <button type="button" className={estilo.botonPeligro} onClick={() => void eliminar()} disabled={ocupado}>
                  {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
                <Button variante="fantasma" onClick={() => setConfirmarEliminar(false)} disabled={eliminando}>
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <button type="button" className={estilo.enlacePeligro} onClick={() => setConfirmarEliminar(true)} disabled={ocupado}>
              Eliminar mascota
            </button>
          )}
        </section>
      )}
    </form>
  )
}

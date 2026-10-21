import { useCallback, useId, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import Button from '@/components/ui/Button'
import CampoSeleccion from '@/components/ui/CampoSeleccion'
import CampoTexto from '@/components/ui/CampoTexto'
import EstadoVista from '@/components/ui/EstadoVista'
import { useAuth } from '@/hooks/useAuth'
import { useCarga } from '@/hooks/useCarga'
import {
  crearRecordatorio,
  eliminarRecordatorio,
  listarRecordatorios,
  marcarRecordatorio,
  obtenerMascota,
} from '@/services/supabase/mascotas'
import { TIPOS_RECORDATORIO } from '@/types/dominio'
import type { Mascota, RecordatorioSalud, TipoRecordatorio } from '@/types/dominio'
import { ICONOS_TIPO_MASCOTA } from '@/types/perfil'
import { clases } from '@/utils/clases'
import { mensajeError } from '@/utils/errores'
import { describirMascota, fechaIsoLocal, formatearEdad, formatearPeso, separarRecordatorios } from './logica'
import type { RecordatorioConEstado } from './logica'
import estilo from './MascotaPage.module.css'

const formatoFecha = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })

function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.split('-').map(Number)
  if (!anio || !mes || !dia) return iso
  return formatoFecha.format(new Date(anio, mes - 1, dia))
}

function tituloTipo(tipo: TipoRecordatorio): string {
  return TIPOS_RECORDATORIO.find((t) => t.valor === tipo)?.titulo ?? tipo
}

export default function MascotaPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { usuario } = useAuth()

  const cargar = useCallback(() => obtenerMascota(id), [id])
  const { datos: mascota, cargando, error, recargar } = useCarga(cargar)
  const esDueno = Boolean(mascota && usuario && mascota.duenoId === usuario.id)

  return (
    <div className={clases('contenedor', estilo.pagina)}>
      <EstadoVista
        cargando={cargando}
        error={error}
        alReintentar={recargar}
        etiquetaCarga="Cargando ficha…"
        vacio={!mascota}
        mensajeVacio="No encontramos esta mascota o no tienes acceso a su ficha."
        accionVacio={
          <Button variante="secundario" enlace="/mascotas">
            Volver a mis mascotas
          </Button>
        }
      >
        {mascota && (
          <>
            <Ficha mascota={mascota} esDueno={esDueno} />
            {esDueno && <Recordatorios mascotaId={mascota.id} />}
          </>
        )}
      </EstadoVista>
    </div>
  )
}

function Ficha({ mascota, esDueno }: { mascota: Mascota; esDueno: boolean }) {
  const [fotoActiva, setFotoActiva] = useState(0)
  const portada = mascota.fotos[fotoActiva] ?? mascota.fotos[0]

  return (
    <article className={estilo.ficha}>
      <div className={estilo.galeria}>
        <div className={estilo.portada}>
          {portada ? (
            <img src={portada} alt={`Foto de ${mascota.nombre}`} />
          ) : (
            <span className={estilo.portadaEmoji} aria-hidden="true">
              {ICONOS_TIPO_MASCOTA[mascota.tipo]}
            </span>
          )}
        </div>
        {mascota.fotos.length > 1 && (
          <div className={estilo.miniaturas} role="group" aria-label="Fotos">
            {mascota.fotos.map((url, indice) => (
              <button
                key={url}
                type="button"
                className={clases(estilo.miniatura, indice === fotoActiva && estilo.miniaturaActiva)}
                onClick={() => setFotoActiva(indice)}
                aria-label={`Ver foto ${indice + 1}`}
                aria-pressed={indice === fotoActiva}
              >
                <img src={url} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={estilo.datos}>
        <div className={estilo.cabecera}>
          <div>
            <p className={estilo.etiquetaFicha}>Ficha técnica</p>
            <h1 className={estilo.nombre}>
              <span aria-hidden="true">{ICONOS_TIPO_MASCOTA[mascota.tipo]} </span>
              {mascota.nombre}
            </h1>
            <p className={estilo.resumen}>{describirMascota(mascota)}</p>
          </div>
          {esDueno && (
            <Button variante="secundario" tamanio="pequeno" enlace={`/mascotas/${mascota.id}/editar`}>
              Editar
            </Button>
          )}
        </div>

        <dl className={estilo.atributos}>
          <div>
            <dt>Tipo</dt>
            <dd>{mascota.tipo}</dd>
          </div>
          <div>
            <dt>Raza</dt>
            <dd>{mascota.raza || '—'}</dd>
          </div>
          {mascota.esGrupo ? (
            <div>
              <dt>Cantidad</dt>
              <dd>{mascota.cantidad}</dd>
            </div>
          ) : (
            <div>
              <dt>Edad</dt>
              <dd>{mascota.edadAnos != null ? formatearEdad(mascota.edadAnos) : '—'}</dd>
            </div>
          )}
          <div>
            <dt>Peso</dt>
            <dd>{mascota.pesoKg != null ? formatearPeso(mascota.pesoKg) : '—'}</dd>
          </div>
        </dl>

        <section className={estilo.bloque}>
          <h2 className={estilo.bloqueTitulo}>🍽️ Dieta</h2>
          <p className={estilo.bloqueTexto}>{mascota.dieta || 'Sin indicaciones de dieta.'}</p>
        </section>
        <section className={estilo.bloque}>
          <h2 className={estilo.bloqueTitulo}>🩺 Notas de salud</h2>
          <p className={estilo.bloqueTexto}>{mascota.notasSalud || 'Sin notas de salud.'}</p>
        </section>
      </div>
    </article>
  )
}

function Recordatorios({ mascotaId }: { mascotaId: string }) {
  const idBase = useId()
  const cargar = useCallback(() => listarRecordatorios(mascotaId), [mascotaId])
  const { datos, cargando, error, recargar, establecer } = useCarga(cargar)

  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<TipoRecordatorio>('vacuna')
  const [fecha, setFecha] = useState(() => fechaIsoLocal())
  const [errorTitulo, setErrorTitulo] = useState<string | undefined>()
  const [errorFecha, setErrorFecha] = useState<string | undefined>()
  const [creando, setCreando] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [enProceso, setEnProceso] = useState<string | null>(null)

  const hoy = fechaIsoLocal()
  const { proximos, completados } = useMemo(() => separarRecordatorios(datos ?? [], hoy), [datos, hoy])

  async function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const tituloLimpio = titulo.trim()
    const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    setErrorTitulo(tituloLimpio ? undefined : 'Escribe un título.')
    setErrorFecha(fechaValida ? undefined : 'Elige una fecha.')
    if (!tituloLimpio || !fechaValida) return
    setCreando(true)
    setErrorAccion(null)
    try {
      const nuevo = await crearRecordatorio({ mascotaId, titulo: tituloLimpio, tipo, fecha })
      establecer((previo) => [...(previo ?? []), nuevo])
      setTitulo('')
    } catch (e) {
      setErrorAccion(mensajeError(e))
    } finally {
      setCreando(false)
    }
  }

  async function alternar(recordatorio: RecordatorioSalud) {
    setEnProceso(recordatorio.id)
    setErrorAccion(null)
    try {
      await marcarRecordatorio(recordatorio.id, !recordatorio.completado)
      establecer((previo) =>
        (previo ?? []).map((r) => (r.id === recordatorio.id ? { ...r, completado: !recordatorio.completado } : r)),
      )
    } catch (e) {
      setErrorAccion(mensajeError(e))
    } finally {
      setEnProceso(null)
    }
  }

  async function quitar(recordatorio: RecordatorioSalud) {
    setEnProceso(recordatorio.id)
    setErrorAccion(null)
    try {
      await eliminarRecordatorio(recordatorio.id)
      establecer((previo) => (previo ?? []).filter((r) => r.id !== recordatorio.id))
    } catch (e) {
      setErrorAccion(mensajeError(e))
    } finally {
      setEnProceso(null)
    }
  }

  function renderizarLista(lista: RecordatorioConEstado[]) {
    return (
      <ul className={estilo.recordatorios}>
        {lista.map((r) => (
          <li key={r.id} className={clases(estilo.recordatorio, r.vencido && estilo.recordatorioVencido, r.completado && estilo.recordatorioHecho)}>
            <input
              id={`${idBase}-${r.id}`}
              type="checkbox"
              className={estilo.casilla}
              checked={r.completado}
              onChange={() => void alternar(r)}
              disabled={enProceso === r.id}
            />
            <label htmlFor={`${idBase}-${r.id}`} className={estilo.recordatorioTexto}>
              <span className={estilo.recordatorioTitulo}>{r.titulo}</span>
              <span className={estilo.recordatorioMeta}>
                {tituloTipo(r.tipo)} · {formatearFecha(r.fecha)}
                {r.vencido && <span className={estilo.insignia}>Vencido</span>}
              </span>
            </label>
            <button
              type="button"
              className={estilo.quitar}
              onClick={() => void quitar(r)}
              disabled={enProceso === r.id}
              aria-label={`Eliminar recordatorio ${r.titulo}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className={estilo.seccionRecordatorios} aria-labelledby={`${idBase}-titulo`}>
      <h2 id={`${idBase}-titulo`} className={estilo.seccionTitulo}>
        Recordatorios de salud
      </h2>

      <form className={estilo.formRecordatorio} onSubmit={(e) => void agregar(e)} noValidate>
        <CampoTexto etiqueta="Título" valor={titulo} alCambiar={setTitulo} error={errorTitulo} maxLength={80} placeholder="Ej: Vacuna antirrábica" />
        <CampoSeleccion
          etiqueta="Tipo"
          valor={tipo}
          alCambiar={(valor) => setTipo(valor as TipoRecordatorio)}
          opciones={TIPOS_RECORDATORIO.map((t) => ({ valor: t.valor, texto: t.titulo }))}
        />
        <div className={estilo.campoFecha}>
          <label className={estilo.etiqueta} htmlFor={`${idBase}-fecha`}>
            Fecha
          </label>
          <input
            id={`${idBase}-fecha`}
            type="date"
            className={clases(estilo.entrada, errorFecha && estilo.entradaError)}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            aria-invalid={errorFecha ? true : undefined}
          />
          {errorFecha && (
            <p className={estilo.error} role="alert">
              {errorFecha}
            </p>
          )}
        </div>
        <Button type="submit" disabled={creando} className={estilo.botonAgregar}>
          {creando ? 'Agregando…' : 'Agregar'}
        </Button>
      </form>

      {errorAccion && (
        <p className={estilo.error} role="alert">
          {errorAccion}
        </p>
      )}

      <EstadoVista
        cargando={cargando}
        error={error}
        alReintentar={recargar}
        etiquetaCarga="Cargando recordatorios…"
        vacio={(datos ?? []).length === 0}
        mensajeVacio="Sin recordatorios. Agrega vacunas, desparasitaciones o controles para no olvidarlos."
      >
        <div className={estilo.listas}>
          <div>
            <h3 className={estilo.subtitulo}>Próximos</h3>
            {proximos.length > 0 ? renderizarLista(proximos) : <p className={estilo.vacioLista}>Todo al día. 🎉</p>}
          </div>
          {completados.length > 0 && (
            <div>
              <h3 className={estilo.subtitulo}>Completados</h3>
              {renderizarLista(completados)}
            </div>
          )}
        </div>
      </EstadoVista>
    </section>
  )
}

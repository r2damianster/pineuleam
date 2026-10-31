"use client"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import EnlaceContribucionModal from '@/components/EnlaceContribucionModal'
import { useForm, useFieldArray } from 'react-hook-form'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'

// Tipos de publicación disponibles
const TIPOS_PUBLICACION = [
  'ARTICULO_REGIONAL',
  'ARTICULO_ALTO_IMPACTO',
  'LIBRO',
  'CAPITULO_LIBRO',
  'MEMORIA_EVENTO',
  'PROPIEDAD_INTELECTUAL',
] as const

type TipoPublicacion = typeof TIPOS_PUBLICACION[number]

const CATEGORIAS_DOCENTE = ['AUXILIAR_I', 'AUXILIAR_II', 'AGREGADO_I', 'AGREGADO_II', 'AGREGADO_III', 'PRINCIPAL_I', 'PRINCIPAL_II'] as const

const LINEA_INVESTIGACION_DEFAULT = 'Educación y Nuevos Escenarios de la Formación Profesional'

// Nombres oficiales de los 4 proyectos del grupo de investigación (confirmados por el
// usuario, Sesión 24 — no son etiquetas cortas, van tal cual en los documentos PAT).
const PROYECTOS = [
  'Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible.',
  'Desarrollo de las habilidades lingüísticas del idioma inglés en estudiantes de educación superior en Ecuador.',
  'Dinámicas Lingüísticas en Contextos Locales',
  'Desarrollo Humano y perfil profesional en la formación de docentes: Mentoría y Aprendizaje Socioemocional',
] as const

const PARTICIPACIONES = ['Autor', 'Coautor', 'Traductor', 'Otro'] as const

const FILIACION_DEFAULT = 'Universidad Laica Eloy Alfaro de Manabí'

// Esquema de validación: campos comunes obligatorios, específicos por tipo opcionales
const schema = yup.object({
  tipoPublicacion: yup.string().oneOf(TIPOS_PUBLICACION).required(),
  titulo: yup.string().required(),
  lineaInvestigacion: yup.string().required(),
  fechaPublicacion: yup.string().required(),
  campoDetallado: yup.string().required(),
  estado: yup.string().oneOf(['PUBLICADO', 'ACEPTADO', 'OTRO'] as const).required(),
  // Artículos (regional / alto impacto)
  tipoArticulo: yup.string().optional(),
  codigoPublicacion: yup.string().optional(),
  proyecto: yup.string().optional(),
  baseDatosIndexada: yup.string().optional(),
  issn: yup.string().optional(),
  nombreRevista: yup.string().optional(),
  cuartil: yup.string().optional(),
  categoria: yup.string().oneOf([...CATEGORIAS_DOCENTE, '']).optional(),
  participacion: yup.string().optional(),
  linkPublicacion: yup.string().optional(),
  linkRevista: yup.string().optional(),
  filiacion: yup.string().optional(),
  filiacionOtro: yup.string().optional(),
  participacionOtro: yup.string().optional(),
  identificacionParticipante: yup.string().optional(),
  // Libros
  isbn: yup.string().optional(),
  revisadoPares: yup.boolean().optional(),
  // Capítulos
  tituloCapitulo: yup.string().optional(),
  editorCompilador: yup.string().optional(),
  paginas: yup.string().optional(),
  totalCapituloLibro: yup.number().integer().optional().nullable(),
  // Memoria de eventos
  nombrePonencia: yup.string().optional(),
  nombreEvento: yup.string().optional(),
  edicionEvento: yup.string().optional(),
  organizadorEvento: yup.string().optional(),
  comiteOrganizador: yup.string().optional(),
  pais: yup.string().optional(),
  ciudad: yup.string().optional(),
  // Propiedad intelectual
  certificadoN: yup.string().optional(),
  solicitudN: yup.string().optional(),
  claseDeObra: yup.string().optional(),
  tituloObra: yup.string().optional(),
  lugar: yup.string().optional(),
  // Común opcional
  intercultural: yup.string().optional(),
  authors: yup
    .array()
    .of(
      yup.object({
        authorName: yup.string().required(),
        order: yup.number().integer().min(1).max(5).required(),
        isCarreraAuthor: yup.boolean().required(),
        esEstudiante: yup.boolean().required(),
      })
    )
    .min(1)
    .required(),
})

type FormValues = yup.InferType<typeof schema>

function ProyectoField({ register }: { register: any }) {
  return (
    <div>
      <label className="block text-sm">Proyecto</label>
      <select {...register('proyecto')} className="mt-1 block w-full border rounded p-2">
        <option value="">Selecciona</option>
        {PROYECTOS.map(p => <option key={p} value={p}>{p}</option>)}
        <option value="No aplica">No aplica</option>
      </select>
    </div>
  )
}

function ParticipacionField({ register, watch }: { register: any; watch: any }) {
  const valor = watch('participacion')
  return (
    <div>
      <label className="block text-sm">Participación</label>
      <select {...register('participacion')} className="mt-1 block w-full border rounded p-2">
        <option value="">Selecciona</option>
        {PARTICIPACIONES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      {valor === 'Otro' && (
        <input
          type="text"
          placeholder="¿Cuál?"
          {...register('participacionOtro')}
          className="mt-2 block w-full border rounded p-2"
        />
      )}
    </div>
  )
}

function FiliacionField({ register, watch }: { register: any; watch: any }) {
  const valor = watch('filiacion')
  return (
    <div>
      <label className="block text-sm">Filiación</label>
      <select {...register('filiacion')} className="mt-1 block w-full border rounded p-2">
        <option value={FILIACION_DEFAULT}>{FILIACION_DEFAULT}</option>
        <option value="Otro">Otro</option>
      </select>
      {valor === 'Otro' && (
        <input
          type="text"
          placeholder="¿Cuál?"
          {...register('filiacionOtro')}
          className="mt-2 block w-full border rounded p-2"
        />
      )}
    </div>
  )
}

export interface ContributionFormInitialData extends Partial<FormValues> {
  id?: string
}

// Fila del docente que generó el enlace, precargada para quien envía por QR (modo 'public').
export interface DocenteAutorPrecargado {
  nombre: string
  orden: number
}

function normalizarNombre(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export default function ContributionForm({
  tipo,
  mode,
  contributionId,
  initialData,
  publicToken,
  docenteAutor,
  docenteNombre,
}: {
  tipo: TipoPublicacion
  mode: 'create' | 'edit' | 'public'
  contributionId?: string
  initialData?: ContributionFormInitialData
  // Solo modo 'public' (enviar-contribucion/[token]):
  publicToken?: string
  docenteAutor?: DocenteAutorPrecargado | null
  docenteNombre?: string
}) {
  const router = useRouter()
  const esPublico = mode === 'public'
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [mostrarModalEnlace, setMostrarModalEnlace] = useState(false)
  const [registradorNombre, setRegistradorNombre] = useState('')
  const [registradorContacto, setRegistradorContacto] = useState('')
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      tipoPublicacion: tipo,
      lineaInvestigacion: initialData?.lineaInvestigacion || LINEA_INVESTIGACION_DEFAULT,
      filiacion: initialData?.filiacion || FILIACION_DEFAULT,
      revisadoPares: initialData?.revisadoPares ?? true,
      authors: initialData?.authors?.length
        ? initialData.authors
        : docenteAutor
          ? [{ authorName: docenteAutor.nombre, order: docenteAutor.orden, isCarreraAuthor: true, esEstudiante: false }]
          : [{ authorName: '', order: 1, isCarreraAuthor: true, esEstudiante: false }],
      ...(initialData || {}),
    },
  })

  const { fields: authorFields, append: appendAuthor, replace: replaceAuthors } = useFieldArray({ control, name: 'authors' })

  const [doiInput, setDoiInput] = useState('')
  const [autocompletando, setAutocompletando] = useState<'doi' | 'pdf' | null>(null)
  const [autocompletarError, setAutocompletarError] = useState<string | null>(null)

  const aplicarDatosExtraidos = (datos: {
    titulo?: string
    fechaPublicacion?: string
    campoDetallado?: string
    estado?: 'PUBLICADO' | 'ACEPTADO' | 'OTRO'
    authors?: { authorName: string; order: number; isCarreraAuthor: boolean; esEstudiante?: boolean }[]
    nombreRevista?: string
    issn?: string
  }) => {
    if (datos.titulo) setValue('titulo', datos.titulo)
    if (datos.fechaPublicacion) setValue('fechaPublicacion', datos.fechaPublicacion)
    if (datos.campoDetallado) setValue('campoDetallado', datos.campoDetallado)
    if (datos.estado) setValue('estado', datos.estado)
    if (datos.nombreRevista) setValue('nombreRevista', datos.nombreRevista)
    if (datos.issn) setValue('issn', datos.issn)
    if (datos.authors && datos.authors.length > 0) {
      const autoresExtraidos = datos.authors.map(a => ({ ...a, esEstudiante: a.esEstudiante ?? false }))
      replaceAuthors(docenteAutor ? combinarConDocente(autoresExtraidos, docenteAutor) : autoresExtraidos)
    }
  }

  // El autocompletar reemplaza la lista de autores: la fila del docente se conserva en su orden
  // y los demás se renumeran alrededor, sin duplicarlo si la fuente ya lo traía.
  const combinarConDocente = (
    extraidos: { authorName: string; order: number; isCarreraAuthor: boolean; esEstudiante: boolean }[],
    docente: DocenteAutorPrecargado
  ) => {
    const nombreDocente = normalizarNombre(docente.nombre)
    const otros = extraidos
      .filter(a => normalizarNombre(a.authorName) !== nombreDocente)
      .sort((a, b) => a.order - b.order)
    const resultado = []
    let siguienteOrden = 1
    for (const autor of otros) {
      if (siguienteOrden === docente.orden) siguienteOrden++
      resultado.push({ ...autor, order: siguienteOrden })
      siguienteOrden++
    }
    resultado.push({ authorName: docente.nombre, order: docente.orden, isCarreraAuthor: true, esEstudiante: false })
    return resultado.sort((a, b) => a.order - b.order).slice(0, 5)
  }

  const buscarPorDoi = async () => {
    if (!doiInput.trim()) return
    setAutocompletando('doi')
    setAutocompletarError(null)
    try {
      const res = await fetch(esPublico ? `/api/enlaces-contribucion/${publicToken}/extract-doi` : '/api/contribuciones/extract-doi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doi: doiInput }),
      })
      const datos = await res.json()
      if (!res.ok) throw new Error(datos.error || 'No se pudo buscar el DOI')
      aplicarDatosExtraidos(datos)
    } catch (e: any) {
      setAutocompletarError(e.message)
    } finally {
      setAutocompletando(null)
    }
  }

  const extraerDePdf = async (archivo: File) => {
    setAutocompletando('pdf')
    setAutocompletarError(null)
    try {
      const form = new FormData()
      form.append('archivo', archivo)
      const res = await fetch(esPublico ? `/api/enlaces-contribucion/${publicToken}/extract-pdf` : '/api/contribuciones/extract-pdf', { method: 'POST', body: form })
      const datos = await res.json()
      if (!res.ok) throw new Error(datos.error || 'No se pudo leer el PDF')
      aplicarDatosExtraidos(datos)
    } catch (e: any) {
      setAutocompletarError(e.message)
    } finally {
      setAutocompletando(null)
    }
  }

  const onSubmit = async (data: FormValues) => {
    try {
      if (esPublico && !registradorNombre.trim()) {
        throw new Error('Escribe tu nombre en "¿Quién envía esta contribución?"')
      }
      const ordenes = data.authors.map(a => a.order)
      if (new Set(ordenes).size !== ordenes.length) {
        throw new Error('Dos autores no pueden tener el mismo número de orden')
      }
      // Cadenas vacías (cuartil, intercultural, etc.) se guardan como ausentes, no como "".
      // En edición se envían tal cual: omitirlos impediría vaciar un campo.
      const payload: any = mode === 'edit'
        ? { ...data }
        : Object.fromEntries(Object.entries(data).filter(([, valor]) => valor !== ''))
      // El input "Título" representa el título del libro en estos dos tipos —
      // se copia a tituloLibro para que quede en el campo correcto de la BD.
      if (tipo === 'LIBRO' || tipo === 'CAPITULO_LIBRO') {
        payload.tituloLibro = data.titulo
      }
      if (payload.filiacion === 'Otro' && payload.filiacionOtro) payload.filiacion = payload.filiacionOtro
      if (payload.participacion === 'Otro' && payload.participacionOtro) payload.participacion = payload.participacionOtro
      delete payload.filiacionOtro
      delete payload.participacionOtro

      if (esPublico) {
        payload.registradorExternoNombre = registradorNombre.trim()
        payload.registradorExternoContacto = registradorContacto.trim()
      }

      const url = esPublico
        ? `/api/enlaces-contribucion/${publicToken}`
        : mode === 'edit' ? `/api/contribuciones/${contributionId}` : '/api/contribuciones'
      const method = mode === 'edit' ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        const mensaje = Array.isArray(err.error) ? err.error.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join('; ') : err.error
        throw new Error(mensaje || 'Error al guardar')
      }
      if (esPublico) {
        setEnviado(true)
        window.scrollTo({ top: 0 })
        return
      }
      router.push(mode === 'edit' ? '/contribuciones?contribucion=editada' : '/portal/dashboard?contribucion=registrada')
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  // El nuevo autor toma el menor número de orden libre (si el docente ya ocupa el 2, no se repite).
  const addAuthor = () => {
    if (authorFields.length >= 6) return
    const ordenesUsados = watch('authors').map(a => Number(a.order))
    let ordenLibre = 1
    while (ordenesUsados.includes(ordenLibre)) ordenLibre++
    appendAuthor({ authorName: '', order: ordenLibre, isCarreraAuthor: true, esEstudiante: false })
  }

  const esArticulo = tipo === 'ARTICULO_REGIONAL' || tipo === 'ARTICULO_ALTO_IMPACTO'
  const tituloLabel = tipo === 'LIBRO' || tipo === 'CAPITULO_LIBRO' ? 'Título del libro *' : 'Título *'

  if (enviado) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-green-700 mb-2">¡Contribución enviada!</h1>
        <p className="text-gray-600">
          {docenteNombre ? `${docenteNombre} la revisará y la aprobará.` : 'Será revisada y aprobada por el docente.'} Ya puedes cerrar esta página.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Quien envía por enlace/QR no tiene cuenta ni portal: sin navegación interna. */}
      {!esPublico && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
          <Link
            href={mode === 'edit' ? '/contribuciones' : '/contribuciones/new'}
            className="text-sm text-blue-600 hover:underline"
          >
            {mode === 'edit' ? 'Volver al listado' : 'Cambiar tipo de contribución'}
          </Link>
        </div>
      )}
      {mode === 'create' && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="mb-2 text-sm text-blue-900">
            ¿Prefieres que otra persona registre esta contribución? Genera un enlace/QR; lo que envíe queda pendiente hasta que lo apruebes.
          </p>
          <button
            type="button"
            onClick={() => setMostrarModalEnlace(true)}
            className="px-3 py-2 bg-uleam-blue text-white rounded font-semibold hover:bg-uleam-blue/90"
          >
            🔗 Recibir contribución por enlace/QR
          </button>
        </div>
      )}
      {mostrarModalEnlace && <EnlaceContribucionModal onClose={() => setMostrarModalEnlace(false)} />}
      <h1 className="text-2xl font-bold mb-4">
        {mode === 'edit' ? 'Editar contribución' : esPublico ? 'Enviar contribución académica' : 'Nuevo registro de contribución'}
      </h1>

      {esPublico && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6 space-y-3">
          <p className="text-sm text-blue-900">
            {docenteNombre ? `${docenteNombre} te invitó a registrar esta contribución.` : 'Fuiste invitado a registrar esta contribución.'}{' '}
            Quedará pendiente hasta que el docente la revise y la apruebe.
          </p>
          <div>
            <label className="block text-sm font-medium">¿Quién envía esta contribución? *</label>
            <input
              type="text"
              value={registradorNombre}
              onChange={e => setRegistradorNombre(e.target.value)}
              placeholder="Tu nombre completo"
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Contacto (correo o teléfono, opcional)</label>
            <input
              type="text"
              value={registradorContacto}
              onChange={e => setRegistradorContacto(e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
        </div>
      )}

      {mode !== 'edit' && (
        <div className="bg-gray-50 border rounded p-4 mb-6 space-y-3">
          <h2 className="font-medium text-gray-800">Autocompletar (opcional)</h2>
          <p className="text-sm text-gray-500">
            Busca por DOI o sube el PDF del artículo — la IA precarga los campos comunes. Todos los autores
            quedan marcados como "Carrera" por defecto (desmarca los que sean externos), y puedes indicar
            cuáles son estudiantes. Los campos específicos de este tipo se completan a mano. Revisa todo
            antes de guardar.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="DOI o URL (ej: 10.1234/abcd.5678)"
              value={doiInput}
              onChange={e => setDoiInput(e.target.value)}
              className="flex-1 border rounded p-2"
            />
            <button
              type="button"
              onClick={buscarPorDoi}
              disabled={autocompletando !== null || !doiInput.trim()}
              className="px-3 py-2 bg-gray-700 text-white rounded disabled:opacity-50 whitespace-nowrap"
            >
              {autocompletando === 'doi' ? 'Buscando…' : 'Buscar por DOI'}
            </button>
          </div>
          <div>
            <label className="text-sm text-gray-600">o sube el PDF del artículo:</label>
            <input
              type="file"
              accept="application/pdf"
              disabled={autocompletando !== null}
              onChange={e => {
                const archivo = e.target.files?.[0]
                if (archivo) extraerDePdf(archivo)
                e.target.value = ''
              }}
              className="block mt-1 w-full max-w-full text-sm"
            />
            {autocompletando === 'pdf' && <p className="text-sm text-gray-500 mt-1">Leyendo PDF…</p>}
          </div>
          {autocompletarError && <p className="text-red-600 text-sm">{autocompletarError}</p>}
        </div>
      )}

      {errorMsg && <div className="bg-red-100 text-red-800 p-2 mb-4">{errorMsg}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Tipo de publicación (solo lectura) */}
        <div>
          <label className="block font-medium">Tipo de publicación</label>
          <input
            type="text"
            readOnly
            {...register('tipoPublicacion')}
            className="mt-1 block w-full border rounded p-2 bg-gray-100"
          />
        </div>
        {/* Campos comunes */}
        <div>
          <label className="block font-medium">{tituloLabel}</label>
          <input type="text" {...register('titulo')} className="mt-1 block w-full border rounded p-2" />
          {errors.titulo && <p className="text-red-600">{errors.titulo.message}</p>}
        </div>

        {tipo === 'CAPITULO_LIBRO' && (
          <div>
            <label className="block font-medium">Título del capítulo</label>
            <input type="text" {...register('tituloCapitulo')} className="mt-1 block w-full border rounded p-2" />
          </div>
        )}

        <div>
          <label className="block font-medium">Línea de investigación *</label>
          <select {...register('lineaInvestigacion')} className="mt-1 block w-full border rounded p-2">
            <option value="Educación y Nuevos Escenarios de la Formación Profesional">Educación y Nuevos Escenarios de la Formación Profesional</option>
            <option value="Cultura Física y Desarrollo Humano">Cultura Física y Desarrollo Humano</option>
            <option value="Economía y Administración para el Desarrollo Sostenible">Economía y Administración para el Desarrollo Sostenible</option>
            <option value="Ciencias Sociales y Bienestar Humano">Ciencias Sociales y Bienestar Humano</option>
            <option value="Biología, Ecología y Conservación de los Recursos Naturales">Biología, Ecología y Conservación de los Recursos Naturales</option>
            <option value="Tecnología de la Información y las Comunicaciones">Tecnología de la Información y las Comunicaciones</option>
            <option value="Ingeniería, Industria, Construcción, Urbanismo y Arquitectura para un Desarrollo Sustentable y Sostenible">Ingeniería, Industria, Construcción, Urbanismo y Arquitectura para un Desarrollo Sustentable y Sostenible</option>
            <option value="Desarrollo e Innovación en el Sector Agropecuario, Agroindustrial, Pesquero Y Acuícola">Desarrollo e Innovación en el Sector Agropecuario, Agroindustrial, Pesquero Y Acuícola</option>
            <option value="Arte, Cultura y Patrimonio">Arte, Cultura y Patrimonio</option>
            <option value="Salud y Calidad de Vida">Salud y Calidad de Vida</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div>
          <label className="block font-medium">Fecha de publicación *</label>
          <input type="date" {...register('fechaPublicacion')} className="mt-1 block w-full border rounded p-2" />
        </div>
        <div>
          <label className="block font-medium">Campo detallado *</label>
          <textarea {...register('campoDetallado')} className="mt-1 block w-full border rounded p-2" rows={3} />
        </div>
        <div>
          <label className="block font-medium">Estado *</label>
          <select {...register('estado')} className="mt-1 block w-full border rounded p-2">
            <option value="PUBLICADO">Publicado</option>
            <option value="ACEPTADO">Aceptado</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>

        {/* Campos específicos por tipo */}
        {esArticulo && (
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-medium text-gray-700">Datos específicos del artículo</h3>
            <div>
              <label className="block text-sm">Tipo de artículo (no es el título)</label>
              <input type="text" list="tipos-articulo" placeholder="Revista o Investigación" {...register('tipoArticulo')} className="mt-1 block w-full border rounded p-2" />
              <datalist id="tipos-articulo">
                <option value="Revista" />
                <option value="Investigación" />
              </datalist>
            </div>
            <div>
              <label className="block text-sm">Código de publicación (DOI)</label>
              <input type="text" placeholder="https://doi.org/…" {...register('codigoPublicacion')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <ProyectoField register={register} />
            <div>
              <label className="block text-sm">Base de datos indexada</label>
              <input type="text" {...register('baseDatosIndexada')} placeholder="ErihPlus, Scopus, Latindex, Dialnet…" className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Nombre de la revista</label>
              <input type="text" {...register('nombreRevista')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Código ISSN</label>
              <input type="text" {...register('issn')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Cuartil</label>
              <input type="text" {...register('cuartil')} placeholder="Q1, Q2…" className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Categoría docente</label>
              <select {...register('categoria')} className="mt-1 block w-full border rounded p-2">
                <option value="">Selecciona</option>
                {CATEGORIAS_DOCENTE.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <ParticipacionField register={register} watch={watch} />
            <div>
              <label className="block text-sm">Link de la publicación</label>
              <input type="text" {...register('linkPublicacion')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Link de la revista</label>
              <input type="text" {...register('linkRevista')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <FiliacionField register={register} watch={watch} />
            <div>
              <label className="block text-sm">Identificación del participante</label>
              <input type="text" {...register('identificacionParticipante')} className="mt-1 block w-full border rounded p-2" />
            </div>
          </div>
        )}

        {tipo === 'LIBRO' && (
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-medium text-gray-700">Datos específicos del libro</h3>
            <div>
              <label className="block text-sm">Código de publicación</label>
              <input type="text" {...register('codigoPublicacion')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <ProyectoField register={register} />
            <div>
              <label className="block text-sm">Código ISBN</label>
              <input type="text" {...register('isbn')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <label className="flex items-center">
              <input type="checkbox" {...register('revisadoPares')} className="mr-1" />
              Revisado por pares
            </label>
            <FiliacionField register={register} watch={watch} />
            <div>
              <label className="block text-sm">Identificación del participante</label>
              <input type="text" {...register('identificacionParticipante')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <ParticipacionField register={register} watch={watch} />
          </div>
        )}

        {tipo === 'CAPITULO_LIBRO' && (
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-medium text-gray-700">Datos específicos del capítulo</h3>
            <div>
              <label className="block text-sm">Código de publicación</label>
              <input type="text" {...register('codigoPublicacion')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <ProyectoField register={register} />
            <div>
              <label className="block text-sm">Código ISBN</label>
              <input type="text" {...register('isbn')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Editor / compilador</label>
              <input type="text" {...register('editorCompilador')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Páginas</label>
              <input type="text" {...register('paginas')} placeholder="ej: 45-60" className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Total de capítulos del libro</label>
              <input type="number" {...register('totalCapituloLibro', { valueAsNumber: true })} className="mt-1 block w-full border rounded p-2" />
            </div>
            <FiliacionField register={register} watch={watch} />
            <div>
              <label className="block text-sm">Identificación del participante</label>
              <input type="text" {...register('identificacionParticipante')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <ParticipacionField register={register} watch={watch} />
          </div>
        )}

        {tipo === 'MEMORIA_EVENTO' && (
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-medium text-gray-700">Datos específicos de la memoria de evento</h3>
            <div>
              <label className="block text-sm">Tipo de artículo</label>
              <input type="text" {...register('tipoArticulo')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Código de publicación</label>
              <input type="text" {...register('codigoPublicacion')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Nombre de la ponencia</label>
              <input type="text" {...register('nombrePonencia')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Nombre del evento</label>
              <input type="text" {...register('nombreEvento')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Edición del evento</label>
              <input type="text" {...register('edicionEvento')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Organizador del evento</label>
              <input type="text" {...register('organizadorEvento')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Comité organizador</label>
              <input type="text" {...register('comiteOrganizador')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">País</label>
              <input type="text" {...register('pais')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Ciudad</label>
              <input type="text" {...register('ciudad')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Identificación del participante</label>
              <input type="text" {...register('identificacionParticipante')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <ParticipacionField register={register} watch={watch} />
          </div>
        )}

        {tipo === 'PROPIEDAD_INTELECTUAL' && (
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-medium text-gray-700">Datos específicos de propiedad intelectual</h3>
            <div>
              <label className="block text-sm">N° de certificado</label>
              <input type="text" {...register('certificadoN')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">N° de solicitud</label>
              <input type="text" {...register('solicitudN')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Clase de obra</label>
              <input type="text" {...register('claseDeObra')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Título de la obra</label>
              <input type="text" {...register('tituloObra')} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Lugar</label>
              <input type="text" {...register('lugar')} className="mt-1 block w-full border rounded p-2" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm">Intercultural (opcional)</label>
          <input type="text" {...register('intercultural')} className="mt-1 block w-full border rounded p-2" />
        </div>

        {/* Autores */}
        <div>
          <label className="block font-medium mb-2">Autores (máx 5)</label>
          {authorFields.map((author, index) => {
            const esDeCarrera = watch(`authors.${index}.isCarreraAuthor`)
            return (
              <div key={author.id} className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4 sm:mb-2">
                <input
                  type="text"
                  placeholder="Nombre"
                  {...register(`authors.${index}.authorName` as const)}
                  className="col-span-2 border rounded p-1"
                />
                <input
                  type="number"
                  placeholder="#"
                  min={1}
                  max={6}
                  {...register(`authors.${index}.order` as const, { valueAsNumber: true })}
                  className="border rounded p-1"
                />
                <label className="flex items-center">
                  <input type="checkbox" {...register(`authors.${index}.isCarreraAuthor` as const)} className="mr-1" />
                  Carrera
                </label>
                <label className={`flex items-center ${esDeCarrera ? '' : 'text-gray-300'}`}>
                  <input
                    type="checkbox"
                    disabled={!esDeCarrera}
                    {...register(`authors.${index}.esEstudiante` as const)}
                    className="mr-1"
                  />
                  Estudiante
                </label>
              </div>
            )
          })}
          {errors.authors && <p className="text-red-600">{(errors.authors as any).message}</p>}
          {authorFields.length < 6 && (
            <button type="button" onClick={addAuthor} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded">
              Añadir autor
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {isSubmitting ? 'Guardando…' : (mode === 'edit' ? 'Guardar cambios' : 'Guardar')}
        </button>
      </form>
    </div>
  )
}

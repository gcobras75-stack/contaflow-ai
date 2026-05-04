'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useState, useRef, useCallback } from 'react'
import { ArrowLeft, Package, AlertCircle, ImagePlus, X, Upload } from 'lucide-react'
import { createProductAction } from '@/app/actions/products'
import { cn } from '@/utils'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 btn-gradient px-4 py-2.5 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Enviando…
        </span>
      ) : (
        'Enviar para revisión'
      )}
    </button>
  )
}

// ─── Zona drag & drop de imágenes ─────────────────────────────────────────────

const MAX_IMAGES = 5
const MAX_MB     = 5

function ImageDropZone({
  images,
  onChange,
}: {
  images: { preview: string; dataUrl: string; name: string }[]
  onChange: (imgs: { preview: string; dataUrl: string; name: string }[]) => void
}) {
  const inputRef   = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const processFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, MAX_IMAGES - images.length)
    arr.forEach((file) => {
      if (!file.type.startsWith('image/')) return
      if (file.size > MAX_MB * 1024 * 1024) {
        alert(`${file.name} supera ${MAX_MB}MB. Usa una imagen más pequeña.`)
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        onChange([...images, { preview: dataUrl, dataUrl, name: file.name }])
      }
      reader.readAsDataURL(file)
    })
  }, [images, onChange])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      {/* Grid de previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-brand-border group">
              <img
                src={img.preview}
                alt={img.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-red"
              >
                <X size={10} className="text-white" />
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-brand-primary text-white px-1.5 py-0.5 rounded-full">
                  PRINCIPAL
                </span>
              )}
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-brand-border flex items-center justify-center hover:border-brand-primary/50 transition-colors text-brand-faint hover:text-brand-muted"
            >
              <ImagePlus size={18} />
            </button>
          )}
        </div>
      )}

      {/* Drop zone (solo si no hay imágenes aún) */}
      {images.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all',
            dragging
              ? 'border-brand-primary bg-brand-primary/8'
              : 'border-brand-border hover:border-brand-primary/40 hover:bg-brand-hover/50',
          )}
        >
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center transition-all', dragging ? 'btn-gradient' : 'bg-brand-hover')}>
            <Upload size={22} className={dragging ? 'text-white' : 'text-brand-faint'} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-brand-text">
              {dragging ? 'Suelta aquí para agregar' : 'Arrastra tu foto aquí o haz clic'}
            </p>
            <p className="text-xs text-brand-faint mt-1">
              JPG, PNG o WebP · máx {MAX_MB}MB · hasta {MAX_IMAGES} imágenes
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && processFiles(e.target.files)}
      />

      {/* URL alternativa */}
      <div>
        <p className="text-[10px] text-brand-faint mb-2">
          ¿Tienes el link de tu producto en MercadoLibre? Pega la URL de la imagen aquí:
        </p>
        <input
          name="image_url"
          type="url"
          placeholder="https://…"
          className="w-full bg-brand-hover border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(0,102,255,0.12)] transition-all"
        />
      </div>

      {/* Input oculto con las imágenes como JSON */}
      <input type="hidden" name="images_json" value={JSON.stringify(images.map((i) => i.dataUrl))} />
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function NewProductPage() {
  const router = useRouter()
  const [state, formAction] = useFormState(createProductAction, undefined)
  const [images, setImages] = useState<{ preview: string; dataUrl: string; name: string }[]>([])

  return (
    <div className="max-w-lg">
      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-brand-hover transition-colors text-brand-faint hover:text-brand-text"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <Package size={18} className="text-brand-primary" />
            Nuevo producto
          </h1>
          <p className="text-sm text-brand-muted mt-0.5">
            Se calculará el ProductScore automáticamente con IA.
          </p>
        </div>
      </div>

      {/* Error */}
      {state?.error && (
        <div className="flex items-center gap-2 bg-brand-red/10 border border-brand-red/30 rounded-xl px-4 py-3 mb-4 text-sm text-brand-red animate-scale-in">
          <AlertCircle size={15} className="shrink-0" />
          {state.error}
        </div>
      )}

      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '60ms' }}>
        <form action={formAction} className="space-y-5">

          {/* Imágenes */}
          <div>
            <label className="text-xs font-semibold text-brand-muted mb-2 block">
              Fotos del producto
            </label>
            <ImageDropZone images={images} onChange={setImages} />
          </div>

          {/* Nombre */}
          <div>
            <label className="text-xs font-semibold text-brand-muted mb-1.5 block" htmlFor="name">
              Nombre del producto *
            </label>
            <input
              id="name" name="name" type="text"
              placeholder="Ej: Audífonos Bluetooth Pro Max"
              required
              className="w-full bg-brand-hover border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(0,102,255,0.12)] transition-all"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-semibold text-brand-muted mb-1.5 block" htmlFor="description">
              Descripción
            </label>
            <textarea
              id="description" name="description"
              placeholder="Describe tu producto…"
              rows={3}
              className="w-full bg-brand-hover border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary resize-none transition-all"
            />
          </div>

          {/* Precio */}
          <div>
            <label className="text-xs font-semibold text-brand-muted mb-1.5 block" htmlFor="price">
              Precio (MXN) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-brand-faint">$</span>
              <input
                id="price" name="price" type="number"
                min="1" max="999999" step="0.01"
                placeholder="0.00"
                required
                className="w-full bg-brand-hover border border-brand-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(0,102,255,0.12)] transition-all"
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="text-xs font-semibold text-brand-muted mb-1.5 block" htmlFor="category">
              Categoría
            </label>
            <input
              id="category" name="category" type="text"
              placeholder="Ej: Electrónica, Moda, Hogar…"
              className="w-full bg-brand-hover border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary transition-all"
            />
          </div>

          {/* Info IA */}
          <div className="bg-brand-primary/8 border border-brand-primary/20 rounded-xl px-4 py-3">
            <p className="text-xs text-brand-primary font-semibold mb-0.5">ProductScore con IA</p>
            <p className="text-xs text-brand-muted">
              Claude analizará tu producto automáticamente y asignará un score de 0-100
              que determina si es aprobado para campañas.
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2.5 bg-brand-hover hover:bg-brand-border text-brand-text rounded-xl text-sm transition-colors"
            >
              Cancelar
            </button>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  )
}

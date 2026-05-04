'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Package, AlertCircle } from 'lucide-react'
import { createProductAction } from '@/app/actions/products'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 px-4 py-2.5 bg-brand-primary hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
    >
      {pending ? 'Enviando…' : 'Enviar para revisión'}
    </button>
  )
}

export default function NewProductPage() {
  const router = useRouter()
  const [state, formAction] = useFormState(createProductAction, undefined)

  return (
    <div className="max-w-lg">
      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-brand-border transition-colors text-brand-muted hover:text-white"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Package size={20} className="text-brand-primary" />
            Nuevo producto
          </h1>
          <p className="text-sm text-brand-muted mt-0.5">
            Se calculará el ProductScore automáticamente con IA.
          </p>
        </div>
      </div>

      {/* Error */}
      {state?.error && (
        <div className="flex items-center gap-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl px-4 py-3 mb-4 text-sm text-[#FF3B30]">
          <AlertCircle size={15} className="shrink-0" />
          {state.error}
        </div>
      )}

      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <form action={formAction} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="name">
              Nombre del producto *
            </label>
            <input
              id="name" name="name" type="text"
              placeholder="Ej: Audífonos Bluetooth Pro Max"
              required
              className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="description">
              Descripción
            </label>
            <textarea
              id="description" name="description"
              placeholder="Describe tu producto…"
              rows={3}
              className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary resize-none transition-colors"
            />
          </div>

          {/* Precio */}
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="price">
              Precio (MXN) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-brand-muted">$</span>
              <input
                id="price" name="price" type="number"
                min="1" max="999999" step="0.01"
                placeholder="0.00"
                required
                className="w-full bg-brand-border border border-brand-border rounded-lg pl-7 pr-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="category">
              Categoría
            </label>
            <input
              id="category" name="category" type="text"
              placeholder="Ej: Electrónica, Moda, Hogar…"
              className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* URLs de imágenes */}
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="image_url">
              URL de imagen principal
            </label>
            <input
              id="image_url" name="image_url" type="url"
              placeholder="https://…"
              className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
            />
            <p className="text-[10px] text-brand-muted mt-1">Opcional. Se puede agregar desde el detalle del producto.</p>
          </div>

          {/* Info IA */}
          <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl px-4 py-3">
            <p className="text-xs text-brand-primary font-medium mb-0.5">ProductScore con IA</p>
            <p className="text-xs text-brand-muted">
              Claude analizará tu producto automáticamente (nombre, categoría, precio)
              y asignará un score de 0-100 que determina si es aprobado.
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2.5 bg-brand-border hover:bg-brand-border/80 text-white rounded-lg text-sm transition-colors"
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

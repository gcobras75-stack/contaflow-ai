'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { TrendingUp, AlertCircle, Check } from 'lucide-react'
import { registerAction } from '@/app/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-brand-primary hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
    >
      {pending ? 'Creando cuenta…' : 'Registrarme gratis ahora →'}
    </button>
  )
}

const BENEFITS = [
  'Registro 100% gratis — sin tarjeta de crédito',
  'Productos y campañas ilimitadas',
  'Solo 25% de comisión cuando hay ventas',
  'Si no vendemos → no pagas nada',
]

export default function RegisterPage() {
  const [state, formAction] = useFormState(registerAction, undefined)

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">TrendPilot</h1>
            <p className="text-xs text-brand-muted">Marketing automatizado con IA</p>
          </div>
        </div>

        {/* Propuesta de valor */}
        <div className="mb-4 p-4 bg-brand-primary/10 border border-brand-primary/25 rounded-2xl">
          <p className="text-sm font-semibold text-white mb-3 text-center">
            Bienvenido al modelo TrendPilot 🚀
          </p>
          <div className="space-y-1.5">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-2">
                <Check size={13} className="text-brand-green shrink-0" />
                <span className="text-xs text-brand-text">{b}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Crear cuenta gratis</h2>
            <p className="text-xs text-brand-muted mt-1">Sin tarjeta de crédito. Sin compromisos.</p>
          </div>

          {/* Error */}
          {state?.error && (
            <div className="flex items-center gap-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg px-3 py-2.5">
              <AlertCircle size={15} className="text-[#FF3B30] shrink-0" />
              <p className="text-sm text-[#FF3B30]">{state.error}</p>
            </div>
          )}

          <form action={formAction} className="space-y-3">
            {/* Nombre */}
            <div>
              <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="name">
                Nombre completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Juan García"
                required
                className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                autoComplete="email"
                required
                className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
                className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="whatsapp">
                WhatsApp (con código de país)
              </label>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                placeholder="+52 55 1234 5678"
                required
                className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>

            {/* Tipo de producto */}
            <div>
              <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="product_type">
                ¿Qué tipo de producto vendes?
              </label>
              <input
                id="product_type"
                name="product_type"
                type="text"
                placeholder="Ej: Electrónica, Ropa, Cosméticos"
                required
                className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>

            <SubmitButton />
          </form>

          <p className="text-center text-xs text-brand-muted">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-brand-primary hover:underline">
              Inicia sesión
            </a>
          </p>
        </div>

        {/* Garantía */}
        <p className="text-center text-xs text-brand-faint mt-4">
          Sin letra chica. Sin sorpresas. Solo resultados.
        </p>
      </div>
    </div>
  )
}

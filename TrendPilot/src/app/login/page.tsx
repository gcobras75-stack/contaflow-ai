'use client'

import { Suspense } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import { TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { loginAction } from '@/app/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-brand-primary hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
    >
      {pending ? 'Entrando…' : 'Entrar'}
    </button>
  )
}

// useSearchParams requiere Suspense boundary — se aísla aquí
function RegisteredBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('registered') !== 'true') return null
  return (
    <div className="flex items-center gap-2 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl px-4 py-3 mb-4">
      <CheckCircle2 size={16} className="text-[#00FF88] shrink-0" />
      <p className="text-sm text-[#00FF88]">Cuenta creada. Ya puedes iniciar sesión.</p>
    </div>
  )
}

function LoginForm() {
  const [state, formAction] = useFormState(loginAction, undefined)

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
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

        {/* Banner de registro exitoso */}
        <Suspense>
          <RegisteredBanner />
        </Suspense>

        {/* Formulario */}
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Iniciar sesión</h2>

          {/* Error */}
          {state?.error && (
            <div className="flex items-center gap-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg px-3 py-2.5">
              <AlertCircle size={15} className="text-[#FF3B30] shrink-0" />
              <p className="text-sm text-[#FF3B30]">{state.error}</p>
            </div>
          )}

          <form action={formAction} className="space-y-3">
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
            <div>
              <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>
            <SubmitButton />
          </form>

          <p className="text-center text-xs text-brand-muted">
            ¿No tienes cuenta?{' '}
            <a href="/register" className="text-brand-primary hover:underline">
              Regístrate
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

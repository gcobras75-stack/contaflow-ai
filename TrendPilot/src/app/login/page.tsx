'use client'

import { Suspense, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import { TrendingUp, AlertCircle, CheckCircle2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { loginAction } from '@/app/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full btn-gradient text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Entrando…
        </span>
      ) : (
        'Entrar a TrendPilot →'
      )}
    </button>
  )
}

function RegisteredBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('registered') !== 'true') return null
  return (
    <div className="flex items-center gap-2.5 bg-brand-green/10 border border-brand-green/30 rounded-xl px-4 py-3 mb-5 animate-slide-up">
      <CheckCircle2 size={15} className="text-brand-green shrink-0" />
      <p className="text-sm text-brand-green font-medium">Cuenta creada. Ya puedes iniciar sesión.</p>
    </div>
  )
}

function PasswordInput({ id, name }: { id: string; name: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-faint">
        <Lock size={14} />
      </div>
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="current-password"
        required
        className="w-full bg-brand-hover border border-brand-border rounded-xl pl-10 pr-11 py-3 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(0,102,255,0.12)] transition-all"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-faint hover:text-brand-muted transition-colors"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function LoginForm() {
  const [state, formAction] = useFormState(loginAction, undefined)

  return (
    <div className="min-h-screen bg-brand-bg dot-grid flex items-center justify-center p-4">
      {/* Glow de fondo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[440px] relative animate-slide-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl btn-gradient flex items-center justify-center shadow-glow-blue">
            <TrendingUp size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text tracking-tight">TrendPilot</h1>
            <p className="text-xs text-brand-muted mt-0.5">El piloto inteligente de tus ventas</p>
          </div>
        </div>

        {/* Banner registro exitoso */}
        <Suspense>
          <RegisteredBanner />
        </Suspense>

        {/* Card */}
        <div
          className="bg-brand-card border border-brand-border rounded-3xl p-8"
          style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
        >
          <h2 className="text-xl font-bold text-brand-text mb-1">Iniciar sesión</h2>
          <p className="text-sm text-brand-muted mb-6">Accede a tu panel de control</p>

          {/* Error */}
          {state?.error && (
            <div className="flex items-center gap-2.5 bg-brand-red/10 border border-brand-red/30 rounded-xl px-4 py-3 mb-5 animate-scale-in">
              <AlertCircle size={14} className="text-brand-red shrink-0" />
              <p className="text-sm text-brand-red">{state.error}</p>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-medium text-brand-muted mb-2 block" htmlFor="email">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-faint">
                  <Mail size={14} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  required
                  className="w-full bg-brand-hover border border-brand-border rounded-xl pl-10 pr-4 py-3 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(0,102,255,0.12)] transition-all"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-brand-muted" htmlFor="password">
                  Contraseña
                </label>
                <a href="#" className="text-[11px] text-brand-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <PasswordInput id="password" name="password" />
            </div>

            <div className="pt-2">
              <SubmitButton />
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-brand-border text-center">
            <p className="text-xs text-brand-muted">
              ¿Eres vendedor?{' '}
              <a href="/register" className="text-brand-primary hover:underline font-medium">
                Regístrate aquí →
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-brand-faint mt-6">
          © 2025 TrendPilot · Marketing automatizado con IA
        </p>
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

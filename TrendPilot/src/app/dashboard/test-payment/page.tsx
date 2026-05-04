'use client'

import { useState } from 'react'
import { CreditCard, CheckCircle2, AlertCircle, Loader2, ExternalLink, Webhook, ShieldCheck } from 'lucide-react'

interface TestResult {
  success: boolean
  preference_id?: string
  sandbox_url?: string
  error?: string
}

export default function TestPaymentPage() {
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<TestResult | null>(null)

  async function handleCreateTest() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/test-payment', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setResult({ success: false, error: json.error ?? 'Error desconocido' })
      } else {
        setResult({
          success:       true,
          preference_id: json.preference_id,
          sandbox_url:   json.sandbox_url,
        })
      }
    } catch (err) {
      setResult({ success: false, error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
            <CreditCard size={15} className="text-brand-primary" />
          </div>
          Pago de prueba
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Solo visible para administradores · Credenciales sandbox de Mercado Pago
        </p>
      </div>

      {/* Info */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-brand-text">¿Qué hace esta prueba?</h2>

        <div className="space-y-3">
          {[
            { icon: CreditCard,  title: 'Crea preferencia de pago',    desc: 'Genera un link de $10 MXN en el sandbox de Mercado Pago' },
            { icon: ExternalLink,icon2: null, title: 'Abre el checkout MP',        desc: 'Puedes completar el pago con tarjeta de prueba' },
            { icon: Webhook,     title: 'Dispara el webhook',          desc: 'MP notifica a /api/webhook-mp cuando el pago se aprueba' },
            { icon: ShieldCheck, title: 'Verifica la firma HMAC',      desc: 'El webhook valida la firma criptográfica y registra la comisión' },
          ].map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-brand-hover flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={13} className="text-brand-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-text">{step.title}</p>
                  <p className="text-xs text-brand-muted">{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-brand-yellow/8 border border-brand-yellow/20 rounded-xl px-4 py-3">
          <p className="text-xs text-brand-yellow font-semibold mb-0.5">Tarjeta de prueba</p>
          <p className="text-xs text-brand-muted font-mono">
            Número: 4509 9535 6623 3704 · CVV: 123 · Vencimiento: 11/25
          </p>
        </div>
      </div>

      {/* Botón */}
      <button
        onClick={handleCreateTest}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-4 btn-gradient text-white rounded-2xl text-sm font-bold disabled:opacity-60 transition-all active:scale-[0.98]"
      >
        {loading
          ? <><Loader2 size={16} className="animate-spin" /> Generando preferencia…</>
          : <><CreditCard size={16} /> Hacer pago de prueba $10 MXN</>}
      </button>

      {/* Resultado */}
      {result && (
        <div className={`rounded-2xl border p-5 space-y-3 ${
          result.success
            ? 'bg-brand-green/8 border-brand-green/30'
            : 'bg-brand-red/8 border-brand-red/30'
        }`}>
          <div className="flex items-center gap-2">
            {result.success
              ? <CheckCircle2 size={18} className="text-brand-green" />
              : <AlertCircle  size={18} className="text-brand-red" />}
            <p className={`text-sm font-semibold ${result.success ? 'text-brand-green' : 'text-brand-red'}`}>
              {result.success ? '¡Preferencia creada!' : 'Error al crear preferencia'}
            </p>
          </div>

          {result.success && (
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-brand-muted w-32">Preference ID:</span>
                <code className="text-brand-text font-mono bg-brand-hover px-2 py-0.5 rounded text-[10px] truncate max-w-[200px]">
                  {result.preference_id}
                </code>
              </div>
              <a
                href={result.sandbox_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full py-3 bg-brand-green/10 text-brand-green border border-brand-green/30 rounded-xl font-bold hover:bg-brand-green/20 transition-colors justify-center"
              >
                <ExternalLink size={14} />
                Completar pago en Mercado Pago →
              </a>
              <p className="text-brand-faint text-[10px] text-center">
                Usa la tarjeta de prueba y verifica el webhook en Railway logs
              </p>
            </div>
          )}

          {result.error && (
            <p className="text-xs text-brand-red font-mono">{result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}

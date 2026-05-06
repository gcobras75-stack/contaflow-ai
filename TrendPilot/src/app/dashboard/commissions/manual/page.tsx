'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Coins, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/utils'

// Tasas de comisión por defecto por red
const DEFAULT_RATES: Record<string, number> = {
  mercadolibre: 6,
  shein:        20,
  temu:         10,
  aliexpress:   8,
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function ManualCommissionPage() {
  const router  = useRouter()
  const [form, setForm] = useState({
    network:        'mercadolibre',
    productName:    '',
    saleAmount:     '',
    commissionRate: '6',
    saleDate:       new Date().toISOString().slice(0, 10),
    transactionId:  '',
    status:         'pending',
  })
  const [submitStatus, setSubmitStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg]         = useState('')

  function handleNetworkChange(network: string) {
    setForm((f) => ({
      ...f,
      network,
      commissionRate: String(DEFAULT_RATES[network] ?? 6),
    }))
  }

  const commission = form.saleAmount && form.commissionRate
    ? parseFloat(form.saleAmount) * (parseFloat(form.commissionRate) / 100)
    : 0
  const operatorShare = commission * 0.70
  const antonioShare  = commission * 0.30

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.productName || !form.saleAmount || !form.commissionRate) return

    setSubmitStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/affiliates/commissions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          network:        form.network,
          productName:    form.productName,
          saleAmount:     parseFloat(form.saleAmount),
          commissionRate: parseFloat(form.commissionRate),
          transactionId:  form.transactionId || undefined,
          saleDate:       form.saleDate,
          status:         form.status,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `Error ${res.status}`)
      }

      setSubmitStatus('success')
      setTimeout(() => router.push('/dashboard/commissions'), 1500)
    } catch (err) {
      setSubmitStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/commissions"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-brand-hover hover:bg-brand-border transition-colors"
        >
          <ArrowLeft size={15} className="text-brand-muted" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-brand-text">Registrar comisión manual</h1>
          <p className="text-xs text-brand-muted">Mientras el postback automático se configura</p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">

        {/* Red afiliada */}
        <div>
          <label className="text-xs text-brand-muted mb-2 block font-medium">Red afiliada</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(DEFAULT_RATES).map((net) => (
              <button
                key={net}
                type="button"
                onClick={() => handleNetworkChange(net)}
                className={cn(
                  'px-3 py-2 rounded-xl border text-xs font-medium transition-colors capitalize',
                  form.network === net
                    ? 'bg-brand-primary/15 border-brand-primary/40 text-brand-primary'
                    : 'bg-brand-hover border-brand-border text-brand-muted hover:text-brand-text',
                )}
              >
                {net === 'mercadolibre' ? 'MercadoLibre' : net.charAt(0).toUpperCase() + net.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Producto vendido */}
        <div>
          <label className="text-xs text-brand-muted mb-1.5 block font-medium">Producto vendido</label>
          <input
            type="text"
            value={form.productName}
            onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
            placeholder="Ej: Smartwatch Deportivo"
            required
            className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary/40"
          />
        </div>

        {/* Monto y comisión */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block font-medium">Monto de venta (MXN)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.saleAmount}
              onChange={(e) => setForm((f) => ({ ...f, saleAmount: e.target.value }))}
              placeholder="1500.00"
              required
              className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary/40"
            />
          </div>
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block font-medium">Comisión %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.commissionRate}
              onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
              required
              className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary/40"
            />
          </div>
        </div>

        {/* Preview del split */}
        {commission > 0 && (
          <div className="bg-brand-primary/8 border border-brand-primary/20 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Coins size={12} className="text-brand-primary" />
              <p className="text-xs font-semibold text-brand-primary">Desglose de comisión</p>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-brand-muted">Comisión total</span>
              <span className="text-brand-text font-medium">${commission.toFixed(2)} MXN</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-brand-muted">Tu ganancia (70%)</span>
              <span className="text-brand-green font-medium">${operatorShare.toFixed(2)} MXN</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-brand-muted">GrowthFund (30%)</span>
              <span className="text-brand-primary font-medium">${antonioShare.toFixed(2)} MXN</span>
            </div>
          </div>
        )}

        {/* Fecha y estado */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block font-medium">Fecha de venta</label>
            <input
              type="date"
              value={form.saleDate}
              onChange={(e) => setForm((f) => ({ ...f, saleDate: e.target.value }))}
              required
              className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary/40"
            />
          </div>
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block font-medium">Estado</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary/40"
            >
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobada</option>
              <option value="paid">Pagada</option>
            </select>
          </div>
        </div>

        {/* ID de transacción (opcional) */}
        <div>
          <label className="text-xs text-brand-muted mb-1.5 block font-medium">
            ID de transacción <span className="text-brand-faint">(opcional)</span>
          </label>
          <input
            type="text"
            value={form.transactionId}
            onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
            placeholder="Ej: ML-123456789"
            className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary/40"
          />
        </div>

        {/* Error */}
        {submitStatus === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-brand-red/8 border border-brand-red/20 rounded-xl text-xs text-brand-red">
            <AlertCircle size={13} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitStatus === 'loading' || submitStatus === 'success'}
          className={cn(
            'w-full py-3 rounded-xl text-sm font-semibold transition-all',
            submitStatus === 'success'
              ? 'bg-brand-green/15 border border-brand-green/30 text-brand-green'
              : 'btn-gradient text-white disabled:opacity-60',
          )}
        >
          {submitStatus === 'loading' ? 'Registrando…'
            : submitStatus === 'success' ? (
              <span className="flex items-center justify-center gap-2">
                <Check size={14} /> Registrada — redirigiendo
              </span>
            )
            : 'Registrar comisión'
          }
        </button>
      </form>

      {/* Info postback */}
      <div className="bg-brand-hover border border-brand-border rounded-2xl p-4 space-y-2">
        <p className="text-xs font-semibold text-brand-text">URL de postback automático</p>
        <p className="text-xs text-brand-muted">
          Configura esta URL en el panel de afiliados de cada red para recibir comisiones automáticamente:
        </p>
        <code className="block text-[10px] text-brand-primary bg-brand-card rounded-lg px-3 py-2 break-all">
          https://www.trendpilot.marketing/api/affiliates/postback
        </code>
        <p className="text-[10px] text-brand-faint">
          Parámetros: ?network=mercadolibre&transaction_id=XXX&sale_amount=1500&commission_rate=6&status=approved
        </p>
      </div>
    </div>
  )
}

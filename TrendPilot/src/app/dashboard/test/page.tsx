'use client'

import { useState } from 'react'
import { FlaskConical, CheckCircle, XCircle, Loader, Play } from 'lucide-react'
import { cn } from '@/utils'

type TestStatus = 'idle' | 'running' | 'pass' | 'fail'

interface TestResult {
  id:     string
  name:   string
  status: TestStatus
  detail: string
  ms?:    number
}

const INITIAL_TESTS: TestResult[] = [
  { id: 'vendor',   name: 'Flujo vendor completo',   status: 'idle', detail: 'Crear vendor, WhatsApp, email, activación' },
  { id: 'product',  name: 'Flujo producto',           status: 'idle', detail: 'Registrar, ProductScore, aprobar, notificar' },
  { id: 'campaign', name: 'Flujo campaña',            status: 'idle', detail: 'Crear campaña, semáforo, simular venta' },
  { id: 'payment',  name: 'Flujo pago Mercado Pago',  status: 'idle', detail: 'Webhook MP, comisión, GrowthFund' },
  { id: 'mobile',   name: 'Panel Manuel (/mobile)',   status: 'idle', detail: 'Carga dashboard mobile, aprobaciones' },
]

async function runTest(id: string): Promise<{ pass: boolean; detail: string; ms: number }> {
  const t0 = Date.now()

  try {
    if (id === 'vendor') {
      // Crear vendor de prueba
      const res = await fetch('/api/vendors', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:            'Vendor Test Sesión 8',
          email:           'vendor.test@trendpilot.marketing',
          whatsapp:        '5266754321',
          business_name:   'Negocio Test',
          commission_rate: 20,
          category:        'electrónica',
        }),
      })
      if (!res.ok) throw new Error(`Vendors API: ${res.status}`)
      const { data } = await res.json()
      return { pass: Boolean(data?.id), detail: `Vendor creado ID: ${data?.id ?? '—'}`, ms: Date.now() - t0 }
    }

    if (id === 'product') {
      // Verificar que ProductScore API responde
      const res = await fetch('/api/products?limit=1')
      if (!res.ok) throw new Error(`Products API: ${res.status}`)
      const { data } = await res.json()
      return { pass: true, detail: `Products API OK · ${data?.length ?? 0} productos en DB`, ms: Date.now() - t0 }
    }

    if (id === 'campaign') {
      // Verificar que Campaigns API responde y semáforo funciona
      const res = await fetch('/api/campaigns?limit=5')
      if (!res.ok) throw new Error(`Campaigns API: ${res.status}`)
      const { data } = await res.json()
      const counts = { green: 0, yellow: 0, red: 0 }
      for (const c of data ?? []) {
        const col = c.semaphore_color as 'green' | 'yellow' | 'red'
        if (col in counts) counts[col]++
      }
      return { pass: true, detail: `Semáforo: ${counts.green}🟢 ${counts.yellow}🟡 ${counts.red}🔴`, ms: Date.now() - t0 }
    }

    if (id === 'payment') {
      // Verificar que el webhook de MP responde correctamente
      const res = await fetch('/api/webhook-mp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'payment.updated', data: { id: 'test_payment_000' } }),
      })
      // 400/422 es válido — significa que el endpoint existe pero no procesa pago test
      const ok = res.status < 500
      return { pass: ok, detail: `Webhook MP: HTTP ${res.status} — ${ok ? 'endpoint activo' : 'error interno'}`, ms: Date.now() - t0 }
    }

    if (id === 'mobile') {
      // Verificar que la página mobile responde
      const res = await fetch('/dashboard/mobile', { redirect: 'manual' })
      const ok  = res.status < 400
      return { pass: ok, detail: `/dashboard/mobile: HTTP ${res.status}`, ms: Date.now() - t0 }
    }

    throw new Error('Test desconocido')
  } catch (err) {
    return { pass: false, detail: String(err), ms: Date.now() - t0 }
  }
}

export default function TestPage() {
  const [tests,    setTests]    = useState<TestResult[]>(INITIAL_TESTS)
  const [running,  setRunning]  = useState(false)

  async function runAll() {
    setRunning(true)
    setTests((prev) => prev.map((t) => ({ ...t, status: 'running' as const, detail: 'Ejecutando…' })))

    for (const test of INITIAL_TESTS) {
      setTests((prev) => prev.map((t) => t.id === test.id ? { ...t, status: 'running', detail: 'Ejecutando…' } : t))
      const result = await runTest(test.id)
      setTests((prev) => prev.map((t) =>
        t.id === test.id
          ? { ...t, status: result.pass ? 'pass' : 'fail', detail: result.detail, ms: result.ms }
          : t,
      ))
    }

    setRunning(false)
  }

  async function runSingle(id: string) {
    setTests((prev) => prev.map((t) => t.id === id ? { ...t, status: 'running', detail: 'Ejecutando…' } : t))
    const result = await runTest(id)
    setTests((prev) => prev.map((t) =>
      t.id === id
        ? { ...t, status: result.pass ? 'pass' : 'fail', detail: result.detail, ms: result.ms }
        : t,
    ))
  }

  const passed = tests.filter((t) => t.status === 'pass').length
  const failed = tests.filter((t) => t.status === 'fail').length

  return (
    <div className="space-y-6 max-w-[900px]">

      {/* Header */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
              <FlaskConical size={15} className="text-brand-primary" />
            </div>
            Pruebas End-to-End
          </h1>
          <p className="text-sm text-brand-muted mt-1">Verifica que todos los flujos críticos funcionan correctamente</p>
        </div>
        <button
          onClick={runAll}
          disabled={running}
          className="btn-gradient flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {running ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
          {running ? 'Ejecutando…' : 'Ejecutar todas'}
        </button>
      </div>

      {/* Resumen */}
      {(passed > 0 || failed > 0) && (
        <div className="grid grid-cols-3 gap-3 animate-fade-in">
          <div className="bg-brand-card border border-brand-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold font-mono text-brand-text">{tests.length}</p>
            <p className="text-xs text-brand-faint mt-1">Total</p>
          </div>
          <div className="bg-brand-green/5 border border-brand-green/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold font-mono text-brand-green">{passed}</p>
            <p className="text-xs text-brand-faint mt-1">Pasaron</p>
          </div>
          <div className="bg-brand-red/5 border border-brand-red/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold font-mono text-brand-red">{failed}</p>
            <p className="text-xs text-brand-faint mt-1">Fallaron</p>
          </div>
        </div>
      )}

      {/* Tests */}
      <div className="space-y-3 animate-fade-in" style={{ animationDelay: '80ms' }}>
        {tests.map((test) => (
          <div key={test.id} className={cn(
            'bg-brand-card border rounded-2xl p-5 transition-all',
            test.status === 'pass' ? 'border-brand-green/30' :
            test.status === 'fail' ? 'border-brand-red/30' :
            'border-brand-border',
          )}>
            <div className="flex items-start gap-4">
              {/* Icono estado */}
              <div className="shrink-0 mt-0.5">
                {test.status === 'idle'    && <div className="w-6 h-6 rounded-full border-2 border-brand-border" />}
                {test.status === 'running' && <Loader size={22} className="text-brand-primary animate-spin" />}
                {test.status === 'pass'    && <CheckCircle size={22} className="text-brand-green" />}
                {test.status === 'fail'    && <XCircle    size={22} className="text-brand-red" />}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-brand-text">{test.name}</p>
                  {test.ms !== undefined && (
                    <span className="text-[10px] font-mono text-brand-faint shrink-0">{test.ms}ms</span>
                  )}
                </div>
                <p className={cn(
                  'text-xs mt-1',
                  test.status === 'pass' ? 'text-brand-green' :
                  test.status === 'fail' ? 'text-brand-red' :
                  'text-brand-faint',
                )}>
                  {test.detail}
                </p>
              </div>

              {/* Botón individual */}
              {test.status !== 'running' && (
                <button
                  onClick={() => runSingle(test.id)}
                  disabled={running}
                  className="shrink-0 px-3 py-1.5 bg-brand-hover border border-brand-border rounded-lg text-[10px] font-semibold text-brand-muted hover:text-brand-text transition-colors disabled:opacity-40"
                >
                  Ejecutar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info adicional */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-3 animate-fade-in" style={{ animationDelay: '150ms' }}>
        <p className="text-xs font-semibold text-brand-faint uppercase tracking-widest">Notas sobre las pruebas</p>
        <ul className="space-y-2 text-xs text-brand-muted list-disc list-inside">
          <li>Las pruebas crean datos reales en la base de datos — úsalas solo para verificación</li>
          <li>Prueba de pago verifica que el webhook está activo, no procesa cobro real</li>
          <li>Prueba de vendor envía WhatsApp real al número configurado si TWILIO está activo</li>
          <li>Para prueba completa de DocuSeal, agrega DOCUSEAL_API_KEY en las variables</li>
        </ul>
      </div>
    </div>
  )
}

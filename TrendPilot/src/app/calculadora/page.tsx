'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import type { CalculatorResult } from '@/lib/import/types'
import { DESTINATION_CITIES, ORIGIN_CITIES } from '@/lib/import/calculator'

function CalculadoraContent() {
  const sp = useSearchParams()

  const [form, setForm] = useState({
    product:          sp.get('product') ?? 'Lentes de Sol',
    unit_price_usd:   sp.get('price')   ?? '3.50',
    quantity:         sp.get('qty')     ?? '500',
    origin_city:      'Guangzhou',
    destination_city: sp.get('dest')    ?? 'Culiacán',
    use_air_freight:  false,
  })
  const [result,  setResult]  = useState<CalculatorResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [sellPrice, setSellPrice] = useState('')

  // Auto-calcular si viene con parámetros del caso lentes
  useEffect(() => {
    if (sp.get('product')) handleCalculate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCalculate = async () => {
    setError('')
    const price = parseFloat(form.unit_price_usd)
    const qty   = parseInt(form.quantity)
    if (!form.product || isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) {
      setError('Completa todos los campos correctamente.')
      return
    }
    setLoading(true)
    try {
      const res  = await fetch('/api/import/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, unit_price_usd: price, quantity: qty }),
      })
      const data = await res.json()
      if (data.result) setResult(data.result)
      else setError('Error al calcular. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const fmxn = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
  const fusd = (n: number) => `$${n.toFixed(2)} USD`

  const sellPriceNum = parseFloat(sellPrice)
  const margin = result && sellPriceNum > 0
    ? ((sellPriceNum - result.cost_per_unit_mxn) / sellPriceNum * 100)
    : null

  const inp = (label: string, key: keyof typeof form, type = 'text', opts?: string[]) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', color: '#aaa', fontSize: 13, marginBottom: 6 }}>{label}</label>
      {opts ? (
        <select
          value={form[key] as string}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 15 }}
        >
          {opts.map(o => <option key={o} value={o} style={{ background: '#0A1628' }}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={form[key] as string}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 15, boxSizing: 'border-box' }}
        />
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0A1628', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: 20, color: '#0066FF', textDecoration: 'none' }}>TrendPilot Import</Link>
        <Link href="/buscar" style={{ color: '#0066FF', textDecoration: 'none', fontSize: 14 }}>← Buscar proveedores</Link>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>🧮 Calculadora de Importación</h1>
          <p style={{ color: '#888' }}>Calcula el costo total puesto en tu ciudad: arancel, IVA, DTA, agente aduanal y flete interno.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px,400px) 1fr', gap: 32, alignItems: 'start' }}>
          {/* Form */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
            {inp('Producto', 'product')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', color: '#aaa', fontSize: 13, marginBottom: 6 }}>Precio unitario (USD)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={form.unit_price_usd}
                  onChange={e => setForm(f => ({ ...f, unit_price_usd: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 15, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', color: '#aaa', fontSize: 13, marginBottom: 6 }}>Cantidad (piezas)</label>
                <input
                  type="number" min="1"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 15, boxSizing: 'border-box' }}
                />
              </div>
            </div>
            {inp('Puerto de origen', 'origin_city', 'text', ORIGIN_CITIES)}
            {inp('Ciudad destino México', 'destination_city', 'text', DESTINATION_CITIES)}

            {/* Flete aéreo toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.use_air_freight}
                onChange={e => setForm(f => ({ ...f, use_air_freight: e.target.checked }))}
              />
              <span style={{ color: '#aaa', fontSize: 14 }}>✈️ Flete aéreo (más rápido, más caro)</span>
            </label>

            {error && <div style={{ color: '#FF3B30', fontSize: 14, marginBottom: 12 }}>{error}</div>}

            <button
              onClick={handleCalculate}
              disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, background: loading ? '#333' : '#0066FF',
                color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Calculando...' : 'Calcular costo total →'}
            </button>
          </div>

          {/* Results */}
          <div>
            {result ? (
              <div>
                {/* Main result */}
                <div style={{ background: 'linear-gradient(135deg, rgba(0,102,255,0.15), rgba(124,58,237,0.15))', border: '1px solid rgba(0,102,255,0.3)', borderRadius: 16, padding: 24, marginBottom: 20, textAlign: 'center' }}>
                  <div style={{ color: '#7ab4ff', fontSize: 14, marginBottom: 4 }}>Costo total puesto en {result.product === 'Lentes de Sol' ? 'Culiacán' : form.destination_city}</div>
                  <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{fmxn(result.total_cost_mxn)}</div>
                  <div style={{ color: '#00FF88', fontSize: 18, fontWeight: 700 }}>{fmxn(result.cost_per_unit_mxn)} / pieza</div>
                  <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
                    {result.transit_days} días · {result.freight_mode === 'sea' ? '🚢 Marítimo' : '✈️ Aéreo'} · Entrada por {result.port_entry}
                  </div>
                </div>

                {/* Breakdown */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, marginBottom: 16 }}>Desglose detallado</div>
                  <CostRow label="Valor FOB (producto)"          value={fusd(result.fob_value_usd)}        color="#fff" />
                  <CostRow label="Flete internacional"           value={fusd(result.freight_usd)}          color="#fff" />
                  <CostRow label="Seguro de carga"               value={fusd(result.insurance_usd)}        color="#fff" />
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '10px 0' }} />
                  <CostRow label={`CIF (base gravable)`}         value={fmxn(result.cif_mxn)}              color="#7ab4ff" bold />
                  <CostRow label={`Arancel (${result.arancel_rate}%) — HS ${result.hs_code}`} value={fmxn(result.arancel_mxn)} color="#FFB800" />
                  <CostRow label="IVA 16%"                       value={fmxn(result.iva_mxn)}              color="#FFB800" />
                  <CostRow label="DTA 0.8%"                      value={fmxn(result.dta_mxn)}              color="#FFB800" />
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '10px 0' }} />
                  <CostRow label="Honorarios agente aduanal"     value={fmxn(result.agent_fees_mxn)}       color="#fff" />
                  <CostRow label={`Flete interno → ${form.destination_city}`} value={fmxn(result.inland_freight_mxn)} color="#fff" />
                  <div style={{ borderTop: '1px solid rgba(0,102,255,0.3)', margin: '14px 0' }} />
                  <CostRow label="TOTAL"                         value={fmxn(result.total_cost_mxn)}       color="#00FF88" bold big />
                </div>

                {/* Margin calculator */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>Calcula tu margen de ganancia</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ color: '#aaa', fontSize: 13 }}>Precio de venta por pieza (MXN)</label>
                      <input
                        type="number" value={sellPrice}
                        onChange={e => setSellPrice(e.target.value)}
                        placeholder="Ej: 350"
                        style={{ width: '100%', marginTop: 6, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 15, boxSizing: 'border-box' }}
                      />
                    </div>
                    {margin !== null && (
                      <div style={{ textAlign: 'center', minWidth: 80 }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: margin > 30 ? '#00FF88' : margin > 10 ? '#FFB800' : '#FF3B30' }}>
                          {margin.toFixed(1)}%
                        </div>
                        <div style={{ color: '#888', fontSize: 12 }}>margen</div>
                      </div>
                    )}
                  </div>
                  {margin !== null && (
                    <div style={{ marginTop: 10, color: '#aaa', fontSize: 13 }}>
                      Ganancia por pieza: {fmxn(sellPriceNum - result.cost_per_unit_mxn)} ·
                      Ganancia total ({result.quantity} pzas): {fmxn((sellPriceNum - result.cost_per_unit_mxn) * result.quantity)}
                    </div>
                  )}
                </div>

                {/* Permits */}
                {result.special_permits.length > 0 && (
                  <div style={{ background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 12, padding: 16 }}>
                    <div style={{ color: '#FFB800', fontWeight: 700, marginBottom: 8 }}>⚠️ Permisos especiales requeridos</div>
                    {result.special_permits.map(p => (
                      <div key={p} style={{ color: '#FFB800', fontSize: 14, marginBottom: 4 }}>• {p}</div>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                  <Link href="/buscar" style={{
                    flex: 1, display: 'block', padding: '14px', borderRadius: 12, background: '#0066FF',
                    color: '#fff', fontWeight: 700, fontSize: 15, textAlign: 'center', textDecoration: 'none',
                  }}>
                    Quiero importar esto →
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🧮</div>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Calculadora lista</div>
                <div style={{ color: '#888', fontSize: 14 }}>
                  Ingresa los datos del producto y te calculamos el costo total
                  incluyendo impuestos, agente aduanal y flete a tu ciudad.
                </div>
                <div style={{ marginTop: 24, padding: 16, background: 'rgba(0,102,255,0.08)', borderRadius: 10, textAlign: 'left', fontSize: 13, color: '#7ab4ff' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Ejemplo ya cargado:</div>
                  <div>📦 500 lentes de sol a $3.50 USD</div>
                  <div>🚢 De Guangzhou → Culiacán</div>
                  <div>🔘 Da clic en "Calcular" para ver el resultado</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CostRow({ label, value, color, bold, big }: { label: string; value: string; color: string; bold?: boolean; big?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: big ? 16 : 14 }}>
      <span style={{ color: '#aaa', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ color, fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  )
}

export default function CalculadoraPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0A1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#0066FF' }}>Cargando calculadora...</div>
      </div>
    }>
      <CalculadoraContent />
    </Suspense>
  )
}

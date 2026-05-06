'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupplierById, getTrustBadgeConfig } from '@/lib/import/suppliers'
import type { Supplier } from '@/lib/import/types'

interface Analysis {
  real_expectations: { yes: string[]; no: string[] }
  red_flags:         string[]
  negotiation_tips:  string[]
  key_questions:     string[]
}

export default function ImportProductPage() {
  const params     = useParams()
  const router     = useRouter()
  const supplierId = params['product-id'] as string

  const [supplier,  setSupplier]  = useState<Supplier | null>(null)
  const [analysis,  setAnalysis]  = useState<Analysis | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [tab,       setTab]       = useState<'perfil' | 'analisis' | 'fotos' | 'resennas'>('perfil')

  useEffect(() => {
    const s = getSupplierById(supplierId)
    if (!s) { router.push('/buscar'); return }
    setSupplier(s)
    loadAnalysis(supplierId)
  }, [supplierId, router])

  const loadAnalysis = async (id: string) => {
    setLoadingAI(true)
    try {
      const res  = await fetch('/api/import/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_id: id }),
      })
      const data = await res.json()
      if (data.analysis) setAnalysis(data.analysis)
    } finally {
      setLoadingAI(false)
    }
  }

  if (!supplier) return (
    <div style={{ minHeight: '100vh', background: '#0A1628', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      Cargando...
    </div>
  )

  const badge = getTrustBadgeConfig(supplier.trust_badge)

  return (
    <div style={{ minHeight: '100vh', background: '#0A1628', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: 20, color: '#0066FF', textDecoration: 'none' }}>TrendPilot Import</Link>
        <button onClick={() => router.back()} style={{ color: '#0066FF', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
          ← Volver a resultados
        </button>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap' }}>
          <div style={{
            padding: '16px 20px', borderRadius: 12, background: badge.bg,
            border: `1px solid ${badge.color}40`, textAlign: 'center', minWidth: 100,
          }}>
            <div style={{ fontSize: 28 }}>{badge.emoji}</div>
            <div style={{ color: badge.color, fontWeight: 800, fontSize: 28 }}>{supplier.trust_score}</div>
            <div style={{ color: badge.color, fontSize: 12, fontWeight: 700 }}>{badge.label}</div>
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{supplier.name}</h1>
            <div style={{ color: '#888', fontSize: 14, marginBottom: 12 }}>
              📍 {supplier.location} · {supplier.years_on_platform} años en plataforma
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {supplier.trade_assurance && <Badge color="#00FF88">✓ Trade Assurance</Badge>}
              {supplier.verified_supplier && <Badge color="#0066FF">✓ Proveedor Verificado</Badge>}
              {supplier.certifications.map(c => <Badge key={c} color="#7C3AED">{c}</Badge>)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => router.push(`/calculadora?product=${encodeURIComponent(supplier.main_products[0])}&origin=${encodeURIComponent('Guangzhou')}`)}
              style={{ padding: '12px 20px', borderRadius: 10, background: '#0066FF', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              🧮 Calcular costo total
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {(['perfil', 'analisis', 'fotos', 'resennas'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t ? '#0066FF' : '#888', fontWeight: tab === t ? 700 : 400,
                borderBottom: `2px solid ${tab === t ? '#0066FF' : 'transparent'}`,
                fontSize: 14, textTransform: 'capitalize',
              }}
            >
              {t === 'perfil' ? '📊 Perfil' : t === 'analisis' ? '🤖 Análisis IA' : t === 'fotos' ? '📷 Fotos' : '⭐ Reseñas MX'}
            </button>
          ))}
        </div>

        {/* Tab: Perfil */}
        {tab === 'perfil' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
              <StatCard label="Calificación positiva" value={`${supplier.positive_rating}%`} color="#00FF88" />
              <StatCard label="Tiempo respuesta" value={`${supplier.response_time_hours}h`} color="#0066FF" />
              <StatCard label="Transacciones totales" value={supplier.total_transactions.toLocaleString()} color="#7C3AED" />
              <StatCard label="Tasa recompra" value={`${supplier.reorder_rate}%`} color="#FFB800" />
              <StatCard label="Clientes en México" value={supplier.mexico_customers.toString()} color="#00FF88" />
              <StatCard label="MOQ mínimo" value={`${supplier.min_order} pzas`} color="#fff" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: 20 }}>
                <div style={{ color: '#00FF88', fontWeight: 700, marginBottom: 12 }}>✅ Fortalezas verificadas</div>
                {supplier.strengths.map((s, i) => (
                  <div key={i} style={{ color: '#aaa', fontSize: 14, marginBottom: 8 }}>• {s}</div>
                ))}
              </div>
              {supplier.warnings.length > 0 && (
                <div style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 12, padding: 20 }}>
                  <div style={{ color: '#FFB800', fontWeight: 700, marginBottom: 12 }}>⚠️ Alertas de riesgo</div>
                  {supplier.warnings.map((w, i) => (
                    <div key={i} style={{ color: '#aaa', fontSize: 14, marginBottom: 8 }}>• {w}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Análisis IA */}
        {tab === 'analisis' && (
          <div>
            {loadingAI ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                <div style={{ color: '#7ab4ff' }}>Claude está analizando el proveedor...</div>
              </div>
            ) : analysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Lo que SÍ/NO recibirás */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: 20 }}>
                    <div style={{ color: '#00FF88', fontWeight: 700, marginBottom: 12 }}>✅ SÍ puedes esperar esto:</div>
                    {analysis.real_expectations.yes.map((item, i) => (
                      <div key={i} style={{ color: '#aaa', fontSize: 14, marginBottom: 8 }}>✓ {item}</div>
                    ))}
                  </div>
                  <div style={{ background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.2)', borderRadius: 12, padding: 20 }}>
                    <div style={{ color: '#FF3B30', fontWeight: 700, marginBottom: 12 }}>❌ NO esperes esto a ese precio:</div>
                    {analysis.real_expectations.no.map((item, i) => (
                      <div key={i} style={{ color: '#aaa', fontSize: 14, marginBottom: 8 }}>✗ {item}</div>
                    ))}
                  </div>
                </div>

                {/* Red flags */}
                {analysis.red_flags.length > 0 && (
                  <div style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 12, padding: 20 }}>
                    <div style={{ color: '#FFB800', fontWeight: 700, marginBottom: 12 }}>🚨 Alertas detectadas por IA</div>
                    {analysis.red_flags.map((f, i) => (
                      <div key={i} style={{ color: '#aaa', fontSize: 14, marginBottom: 8 }}>⚠️ {f}</div>
                    ))}
                  </div>
                )}

                {/* Consejos de negociación */}
                <div style={{ background: 'rgba(0,102,255,0.06)', border: '1px solid rgba(0,102,255,0.2)', borderRadius: 12, padding: 20 }}>
                  <div style={{ color: '#7ab4ff', fontWeight: 700, marginBottom: 12 }}>💡 Consejos de negociación</div>
                  {analysis.negotiation_tips.map((t, i) => (
                    <div key={i} style={{ color: '#aaa', fontSize: 14, marginBottom: 8 }}>→ {t}</div>
                  ))}
                </div>

                {/* Preguntas clave */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
                  <div style={{ color: '#fff', fontWeight: 700, marginBottom: 12 }}>📋 Preguntas clave antes de ordenar</div>
                  {analysis.key_questions.map((q, i) => (
                    <div key={i} style={{ color: '#aaa', fontSize: 14, marginBottom: 10, display: 'flex', gap: 10 }}>
                      <span style={{ color: '#0066FF', fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>No se pudo cargar el análisis. <button onClick={() => loadAnalysis(supplierId)} style={{ color: '#0066FF', background: 'none', border: 'none', cursor: 'pointer' }}>Reintentar</button></div>
            )}
          </div>
        )}

        {/* Tab: Fotos */}
        {tab === 'fotos' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <StatCard label="Fotos totales" value={supplier.photo_analysis.total_photos.toString()} color="#fff" />
              <StatCard label="Fotos reales" value={supplier.photo_analysis.real_photos.toString()} color="#00FF88" />
              <StatCard label="Fotos de stock" value={supplier.photo_analysis.stock_photos.toString()} color="#FFB800" />
            </div>
            {supplier.photo_analysis.concerns.length > 0 ? (
              <div style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <div style={{ color: '#FFB800', fontWeight: 700, marginBottom: 12 }}>⚠️ Observaciones en las fotos</div>
                {supplier.photo_analysis.concerns.map((c, i) => (
                  <div key={i} style={{ color: '#aaa', fontSize: 14, marginBottom: 8 }}>• {c}</div>
                ))}
              </div>
            ) : (
              <div style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: 20 }}>
                <div style={{ color: '#00FF88', fontWeight: 700 }}>✅ Fotos sin observaciones — parecen reales y verificadas</div>
              </div>
            )}
            <div style={{ padding: 20, background: 'rgba(0,102,255,0.06)', borderRadius: 12, border: '1px solid rgba(0,102,255,0.2)' }}>
              <div style={{ color: '#7ab4ff', fontSize: 14 }}>
                💡 <strong>Consejo:</strong> Siempre pide al proveedor que te envíe fotos adicionales con tu logo o una hoja de papel con la fecha de hoy. Esto confirma que el producto existe y es real.
              </div>
            </div>
          </div>
        )}

        {/* Tab: Reseñas MX */}
        {tab === 'resennas' && (
          <div>
            <div style={{ marginBottom: 16, color: '#888', fontSize: 14 }}>
              Reseñas de compradores en México para proveedores de este tipo de producto.
            </div>
            {SAMPLE_REVIEWS.map((r, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{r.user}</span>
                    <span style={{ color: '#888', fontSize: 13, marginLeft: 10 }}>📍 {r.city}</span>
                  </div>
                  <div style={{ color: '#FFB800' }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
                </div>
                <div style={{ color: '#aaa', fontSize: 14 }}>{r.text}</div>
                {r.ai_summary && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(0,102,255,0.08)', borderRadius: 8, fontSize: 13, color: '#7ab4ff' }}>
                    🤖 Resumen IA: {r.ai_summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 13, background: `${color}15`, border: `1px solid ${color}30`, color }}>
      {children}
    </span>
  )
}

const SAMPLE_REVIEWS = [
  {
    user: 'Carlos M.',
    city: 'Culiacán, Sinaloa',
    stars: 5,
    text: 'Pedí 300 piezas, llegaron en 32 días a Manzanillo. Calidad muy buena para el precio, los UV400 sí están certificados. El agente en Manzanillo fue muy rápido en el trámite.',
    ai_summary: 'Tiempo de entrega dentro del rango prometido. Calidad de protección UV confirmada. Experiencia positiva con agente aduanal.',
  },
  {
    user: 'Fernanda R.',
    city: 'Guadalajara, Jalisco',
    stars: 4,
    text: 'Buena calidad en general. Las tallas salieron un poco diferentes a lo anunciado, pregunten bien antes de pedir. El proveedor respondió rápido mis dudas.',
    ai_summary: 'Tallas pueden variar. Comunicación con proveedor calificada como buena. Recomendable pedir tabla de tallas detallada.',
  },
  {
    user: 'Roberto S.',
    city: 'Monterrey, Nuevo León',
    stars: 5,
    text: 'Ya es mi tercer pedido. La primera vez tenía dudas pero todo llegó perfecto. Volvería a comprar sin pensarlo.',
    ai_summary: 'Cliente recurrente — alta satisfacción. Confirma consistencia en calidad entre pedidos.',
  },
]

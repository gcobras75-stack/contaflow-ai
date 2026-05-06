'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Supplier } from '@/lib/import/types'
import { getTrustBadgeConfig } from '@/lib/import/suppliers'

const CATEGORY_CHIPS = [
  { label: '🕶️ Lentes', q: 'lentes de sol mayoreo' },
  { label: '📱 Tech', q: 'electronica mayoreo' },
  { label: '👗 Moda', q: 'ropa mayoreo' },
  { label: '🏭 Industrial', q: 'herramientas industriales' },
  { label: '🌾 Agrícola', q: 'equipo agrícola riego' },
  { label: '🔧 Herramientas', q: 'herramientas mayoreo' },
  { label: '🚗 Automotriz', q: 'autopartes mayoreo' },
]

export default function BuscarClient() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const initialQuery  = searchParams.get('q') ?? ''

  const [query,     setQuery]     = useState(initialQuery)
  const [results,   setResults]   = useState<Supplier[]>([])
  const [loading,   setLoading]   = useState(false)
  const [searched,  setSearched]  = useState(false)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res  = await fetch(`/api/import/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.suppliers ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery)
  }, [initialQuery, doSearch])

  const handleSearch = () => {
    if (!query.trim()) return
    router.push(`/buscar?q=${encodeURIComponent(query)}`)
    doSearch(query)
  }

  const s = { // styles
    page:    { minHeight: '100vh', background: '#0A1628', color: '#fff', fontFamily: 'Inter, sans-serif' } as React.CSSProperties,
    nav:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' } as React.CSSProperties,
    logo:    { fontWeight: 800, fontSize: 20, color: '#0066FF', textDecoration: 'none' } as React.CSSProperties,
    content: { maxWidth: 900, margin: '0 auto', padding: '32px 20px' } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <Link href="/" style={s.logo}>TrendPilot Import</Link>
        <Link href="/calculadora" style={{ color: '#0066FF', textDecoration: 'none', fontSize: 14 }}>
          🧮 Calculadora de Importación
        </Link>
      </nav>

      <div style={s.content}>
        {/* Search bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="¿Qué necesitas importar?"
              style={{
                flex: 1, padding: '14px 18px', borderRadius: 12,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', fontSize: 16, outline: 'none',
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                padding: '14px 28px', borderRadius: 12, background: '#0066FF',
                color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
              }}
            >
              Buscar →
            </button>
          </div>

          {/* Category chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORY_CHIPS.map(c => (
              <button
                key={c.q}
                onClick={() => { setQuery(c.q); router.push(`/buscar?q=${encodeURIComponent(c.q)}`); doSearch(c.q) }}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                  background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.3)',
                  color: '#7ab4ff',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#7ab4ff' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div>Analizando proveedores de China...</div>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>😔</div>
            <div>No encontramos proveedores para esa búsqueda.</div>
            <div style={{ marginTop: 8, fontSize: 14 }}>Intenta con términos más generales como "lentes", "ropa" o "herramientas".</div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div>
            <div style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>
              {results.length} proveedores encontrados para "{initialQuery}"
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {results.map(s => <SupplierCard key={s.id} supplier={s} />)}
            </div>
          </div>
        )}

        {!searched && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Encuentra proveedores verificados de China
            </div>
            <div style={{ color: '#888', maxWidth: 480, margin: '0 auto' }}>
              Analizamos cada proveedor antes de mostrártelo. Sabrás exactamente con quién estás tratando.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SupplierCard({ supplier: s }: { supplier: Supplier }) {
  const badge  = getTrustBadgeConfig(s.trust_badge)
  const router = useRouter()

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: 24, cursor: 'pointer', transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,102,255,0.4)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
    >
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Trust badge */}
        <div style={{
          minWidth: 80, padding: '8px 14px', borderRadius: 8, textAlign: 'center',
          background: badge.bg, border: `1px solid ${badge.color}30`,
        }}>
          <div style={{ fontSize: 20 }}>{badge.emoji}</div>
          <div style={{ color: badge.color, fontWeight: 700, fontSize: 11, marginTop: 2 }}>{badge.label}</div>
          <div style={{ color: badge.color, fontSize: 18, fontWeight: 800 }}>{s.trust_score}</div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{s.name_es}</div>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 10 }}>
            📍 {s.location} · {s.years_on_platform} años · {s.positive_rating}% positivo
          </div>
          <div style={{ color: '#aaa', fontSize: 13, marginBottom: 12 }}>{s.description_es}</div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {s.trade_assurance && <Chip color="#00FF88">Trade Assurance</Chip>}
            {s.verified_supplier && <Chip color="#0066FF">Proveedor Verificado</Chip>}
            {s.certifications.slice(0, 3).map(c => <Chip key={c} color="#7C3AED">{c}</Chip>)}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: '#aaa' }}>
            <span>💰 ${s.price_range.min}–${s.price_range.max} USD/pc</span>
            <span>📦 MOQ: {s.min_order} pzas</span>
            <span>🚢 {s.delivery_days_sea} días (marítimo)</span>
            <span>🇲🇽 {s.mexico_customers} clientes MX</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
          <button
            onClick={() => router.push(`/p/import/${s.id}`)}
            style={{
              padding: '10px 16px', borderRadius: 8, background: '#0066FF',
              color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
            }}
          >
            Ver análisis completo →
          </button>
          <button
            onClick={() => router.push(`/calculadora?product=${encodeURIComponent(s.main_products[0])}&origin=${s.location.split(',')[1]?.trim() ?? 'Guangzhou'}`)}
            style={{
              padding: '10px 16px', borderRadius: 8,
              background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
              color: '#00FF88', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            🧮 Calcular costo total
          </button>
        </div>
      </div>

      {/* Warnings */}
      {s.warnings.length > 0 && (
        <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)' }}>
          <span style={{ color: '#FFB800', fontSize: 13 }}>⚠️ {s.warnings[0]}</span>
        </div>
      )}
    </div>
  )
}

function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 12,
      background: `${color}15`, border: `1px solid ${color}30`, color,
    }}>
      {children}
    </span>
  )
}

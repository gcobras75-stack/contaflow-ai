'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TrendingUp, Menu, X, Search, Camera } from 'lucide-react'

// ─── Tipos locales ─────────────────────────────────────────────────────────────

interface Particle { x: number; y: number; vx: number; vy: number; r: number }

// ─── Particle Canvas ──────────────────────────────────────────────────────────

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const particles: Particle[] = []
    const COUNT   = Math.min(50, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 20000))
    const CONNECT = 130

    function resize() { canvas!.width = canvas!.offsetWidth; canvas!.height = canvas!.offsetHeight }

    function spawn() {
      for (let i = 0; i < COUNT; i++) {
        particles.push({ x: Math.random() * canvas!.width, y: Math.random() * canvas!.height,
          vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.5 + 0.8 })
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas!.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas!.height) p.vy *= -1
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fillStyle = 'rgba(0,102,255,0.45)'; ctx!.fill()
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECT) {
            ctx!.beginPath(); ctx!.moveTo(particles[i].x, particles[i].y); ctx!.lineTo(particles[j].x, particles[j].y)
            ctx!.strokeStyle = `rgba(0,102,255,${0.15 * (1 - dist / CONNECT)})`; ctx!.lineWidth = 0.7; ctx!.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }

    resize(); spawn(); draw()
    const ro = new ResizeObserver(resize); ro.observe(canvas)
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.5 }} />
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open,     setOpen]     = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(10,22,40,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      transition: 'all 0.3s', padding: '0 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64, gap: 20 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#0066FF,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={15} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#F8FAFC' }}>TrendPilot</span>
        </Link>

        <div style={{ flex: 1 }} />

        {/* Links desktop */}
        <div className="nav-desktop" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <Link href="/buscar" style={{ color: 'rgba(248,250,252,0.7)', fontSize: 14, textDecoration: 'none' }}>Buscar Proveedor</Link>
          <Link href="/calculadora" style={{ color: 'rgba(248,250,252,0.7)', fontSize: 14, textDecoration: 'none' }}>Calculadora</Link>
          <Link href="/login" style={{ padding: '8px 18px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#F8FAFC', fontSize: 14, textDecoration: 'none' }}>
            Vendedores
          </Link>
        </div>

        <button onClick={() => setOpen(v => !v)} className="nav-mobile"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F8FAFC', padding: 8 }}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div style={{ background: 'rgba(10,22,40,0.98)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/buscar" onClick={() => setOpen(false)} style={{ color: '#F8FAFC', textDecoration: 'none', fontSize: 15, padding: '8px 0' }}>Buscar Proveedor</Link>
          <Link href="/calculadora" onClick={() => setOpen(false)} style={{ color: '#F8FAFC', textDecoration: 'none', fontSize: 15, padding: '8px 0' }}>Calculadora</Link>
          <Link href="/login" onClick={() => setOpen(false)} style={{ color: '#F8FAFC', textDecoration: 'none', fontSize: 15, padding: '8px 0' }}>Panel Vendedores</Link>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) { .nav-mobile { display: none !important; } }
        @media (max-width: 767px) { .nav-desktop { display: none !important; } }
      `}</style>
    </nav>
  )
}

// ─── Categorías ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: '🕶️ Lentes',       q: 'lentes de sol mayoreo' },
  { label: '📱 Tech',          q: 'electronica mayoreo' },
  { label: '👗 Moda',          q: 'ropa mayoreo' },
  { label: '🏭 Industrial',    q: 'herramientas industriales' },
  { label: '🌾 Agrícola',      q: 'equipo agrícola riego' },
  { label: '🔧 Herramientas',  q: 'herramientas mayoreo' },
  { label: '🚗 Automotriz',    q: 'autopartes mayoreo' },
]

const HOW_STEPS = [
  { n: '01', emoji: '🔍', title: 'Busca el producto',      color: '#0066FF', desc: 'Por texto o sube una foto. Nuestra IA identifica el producto y lo busca en cientos de fabricantes chinos.' },
  { n: '02', emoji: '✅', title: 'Comparamos y verificamos', color: '#7C3AED', desc: 'Analizamos reputación, certificaciones, fotos reales y historial de clientes en México. Solo te mostramos lo confiable.' },
  { n: '03', emoji: '🛃', title: 'Importas con confianza',  color: '#00FF88', desc: 'Calculamos todos los impuestos, te conectamos con agente aduanal y damos seguimiento hasta tu puerta.' },
]

const WHY_TRUST = [
  { emoji: '🤖', title: 'Analizamos cada proveedor', desc: 'IA revisa certificaciones, fotos reales vs stock, historial de ventas a México y señales de fraude.' },
  { emoji: '🇲🇽', title: 'Traduce todo al español', desc: 'Chat automático con el proveedor: tú escribes en español, el proveedor recibe en inglés/chino.' },
  { emoji: '🧮', title: 'Calculamos tus impuestos', desc: 'Arancel exacto por fracción HS, IVA, DTA, agente aduanal y flete interno a tu ciudad.' },
  { emoji: '📦', title: 'Seguimiento hasta tu puerta', desc: 'Notificaciones WhatsApp en cada etapa: producción, embarque, aduana, entrega.' },
]

const TESTIMONIALS = [
  {
    name: 'Carlos M.', business: 'Importaciones Culiacán', avatar: 'CM', stars: 5,
    text: 'Importé 300 lentes de sol. TrendPilot me dijo exactamente qué iba a llegar, cuánto iba a pagar de arancel y me ahorró una sorpresa desagradable con el agente aduanal.',
  },
  {
    name: 'Fernanda R.', business: 'Boutique GDL', avatar: 'FR', stars: 5,
    text: 'Era mi primer pedido de ropa de China. El análisis del proveedor me dio confianza. Todo llegó como decía y el costo fue exactamente el que calculó la herramienta.',
  },
  {
    name: 'Roberto S.', business: 'Agropecuaria Sonora', avatar: 'RS', stars: 5,
    text: 'Ya es mi tercer pedido de equipo de riego. Siempre sé exactamente qué pagar de impuestos antes de confirmar la orden. No importaría diferente.',
  },
]

const TRENDING_PRODUCTS = [
  { slug: 'audifonos-bluetooth', emoji: '🎧', name: 'Audífonos Bluetooth', category: 'Electrónicos',     trend: 94, searches: '8,420', price: '$599' },
  { slug: 'termo-stanley-mini',  emoji: '🧊', name: 'Termos Stanley',       category: 'Hogar y Cocina',  trend: 88, searches: '5,630', price: '$489' },
  { slug: 'crema-colageno',      emoji: '✨', name: 'Crema de Colágeno',    category: 'Belleza',         trend: 79, searches: '4,210', price: '$219' },
  { slug: 'cargador-inalambrico',emoji: '⚡', name: 'Cargadores Inalámbricos',category: 'Electrónicos', trend: 85, searches: '3,890', price: '$299' },
  { slug: 'suero-vitamina-c',    emoji: '💧', name: 'Suero Vitamina C',     category: 'Skincare',        trend: 82, searches: '3,340', price: '$199' },
]

// ─── Página principal ─────────────────────────────────────────────────────────

export default function HomePage() {
  const router     = useRouter()
  const [query, setQuery] = useState('')
  const [imgMode, setImgMode] = useState(false)

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    router.push(`/buscar?q=${encodeURIComponent(query)}`)
  }, [query, router])

  const handleCategorySearch = useCallback((q: string) => {
    router.push(`/buscar?q=${encodeURIComponent(q)}`)
  }, [router])

  return (
    <>
      <Navbar />

      <main style={{ background: '#0A1628', color: '#F8FAFC', fontFamily: 'var(--font-geist-sans, Inter, sans-serif)', overflowX: 'hidden' }}>

        {/* ══ SECCIÓN 1 — HERO BUSCADOR ══════════════════════════════════════ */}
        <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 24px 80px' }}>
          <ParticleCanvas />
          <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 600, background: 'radial-gradient(circle, rgba(0,102,255,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 2, maxWidth: 780, width: '100%' }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.3)', borderRadius: 100, padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#60A5FA', marginBottom: 28 }}>
              🇨🇳 → 🇲🇽 Plataforma de importación inteligente
            </div>

            {/* Título */}
            <h1 style={{ fontSize: 'clamp(32px, 6vw, 66px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 16 }}>
              Compra de China sin sorpresas.
              <br />
              <span style={{ background: 'linear-gradient(135deg, #0066FF 0%, #7C3AED 50%, #00FF88 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Te decimos exactamente qué recibirás.
              </span>
            </h1>

            <p style={{ fontSize: 'clamp(15px, 2.2vw, 18px)', color: 'rgba(248,250,252,0.6)', marginBottom: 40, lineHeight: 1.6 }}>
              Verificamos proveedores, traducimos todo al español, calculamos tus impuestos<br />
              y te damos seguimiento hasta tu puerta.
            </p>

            {/* Buscador principal */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,102,255,0.3)', borderRadius: 20, padding: 20, marginBottom: 16, backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={18} color="#7ab4ff" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="¿Qué necesitas importar? Ej: lentes de sol 500 piezas"
                    style={{
                      width: '100%', padding: '14px 14px 14px 44px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  style={{ padding: '14px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#0066FF,#7C3AED)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Buscar →
                </button>
              </div>

              {/* Buscador por imagen */}
              <div
                onClick={() => setImgMode(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.15)', cursor: 'pointer', color: '#7ab4ff', fontSize: 14, justifyContent: 'center' }}
              >
                <Camera size={16} />
                <span>📷 Sube la foto del producto — Claude Vision lo identifica automáticamente</span>
              </div>
              {imgMode && (
                <div style={{ marginTop: 10 }}>
                  <input type="file" accept="image/*" style={{ color: '#7ab4ff', fontSize: 13 }}
                    onChange={() => alert('Función de análisis de imagen disponible próximamente. Por ahora usa el buscador de texto.')}
                  />
                </div>
              )}
            </div>

            {/* Categorías */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.q}
                  onClick={() => handleCategorySearch(c.q)}
                  style={{ padding: '7px 16px', borderRadius: 20, fontSize: 14, cursor: 'pointer', background: 'rgba(0,102,255,0.1)', border: '1px solid rgba(0,102,255,0.25)', color: '#7ab4ff', transition: 'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,102,255,0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,102,255,0.1)')}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ══ SECCIÓN 2 — CÓMO FUNCIONA ══════════════════════════════════════ */}
        <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: '#0066FF', fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>El proceso</p>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1.5px' }}>Así de simple importar bien</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {HOW_STEPS.map(({ n, emoji, title, desc, color }) => (
              <div key={n} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 36, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -10, right: 16, fontSize: 80, fontWeight: 900, color: 'rgba(255,255,255,0.03)', lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: 40, marginBottom: 20 }}>{emoji}</div>
                <div style={{ width: 40, height: 3, background: color, borderRadius: 2, marginBottom: 16 }} />
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color }}>{title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(248,250,252,0.55)', lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ SECCIÓN 3 — POR QUÉ CONFIAR EN TRENDPILOT ═════════════════════ */}
        <section style={{ padding: '80px 24px', background: 'rgba(0,102,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <p style={{ color: '#00FF88', fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>Seguridad total</p>
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1px' }}>Por qué confiar en TrendPilot</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              {WHY_TRUST.map(({ emoji, title, desc }) => (
                <div key={title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28 }}>
                  <div style={{ fontSize: 36, marginBottom: 14 }}>{emoji}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 14, color: 'rgba(248,250,252,0.55)', lineHeight: 1.65 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ SECCIÓN 4 — PRODUCTOS TRENDING RETAIL ══════════════════════════ */}
        <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: '#0066FF', fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>Tendencias del día</p>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 10 }}>Los 5 más buscados hoy en México</h2>
            <p style={{ color: 'rgba(248,250,252,0.4)', fontSize: 14 }}>Comparamos precios reales. Declaramos comisiones siempre.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {TRENDING_PRODUCTS.map(({ slug, emoji, name, category, trend, searches, price }) => (
              <Link key={slug} href={`/p/${slug}`}
                style={{ display: 'block', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, textDecoration: 'none', transition: 'border-color 0.2s, transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0066FF'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>{emoji}</div>
                <div style={{ display: 'inline-block', background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.25)', borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#60A5FA', marginBottom: 8 }}>
                  🔥 {trend}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>{name}</h3>
                <p style={{ fontSize: 12, color: 'rgba(248,250,252,0.35)', marginBottom: 10 }}>{category} · {searches} búsquedas</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#00FF88' }}>Desde {price}</span>
                  <span style={{ fontSize: 12, color: '#0066FF' }}>Ver →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══ SECCIÓN 5 — CALCULADORA RÁPIDA ════════════════════════════════ */}
        <section style={{ padding: '80px 24px', background: 'rgba(124,58,237,0.05)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <p style={{ color: '#7C3AED', fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>Sin sorpresas</p>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 12 }}>¿Cuánto me cuesta importar?</h2>
            <p style={{ color: 'rgba(248,250,252,0.5)', marginBottom: 40, fontSize: 15 }}>
              Calcula el costo total puesto en tu ciudad: arancel, IVA, DTA, agente aduanal y flete interno.
            </p>

            {/* Widget mini — Caso lentes */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 20, padding: 32, textAlign: 'left', marginBottom: 24 }}>
              <div style={{ color: '#aaa', fontSize: 14, marginBottom: 16 }}>Ejemplo real — Lentes de sol mayoreo:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Producto',  value: '500 lentes de sol' },
                  { label: 'Precio',    value: '$3.50 USD/pieza' },
                  { label: 'Origen',    value: 'Guangzhou, China' },
                  { label: 'Destino',   value: 'Culiacán, Sinaloa' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>{label}</div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 200, padding: '16px 20px', background: 'linear-gradient(135deg, rgba(0,102,255,0.15), rgba(124,58,237,0.15))', border: '1px solid rgba(0,102,255,0.3)', borderRadius: 12 }}>
                  <div style={{ color: '#7ab4ff', fontSize: 13 }}>Costo total estimado</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>$75,411 MXN</div>
                  <div style={{ color: '#00FF88', fontSize: 14 }}>$150.82 / pieza · Margen ~130% a $350 MXN</div>
                </div>
                <Link href="/calculadora?product=Lentes+de+Sol&price=3.50&qty=500&dest=Culiacán"
                  style={{ padding: '14px 24px', borderRadius: 12, background: '#0066FF', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                  Ver desglose completo →
                </Link>
              </div>
            </div>

            <Link href="/calculadora"
              style={{ display: 'inline-block', padding: '14px 32px', borderRadius: 14, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#C4B5FD', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
              🧮 Abrir calculadora completa →
            </Link>
          </div>
        </section>

        {/* ══ SECCIÓN 6 — TESTIMONIOS ════════════════════════════════════════ */}
        <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: '#0066FF', fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>Testimonios</p>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-1px' }}>
              &ldquo;Compramos a través de TrendPilot y sabíamos exactamente qué iba a llegar&rdquo;
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                  {Array.from({ length: t.stars }).map((_, i) => <span key={i} style={{ color: '#FFB800' }}>★</span>)}
                </div>
                <p style={{ fontSize: 14, color: 'rgba(248,250,252,0.7)', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#0066FF,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)' }}>{t.business}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 24px 32px', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'space-between', marginBottom: 36 }}>
              <div style={{ minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#0066FF,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={15} color="#fff" />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>TrendPilot</span>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.4)', lineHeight: 1.6, maxWidth: 220 }}>
                  Importa desde China con total confianza. Análisis IA, calculadora de impuestos y seguimiento 24/7.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(248,250,252,0.3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Importadores</p>
                  {[['Buscar Proveedor', '/buscar'], ['Calculadora', '/calculadora'], ['Lentes de Sol (ejemplo)', '/buscar?q=lentes+de+sol+mayoreo']].map(([l, h]) => (
                    <div key={l} style={{ marginBottom: 8 }}><Link href={h} style={{ fontSize: 14, color: 'rgba(248,250,252,0.5)', textDecoration: 'none' }}>{l}</Link></div>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(248,250,252,0.3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Vendedores</p>
                  {[['Panel de control', '/login'], ['Registro', '/register']].map(([l, h]) => (
                    <div key={l} style={{ marginBottom: 8 }}><Link href={h} style={{ fontSize: 14, color: 'rgba(248,250,252,0.5)', textDecoration: 'none' }}>{l}</Link></div>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(248,250,252,0.3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Contacto</p>
                  <p style={{ fontSize: 14, color: 'rgba(248,250,252,0.5)', marginBottom: 6 }}>contacto@automatia.mx</p>
                  <p style={{ fontSize: 14, color: 'rgba(248,250,252,0.5)' }}>WhatsApp: +52 667 503 9081</p>
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.25)' }}>© 2026 TrendPilot — Automatia Negocios Inteligentes</p>
              <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.25)' }}>Hecho en México 🇲🇽</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}

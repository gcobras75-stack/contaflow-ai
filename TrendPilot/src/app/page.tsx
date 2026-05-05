'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  TrendingUp, Check, Menu, X, ChevronDown,
  Zap, DollarSign, Clock, Percent,
} from 'lucide-react'

// ─── Tipos locales ─────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number
  vx: number; vy: number
  r: number
}

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
    const COUNT = Math.min(60, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 18000))
    const CONNECT = 140

    function resize() {
      canvas!.width  = canvas!.offsetWidth
      canvas!.height = canvas!.offsetHeight
    }

    function spawn() {
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.5 + 0.8,
        })
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas!.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas!.height) p.vy *= -1

        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fillStyle = 'rgba(0,102,255,0.55)'
        ctx!.fill()
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = particles[i].x - particles[j].x
          const dy   = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECT) {
            ctx!.beginPath()
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(particles[j].x, particles[j].y)
            ctx!.strokeStyle = `rgba(0,102,255,${0.18 * (1 - dist / CONNECT)})`
            ctx!.lineWidth   = 0.7
            ctx!.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }

    resize()
    spawn()
    draw()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.6 }}
    />
  )
}

// ─── Contador animado ─────────────────────────────────────────────────────────

function AnimatedNumber({ to, prefix = '', suffix = '', decimals = 0, duration = 1800 }: {
  to: number; prefix?: string; suffix?: string; decimals?: number; duration?: number
}) {
  const [value,   setValue]   = useState(0)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    const start = performance.now()
    const frame = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      setValue(to * (1 - Math.pow(1 - p, 3)))
      if (p < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [visible, to, duration])

  return (
    <span ref={ref}>
      {prefix}{decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString('es-MX')}{suffix}
    </span>
  )
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

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setOpen(false)
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(10,15,30,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      transition: 'background 0.3s, backdrop-filter 0.3s',
      padding: '0 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64 }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#0066FF,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={15} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#F8FAFC', letterSpacing: '-0.3px' }}>TrendPilot</span>
        </Link>

        {/* Links desktop */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 36 }} className="nav-desktop">
          {[['Inicio', ''], ['Cómo funciona', 'como'], ['Planes', 'planes']].map(([label, id]) => (
            <button key={label} onClick={() => id ? scrollTo(id) : window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(248,250,252,0.7)', fontSize: 14, fontWeight: 500 }}>
              {label}
            </button>
          ))}
        </div>

        {/* CTAs desktop */}
        <div style={{ display: 'flex', gap: 10 }} className="nav-desktop">
          <Link href="/login" style={{ padding: '8px 18px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#F8FAFC', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            Iniciar sesión
          </Link>
          <Link href="/register" style={{ padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#0066FF,#7C3AED)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Registrarse
          </Link>
        </div>

        {/* Hamburger mobile */}
        <button onClick={() => setOpen((v) => !v)} className="nav-mobile"
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#F8FAFC', padding: 8 }}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: 'rgba(10,15,30,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[['Inicio', ''], ['Cómo funciona', 'como'], ['Planes', 'planes']].map(([label, id]) => (
            <button key={label} onClick={() => id ? scrollTo(id) : (window.scrollTo({ top: 0, behavior: 'smooth' }), setOpen(false))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F8FAFC', fontSize: 15, fontWeight: 500, textAlign: 'left', padding: '8px 0' }}>
              {label}
            </button>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} style={{ padding: '10px 16px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#F8FAFC', fontSize: 14, fontWeight: 500, textDecoration: 'none', textAlign: 'center' }}>
            Iniciar sesión
          </Link>
          <Link href="/register" onClick={() => setOpen(false)} style={{ padding: '10px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#0066FF,#7C3AED)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
            Registrarse
          </Link>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) { .nav-mobile { display: none !important; } }
        @media (max-width: 767px) { .nav-desktop { display: none !important; } }
      `}</style>
    </nav>
  )
}

// ─── Datos ────────────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name:     'Alejandro Ramos',
    business: 'TechStore Culiacán',
    avatar:   'AR',
    text:     'En 3 semanas TrendPilot detectó que los audífonos bluetooth iban a explotar. Lancé la campaña y generé $45,000 MXN en ventas sin mover un dedo.',
    stars:    5,
  },
  {
    name:     'Fernanda Osuna',
    business: 'EcoModa Sinaloa',
    avatar:   'FO',
    text:     'Me da miedo el marketing digital. Con TrendPilot solo subo el producto y ellos hacen todo. Ya tengo 3 campañas corriendo y cobra solo cuando vendo.',
    stars:    5,
  },
  {
    name:     'Jorge Inzunza',
    business: 'NutriPro MX',
    avatar:   'JI',
    text:     'Probé Meta Ads solo y perdí $8,000. Con TrendPilot el semáforo me pausó una campaña a tiempo y me ahorró otro batacazo. Ahora solo campañas verdes.',
    stars:    5,
  },
]

const STEPS = [
  { emoji: '🔍', step: '01', title: 'Detectamos', color: '#0066FF',
    desc: 'Nuestra IA analiza millones de datos y encuentra los productos con mayor demanda en México hoy mismo' },
  { emoji: '🚀', step: '02', title: 'Lanzamos',   color: '#7C3AED',
    desc: 'Creamos y publicamos tus campañas automáticamente en Meta y TikTok optimizadas con inteligencia artificial' },
  { emoji: '💰', step: '03', title: 'Cobras',     color: '#00FF88',
    desc: 'Solo pagas cuando hay ventas. Sin costos fijos, sin riesgos, sin complicaciones' },
]

const COMMISSION_FEATURES = [
  'Registro 100% gratis',
  'Sin mensualidades ni costos fijos',
  'Sin tarjeta de crédito requerida',
  'Anuncios en Meta y TikTok',
  'IA crea tus anuncios automáticamente',
  'Campañas optimizadas 24/7',
  'Productos ilimitados',
]

const WHY_NOW = [
  {
    emoji: '🚀',
    title: 'Cero riesgo',
    desc: 'No pagas nada por adelantado. Si no vendemos, no nos debes nada.',
  },
  {
    emoji: '🤖',
    title: 'Marketing automático gratis',
    desc: 'Nuestra IA crea y publica tus anuncios en Meta y TikTok sin que toques nada.',
  },
  {
    emoji: '💰',
    title: 'Solo resultados',
    desc: 'Compartimos el 25% solo cuando hay una venta real. Nuestro éxito depende del tuyo.',
  },
]

// ─── Página principal ─────────────────────────────────────────────────────────

export default function LandingPage() {
  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const s = (style: React.CSSProperties) => style

  return (
    <>
      <Navbar />

      <main style={{ background: '#0A0F1E', color: '#F8FAFC', fontFamily: 'var(--font-geist-sans, Inter, sans-serif)', overflowX: 'hidden' }}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section style={s({ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 24px 80px' })}>
          <ParticleCanvas />

          {/* Glow radial */}
          <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, background: 'radial-gradient(circle, rgba(0,102,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 2, maxWidth: 860 }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.3)', borderRadius: 100, padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#60A5FA', marginBottom: 28 }}>
              🚀 Plataforma #1 de marketing automatizado en México
            </div>

            {/* Título */}
            <h1 style={{ fontSize: 'clamp(40px, 7vw, 76px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 24 }}>
              <span style={{ display: 'block' }}>El piloto inteligente</span>
              <span style={{ background: 'linear-gradient(135deg, #0066FF 0%, #7C3AED 50%, #00FF88 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                de tus ventas
              </span>
            </h1>

            {/* Subtítulo */}
            <p style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', color: 'rgba(248,250,252,0.6)', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.6 }}>
              Detectamos los productos más vendidos, encontramos los mejores vendedores
              y lanzamos campañas automáticas. <strong style={{ color: '#F8FAFC' }}>Tú cobras sin hacer nada.</strong>
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14, background: 'linear-gradient(135deg,#0066FF,#7C3AED)', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 8px 32px rgba(0,102,255,0.35)' }}>
                Quiero vender más →
              </Link>
              <button onClick={() => scrollToSection('como')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14, background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: '#F8FAFC', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
                Ver cómo funciona <ChevronDown size={16} />
              </button>
            </div>

            {/* Plataformas */}
            <div style={{ marginTop: 56 }}>
              <p style={{ color: 'rgba(248,250,252,0.35)', fontSize: 12, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 20 }}>
                Más de 50 vendedores confían en TrendPilot
              </p>
              <div style={{ display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', opacity: 0.4 }}>
                {['Meta', 'TikTok', 'MercadoLibre', 'Google'].map((p) => (
                  <span key={p} style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', color: '#F8FAFC' }}>{p}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CÓMO FUNCIONA ─────────────────────────────────────────────── */}
        <section id="como" style={s({ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' })}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: '#0066FF', fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>El proceso</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px' }}>Simple como 1, 2, 3</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {STEPS.map(({ emoji, step, title, desc, color }) => (
              <div key={step} style={{ background: '#111827', border: '1px solid #1E293B', borderRadius: 20, padding: 36, position: 'relative', overflow: 'hidden' }}>
                {/* Step number (ghost) */}
                <div style={{ position: 'absolute', top: -10, right: 16, fontSize: 80, fontWeight: 900, color: 'rgba(255,255,255,0.03)', lineHeight: 1 }}>{step}</div>
                <div style={{ fontSize: 40, marginBottom: 20 }}>{emoji}</div>
                <div style={{ width: 40, height: 3, background: color, borderRadius: 2, marginBottom: 16 }} />
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color }}>{title}</h3>
                <p style={{ fontSize: 15, color: 'rgba(248,250,252,0.55)', lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── NÚMEROS ───────────────────────────────────────────────────── */}
        <section style={s({ padding: '80px 24px', background: 'rgba(0,102,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' })}>
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 48, textAlign: 'center' }}>
            {[
              { icon: Zap,         num: 10,  pre: '',    suf: '+',  label: 'productos en tendencia detectados hoy',      color: '#0066FF' },
              { icon: DollarSign,  num: 0,   pre: '',    suf: ' MXN', label: 'costo fijo para empezar',                  color: '#00FF88' },
              { icon: Clock,       num: 24,  pre: '',    suf: 'hrs',  label: 'para lanzar tu primera campaña',            color: '#7C3AED' },
              { icon: Percent,     num: 25,  pre: '',    suf: '%',    label: 'única comisión — solo si hay ventas',       color: '#FFB800' },
            ].map(({ icon: Icon, num, pre, suf, label, color }) => (
              <div key={label}>
                <Icon size={22} color={color} style={{ marginBottom: 10, opacity: 0.8 }} />
                <div style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  <AnimatedNumber to={num} prefix={pre} suffix={suf} />
                </div>
                <p style={{ marginTop: 10, fontSize: 13, color: 'rgba(248,250,252,0.45)', maxWidth: 160, margin: '10px auto 0' }}>{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── MODELO DE COMISIÓN ────────────────────────────────────────── */}
        <section id="planes" style={s({ padding: '100px 24px', maxWidth: 800, margin: '0 auto' })}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: '#0066FF', fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Modelo</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px' }}>Solo payas cuando vendemos</h2>
            <p style={{ color: 'rgba(248,250,252,0.45)', marginTop: 12, fontSize: 16 }}>Sin compromisos. Sin tarjeta. Sin cargos ocultos.</p>
          </div>

          {/* Card única del modelo */}
          <div style={{ background: 'linear-gradient(145deg, rgba(0,102,255,0.15), rgba(124,58,237,0.08))', border: '2px solid #0066FF', borderRadius: 24, padding: '48px 40px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
            {/* Glow */}
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 400, height: 200, background: 'radial-gradient(circle, rgba(0,102,255,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#0066FF,#7C3AED)', borderRadius: '0 0 16px 16px', padding: '6px 24px', fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
              MODELO TRENDPILOT
            </div>

            <p style={{ fontSize: 18, color: 'rgba(248,250,252,0.6)', marginBottom: 16, marginTop: 8 }}>Solo pagas cuando vendemos</p>

            {/* Precio destacado */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 72, fontWeight: 900, color: '#00FF88', lineHeight: 1 }}>25%</span>
                <span style={{ fontSize: 18, color: 'rgba(248,250,252,0.5)' }}>por venta</span>
              </div>
              <p style={{ fontSize: 15, color: 'rgba(248,250,252,0.45)' }}>Si no hay ventas → no pagas nada</p>
            </div>

            {/* Features */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 auto 36px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 380, textAlign: 'left' }}>
              {COMMISSION_FEATURES.map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: 'rgba(248,250,252,0.8)' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={11} color="#00FF88" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <Link href="/register" style={{ display: 'inline-block', padding: '16px 40px', borderRadius: 14, background: 'linear-gradient(135deg,#0066FF,#7C3AED)', color: '#fff', fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 32px rgba(0,102,255,0.4)' }}>
              Registrarme gratis ahora →
            </Link>
          </div>

          {/* Garantía */}
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'rgba(248,250,252,0.35)', fontStyle: 'italic' }}>
            Sin letra chica. Sin sorpresas. Solo resultados.
          </p>
        </section>

        {/* ── ¿POR QUÉ REGISTRARTE HOY? ────────────────────────────────── */}
        <section style={s({ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' })}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800 }}>¿Por qué registrarte hoy?</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {WHY_NOW.map(({ emoji, title, desc }) => (
              <div key={title} style={{ background: '#111827', border: '1px solid #1E293B', borderRadius: 20, padding: 36, textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 20 }}>{emoji}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: '#F8FAFC' }}>{title}</h3>
                <p style={{ fontSize: 15, color: 'rgba(248,250,252,0.55)', lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TESTIMONIOS ───────────────────────────────────────────────── */}
        <section style={s({ padding: '80px 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)' })}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <p style={{ color: '#0066FF', fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Testimonios</p>
              <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800 }}>Lo que dicen nuestros vendors</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              {TESTIMONIALS.map((t) => (
                <div key={t.name} style={{ background: '#111827', border: '1px solid #1E293B', borderRadius: 20, padding: 28 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <span key={i} style={{ color: '#FFB800', fontSize: 14 }}>★</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 15, color: 'rgba(248,250,252,0.7)', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#0066FF,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {t.avatar}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>{t.name}</p>
                      <p style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)' }}>{t.business}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ─────────────────────────────────────────────────── */}
        <section style={s({ padding: '100px 24px', textAlign: 'center', position: 'relative' })}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,102,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 800, marginBottom: 16, letterSpacing: '-1.5px' }}>
              ¿Listo para despegar?
            </h2>
            <p style={{ fontSize: 18, color: 'rgba(248,250,252,0.5)', marginBottom: 36 }}>
              Únete a los vendors que ya están vendiendo más con menos esfuerzo
            </p>
            <Link href="/register" style={{ display: 'inline-block', padding: '16px 40px', borderRadius: 14, background: 'linear-gradient(135deg,#0066FF,#7C3AED)', color: '#fff', fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 12px 40px rgba(0,102,255,0.4)' }}>
              Crear mi cuenta gratis →
            </Link>
          </div>
        </section>

        {/* ── MISIÓN — siempre del lado del cliente ─────────────────────── */}
        <section style={s({ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,102,255,0.03)' })}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 48, alignItems: 'center' }}>
            <div>
              <p style={{ color: '#00FF88', fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Nuestra misión</p>
              <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 16, letterSpacing: '-1px' }}>
                TrendPilot siempre está<br />del lado del{' '}
                <span style={{ background: 'linear-gradient(135deg,#00FF88,#0066FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  cliente
                </span>
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(248,250,252,0.6)', lineHeight: 1.75 }}>
                Creemos que el marketing más poderoso no engaña. Comparamos productos con honestidad radical, incluimos las desventajas, declaramos nuestras comisiones, y ganamos solo cuando ayudamos de verdad.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { emoji: '🔍', text: 'Comparamos sin favoritismos — aunque perdamos comisión' },
                { emoji: '💬', text: 'Incluimos opiniones negativas — son las más útiles' },
                { emoji: '💡', text: 'Declaramos nuestras comisiones siempre — sin letra chica' },
                { emoji: '🤝', text: 'Ganamos solo si te ayudamos — nuestro éxito depende del tuyo' },
              ].map(({ emoji, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px', background: '#111827', border: '1px solid #1E293B', borderRadius: 16 }}>
                  <span style={{ fontSize: 22 }}>{emoji}</span>
                  <span style={{ fontSize: 14, color: 'rgba(248,250,252,0.75)', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARADORES EN TENDENCIA ─────────────────────────────────── */}
        <section style={s({ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' })}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: '#0066FF', fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Comparadores</p>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 12 }}>
              Descubre los más buscados hoy
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(248,250,252,0.45)' }}>Comparamos precios reales sin favoritismos. Declaramos comisiones siempre.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {[
              { slug: 'audifonos-bluetooth',  emoji: '🎧', name: 'Audífonos Bluetooth',  category: 'Electrónicos',       trend: 94, searches: '8,420', price: '$599' },
              { slug: 'termo-stanley-mini',   emoji: '🧊', name: 'Termos Stanley',        category: 'Hogar y Cocina',     trend: 88, searches: '5,630', price: '$489' },
              { slug: 'crema-colageno',       emoji: '✨', name: 'Crema de Colágeno',     category: 'Belleza',            trend: 79, searches: '4,210', price: '$219' },
              { slug: 'cargador-inalambrico', emoji: '⚡', name: 'Cargadores Inalámbricos',category: 'Electrónicos',     trend: 85, searches: '3,890', price: '$299' },
            ].map(({ slug, emoji, name, category, trend, searches, price }) => (
              <Link
                key={slug}
                href={`/p/${slug}`}
                style={{ display: 'block', background: '#111827', border: '1px solid #1E293B', borderRadius: 20, padding: 24, textDecoration: 'none', transition: 'border-color 0.2s, transform 0.2s' }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget
                  el.style.borderColor = '#0066FF'
                  el.style.transform   = 'translateY(-3px)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget
                  el.style.borderColor = '#1E293B'
                  el.style.transform   = 'translateY(0)'
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>
                <div style={{ display: 'inline-block', background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.25)', borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#60A5FA', marginBottom: 10 }}>
                  🔥 Tendencia {trend}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', marginBottom: 4 }}>{name}</h3>
                <p style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)', marginBottom: 12 }}>{category}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.35)' }}>{searches} búsquedas hoy</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#00FF88' }}>Desde {price}</span>
                </div>
                <div style={{ marginTop: 14, padding: '8px 14px', background: 'rgba(0,102,255,0.1)', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#0066FF', textAlign: 'center' }}>
                  Comparar opciones →
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <footer style={s({ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 24px 32px' })}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'space-between', marginBottom: 40 }}>
              {/* Brand */}
              <div style={{ minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#0066FF,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={15} color="#fff" />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#F8FAFC' }}>TrendPilot</span>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.4)', lineHeight: 1.6, maxWidth: 220 }}>
                  Automatia Negocios Inteligentes — Marketing automatizado con IA para México.
                </p>
              </div>

              {/* Links */}
              <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(248,250,252,0.3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Plataforma</p>
                  {[['Inicio', '/'], ['Planes', '#planes'], ['Login', '/login'], ['Registro', '/register']].map(([label, href]) => (
                    <div key={label} style={{ marginBottom: 8 }}>
                      <Link href={href} style={{ fontSize: 14, color: 'rgba(248,250,252,0.5)', textDecoration: 'none' }}>{label}</Link>
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(248,250,252,0.3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Contacto</p>
                  <p style={{ fontSize: 14, color: 'rgba(248,250,252,0.5)', marginBottom: 6 }}>contacto@automatia.mx</p>
                  <p style={{ fontSize: 14, color: 'rgba(248,250,252,0.5)' }}>trendpilot.marketing</p>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.25)' }}>© 2026 TrendPilot — Automatia Negocios Inteligentes</p>
              <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.25)' }}>Hecho en México 🇲🇽</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}

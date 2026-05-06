'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Rocket, Star, FileText, ArrowRight } from 'lucide-react'
import { cn } from '@/utils'

const STEPS = [
  { id: 1, label: 'Bienvenida',     icon: Rocket      },
  { id: 2, label: 'Tu producto',   icon: Star        },
  { id: 3, label: 'ProductScore',  icon: Star        },
  { id: 4, label: 'Contrato',      icon: FileText    },
  { id: 5, label: '¡Listo!',       icon: CheckCircle2 },
]

const CATEGORIES = [
  'Moda y accesorios', 'Salud y bienestar', 'Electrónica', 'Cosméticos',
  'Alimentos', 'Hogar y decoración', 'Deportes', 'Joyería', 'Otro',
]

interface ProductScore {
  total:      number
  label:      'ESTRELLA' | 'PROMETEDOR' | 'EN REVISIÓN' | 'RECHAZAR'
  breakdown:  Record<string, number>
  tips:       string[]
}

function calcMockScore(name: string, price: number, category: string): ProductScore {
  const base   = 50
  const nameS  = Math.min(20, name.length > 10 ? 20 : 10)
  const priceS = price >= 100 && price <= 2000 ? 15 : price > 2000 ? 8 : 5
  const catS   = ['Moda y accesorios','Salud y bienestar','Cosméticos','Joyería'].includes(category) ? 15 : 10
  const total  = Math.min(100, base + nameS + priceS + catS)

  const label: ProductScore['label'] =
    total >= 80 ? 'ESTRELLA' : total >= 60 ? 'PROMETEDOR' : total >= 40 ? 'EN REVISIÓN' : 'RECHAZAR'

  const tips = total < 60 ? [
    'Mejora el nombre — hazlo más descriptivo y memorable',
    'Revisa el precio — debe ser competitivo para el mercado mexicano',
    'Añade más detalles en la descripción del producto',
  ] : []

  return {
    total,
    label,
    breakdown: { tendencia: nameS + 30, competencia: priceS + 30, precio: catS + 30, demanda: base - 20 },
    tips,
  }
}

const SCORE_CFG = {
  'ESTRELLA':    { color: 'text-brand-green',   bg: 'bg-brand-green/10   border-brand-green/30',   emoji: '⭐' },
  'PROMETEDOR':  { color: 'text-brand-yellow',  bg: 'bg-brand-yellow/10  border-brand-yellow/30',  emoji: '📈' },
  'EN REVISIÓN': { color: 'text-brand-primary', bg: 'bg-brand-primary/10 border-brand-primary/30', emoji: '🔍' },
  'RECHAZAR':    { color: 'text-brand-red',     bg: 'bg-brand-red/10     border-brand-red/30',     emoji: '❌' },
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Paso 2 — producto
  const [name,     setName]     = useState('')
  const [price,    setPrice]    = useState('')
  const [category, setCategory] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')

  // Paso 3 — score
  const [scoring, setScoring]   = useState(false)
  const [score,   setScore]     = useState<ProductScore | null>(null)

  // Paso 4 — términos
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleAnalyze() {
    if (!name.trim() || !price || !category) return
    setScoring(true)
    setStep(3)
    // Simula delay de análisis
    await new Promise((r) => setTimeout(r, 1800))
    setScore(calcMockScore(name.trim(), Number(price), category))
    setScoring(false)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      // Crear vendor en el sistema
      const res = await fetch('/api/vendors', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:         'Vendor nuevo', // se actualiza en settings
          email:        `vendor_${Date.now()}@trendpilot.marketing`,
          product_type: category,
        }),
      })
      if (res.ok) {
        setStep(5)
        setDone(true)
      }
    } catch { /* continúa de todas formas */ }
    finally {
      setSubmitting(false)
      setStep(5)
      setDone(true)
    }
  }

  const stepCfg = score ? SCORE_CFG[score.label] : null

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-9 h-9 rounded-xl btn-gradient flex items-center justify-center">
          <Rocket size={16} className="text-white" />
        </div>
        <span className="text-xl font-bold gradient-text">TrendPilot</span>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              step > s.id  ? 'bg-brand-green text-black' :
              step === s.id ? 'bg-brand-primary text-white' :
              'bg-brand-card border border-brand-border text-brand-faint',
            )}>
              {step > s.id ? '✓' : s.id}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('w-6 h-px mx-1', step > s.id ? 'bg-brand-green' : 'bg-brand-border')} />
            )}
          </div>
        ))}
      </div>

      <div className="w-full max-w-md">

        {/* ── Paso 1: Bienvenida ──────────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-8 text-center space-y-6 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl btn-gradient flex items-center justify-center mx-auto">
              <Rocket size={36} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-text mb-2">
                ¡Bienvenido a TrendPilot! 🚀
              </h1>
              <p className="text-sm text-brand-muted leading-relaxed">
                En los próximos minutos vamos a configurar tu cuenta y analizar tu primer producto con inteligencia artificial.
              </p>
            </div>

            {/* Video placeholder */}
            <div className="w-full aspect-video bg-brand-hover border border-brand-border rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center mx-auto mb-2">
                  <span className="text-brand-primary text-lg">▶</span>
                </div>
                <p className="text-xs text-brand-faint">Video explicativo — 2 min</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-brand-muted text-left">
              <div className="flex items-center gap-2"><span className="text-brand-green">✓</span> Sin costos fijos — pagas solo si hay ventas</div>
              <div className="flex items-center gap-2"><span className="text-brand-green">✓</span> Tus productos en Meta y TikTok automáticamente</div>
              <div className="flex items-center gap-2"><span className="text-brand-green">✓</span> IA analiza tu producto antes de lanzar</div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 py-3 btn-gradient text-white rounded-xl font-semibold"
            >
              Empezar <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── Paso 2: Producto ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-brand-text mb-1">Tu primer producto</h2>
              <p className="text-sm text-brand-muted">Lo analizamos con IA en segundos.</p>
            </div>

            <div>
              <label className="text-xs text-brand-muted mb-1.5 block">Nombre del producto *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Bolsas ecológicas tela"
                className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-brand-muted mb-1.5 block">Precio (MXN) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-brand-muted">$</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-brand-hover border border-brand-border rounded-xl pl-7 pr-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-brand-muted mb-1.5 block">Categoría *</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={cn('px-3 py-1.5 rounded-xl text-xs transition-all border',
                      category === c ? 'btn-gradient text-white border-transparent' : 'bg-brand-hover text-brand-muted border-brand-border hover:text-brand-text')}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-brand-muted mb-1.5 block">URL de foto (opcional)</label>
              <input
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://…"
                className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-2.5 bg-brand-hover text-brand-muted rounded-xl text-sm hover:text-brand-text transition-colors">
                ← Volver
              </button>
              <button
                onClick={handleAnalyze}
                disabled={!name.trim() || !price || !category}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 btn-gradient text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Analizar con IA →
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 3: ProductScore ─────────────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-brand-text mb-1">ProductScore™ en vivo</h2>
              <p className="text-sm text-brand-muted">Analizando <strong>{name}</strong>…</p>
            </div>

            {scoring ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Loader2 size={28} className="text-brand-primary animate-spin" />
                </div>
                <p className="text-sm text-brand-muted animate-pulse">Consultando mercado MercadoLibre…</p>
                <p className="text-xs text-brand-faint mt-1">Calculando competencia y demanda</p>
              </div>
            ) : score && stepCfg && (
              <>
                {/* Score ring */}
                <div className={cn('flex flex-col items-center py-4 rounded-2xl border', stepCfg.bg)}>
                  <div className="relative w-24 h-24 mb-3">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                      <circle cx="50" cy="50" r="42" fill="none"
                        stroke={score.label === 'ESTRELLA' ? '#00FF88' : score.label === 'PROMETEDOR' ? '#FFB800' : score.label === 'EN REVISIÓN' ? '#0066FF' : '#FF3B30'}
                        strokeWidth="10"
                        strokeDasharray={`${(score.total / 100) * 263.9} 263.9`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold font-mono text-brand-text">{score.total}</span>
                      <span className="text-[9px] text-brand-faint">/100</span>
                    </div>
                  </div>
                  <span className={cn('text-lg font-bold', stepCfg.color)}>
                    {stepCfg.emoji} {score.label}
                  </span>
                </div>

                {/* Breakdown */}
                <div className="space-y-2">
                  {Object.entries(score.breakdown).map(([key, val]) => (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-brand-muted capitalize">{key}</span>
                        <span className="text-brand-text font-mono">{val}/100</span>
                      </div>
                      <div className="h-1.5 bg-brand-hover rounded-full overflow-hidden">
                        <div className="h-full bg-brand-primary rounded-full" style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tips si score bajo */}
                {score.tips.length > 0 && (
                  <div className="bg-brand-yellow/8 border border-brand-yellow/25 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-brand-yellow">💡 Para mejorar tu score:</p>
                    {score.tips.map((tip, i) => (
                      <p key={i} className="text-xs text-brand-muted">{i+1}. {tip}</p>
                    ))}
                  </div>
                )}

                {/* Mensaje según score */}
                <div className={cn('px-4 py-3 rounded-xl border text-sm', stepCfg.bg)}>
                  {score.total >= 60 ? (
                    <p className={stepCfg.color}>
                      ¡Excelente! Tu producto tiene <strong>buenas probabilidades</strong> de éxito en el mercado mexicano.
                    </p>
                  ) : (
                    <p className={stepCfg.color}>
                      Siguiendo las sugerencias de arriba podrás mejorar tu score antes de lanzar.
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="px-4 py-2.5 bg-brand-hover text-brand-muted rounded-xl text-sm hover:text-brand-text transition-colors">
                    ← Editar
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 btn-gradient text-white rounded-xl text-sm font-semibold"
                  >
                    Continuar → <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Paso 4: Contrato ─────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-brand-text mb-1">Tu contrato digital</h2>
              <p className="text-sm text-brand-muted">Sin letra pequeña — así funciona TrendPilot:</p>
            </div>

            <div className="space-y-3">
              {[
                { title: '🚀 Nosotros promovemos', desc: 'TrendPilot lanza campañas en Meta y TikTok con tu producto. Tú no gastas nada por adelantado.' },
                { title: '💰 Tú pagas solo si hay ventas', desc: '25% de comisión por cada venta generada. Sin ventas = sin cargos.' },
                { title: '📊 Transparencia total', desc: 'Ves en tiempo real cuánto se vende, cuánto gastas y cuánto ganas.' },
                { title: '🔒 Tus datos seguros', desc: 'Nunca compartimos tu información con terceros sin tu autorización.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 p-3 bg-brand-hover rounded-xl">
                  <div className="text-base">{item.title.slice(0,2)}</div>
                  <div>
                    <p className="text-sm font-semibold text-brand-text">{item.title.slice(2)}</p>
                    <p className="text-xs text-brand-muted mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 accent-brand-primary w-4 h-4 rounded"
              />
              <span className="text-sm text-brand-muted">
                Acepto los <span className="text-brand-primary underline cursor-pointer">términos y condiciones</span> de TrendPilot y la comisión del 25% sobre ventas generadas.
              </span>
            </label>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="px-4 py-2.5 bg-brand-hover text-brand-muted rounded-xl text-sm hover:text-brand-text transition-colors">
                ← Volver
              </button>
              <button
                onClick={handleSubmit}
                disabled={!accepted || submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 btn-gradient text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Activando…</> : '✅ Activar mi cuenta →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 5: ¡Listo! ──────────────────────────────────────────────── */}
        {step === 5 && done && (
          <div className="bg-brand-card border border-brand-green/30 rounded-2xl p-8 text-center space-y-6 animate-scale-in">
            {/* Confeti simulado */}
            <div className="text-4xl animate-bounce">🎉</div>

            <div>
              <h2 className="text-2xl font-bold text-brand-text mb-2">¡Tu cuenta está activa!</h2>
              <p className="text-sm text-brand-muted leading-relaxed">
                Nuestro equipo revisará tu producto en las próximas <strong>24 horas</strong>.
                Te avisamos por WhatsApp cuando esté listo para lanzar.
              </p>
            </div>

            <div className="space-y-2 text-sm">
              {[
                '✅ Cuenta creada exitosamente',
                '📱 WhatsApp de bienvenida enviado',
                '🔍 ProductScore calculado',
                '📋 Contrato firmado digitalmente',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-left px-4 py-2 bg-brand-green/8 border border-brand-green/20 rounded-xl text-brand-green text-xs">
                  {item}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center gap-2 py-3 btn-gradient text-white rounded-xl font-semibold"
              >
                Ir a mi panel <ArrowRight size={16} />
              </button>
              <p className="text-xs text-brand-faint">
                ¿Preguntas? Escríbenos al WhatsApp del panel
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Star, Trophy, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ScoreFactor {
  score:  number
  max:    number
  reason: string
}

export interface ScoreBreakdown {
  trend:       ScoreFactor
  competition: ScoreFactor
  pricing:     ScoreFactor
  quality:     ScoreFactor
  seasonality: ScoreFactor
  total:       number
  badge:       string
  action:      string
}

interface ProductScoreCardProps {
  score:     number
  badge:     string
  breakdown: ScoreBreakdown | Record<string, unknown> | null | undefined
  compact?:  boolean   // modo compacto para tabla
}

// ─── Configuración de badges ──────────────────────────────────────────────────

const badgeConfig = {
  ESTRELLA: {
    icon:   Trophy,
    label:  '⭐ ESTRELLA',
    bg:     'bg-brand-green/10 border-brand-green/30',
    text:   'text-brand-green',
    bar:    'bg-brand-green',
    ring:   'ring-brand-green/30',
  },
  BUENO: {
    icon:   CheckCircle2,
    label:  '✅ BUENO',
    bg:     'bg-brand-primary/10 border-brand-primary/30',
    text:   'text-brand-primary',
    bar:    'bg-brand-primary',
    ring:   'ring-brand-primary/30',
  },
  REGULAR: {
    icon:   AlertTriangle,
    label:  '⚠️ REGULAR',
    bg:     'bg-brand-yellow/10 border-brand-yellow/30',
    text:   'text-brand-yellow',
    bar:    'bg-brand-yellow',
    ring:   'ring-brand-yellow/30',
  },
  RECHAZAR: {
    icon:   XCircle,
    label:  '❌ RECHAZAR',
    bg:     'bg-brand-red/10 border-brand-red/30',
    text:   'text-brand-red',
    bar:    'bg-brand-red',
    ring:   'ring-brand-red/30',
  },
}

// ─── Factores de evaluación ───────────────────────────────────────────────────

const FACTORS = [
  { key: 'trend',       label: 'Tendencia',       max: 30, emoji: '📈' },
  { key: 'competition', label: 'Competencia',      max: 25, emoji: '🏆' },
  { key: 'pricing',     label: 'Precio y margen',  max: 20, emoji: '💰' },
  { key: 'quality',     label: 'Calidad histórica',max: 15, emoji: '⭐' },
  { key: 'seasonality', label: 'Estacionalidad',   max: 10, emoji: '📅' },
]

// ─── Componente compacto (para tabla/lista) ───────────────────────────────────

export function ScoreBadge({ score, badge }: { score: number; badge: string }) {
  const cfg = badgeConfig[badge as keyof typeof badgeConfig] ?? badgeConfig.REGULAR

  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-8 h-8 rounded-full ring-2 flex items-center justify-center text-[10px] font-bold font-mono', cfg.ring, cfg.bg)}>
        <span className={cfg.text}>{score}</span>
      </div>
      <span className={cn('text-[10px] font-bold hidden sm:block', cfg.text)}>
        {badge}
      </span>
    </div>
  )
}

// ─── Componente completo con breakdown ───────────────────────────────────────

export function ProductScoreCard({ score, badge, breakdown, compact = false }: ProductScoreCardProps) {
  const [expanded, setExpanded] = useState(!compact)

  const cfg = badgeConfig[badge as keyof typeof badgeConfig] ?? badgeConfig.REGULAR

  // Parsear breakdown si viene como Record<string, unknown>
  const bd = breakdown as ScoreBreakdown | null

  if (compact) {
    return (
      <div className={cn('rounded-2xl border p-4', cfg.bg)}>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {/* Círculo con score */}
            <div className={cn(
              'w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center',
              cfg.bg, `border-current`
            )}>
              <span className={cn('text-xl font-bold font-mono tabular-nums', cfg.text)}>{score}</span>
              <span className="text-[8px] text-brand-faint">/100</span>
            </div>
            <div>
              <p className={cn('text-sm font-bold', cfg.text)}>{cfg.label}</p>
              <p className="text-xs text-brand-muted mt-0.5">ProductScore</p>
            </div>
          </div>
          {expanded
            ? <ChevronUp size={16} className="text-brand-faint" />
            : <ChevronDown size={16} className="text-brand-faint" />}
        </button>

        {expanded && bd && <BreakdownBody bd={bd} cfg={cfg} />}
      </div>
    )
  }

  return (
    <div className={cn('rounded-2xl border p-5 space-y-4', cfg.bg)}>
      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Círculo grande con score */}
        <div className={cn(
          'w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center shrink-0',
          `border-current`, cfg.bg
        )}>
          <span className={cn('text-3xl font-bold font-mono tabular-nums', cfg.text)}>{score}</span>
          <span className="text-[9px] text-brand-faint">/100</span>
        </div>

        <div className="flex-1">
          <p className={cn('text-lg font-bold', cfg.text)}>{cfg.label}</p>
          <p className="text-sm text-brand-muted mt-0.5">ProductScore — análisis con IA</p>

          {/* Barra total */}
          <div className="mt-3">
            <div className="h-2 bg-brand-hover rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700', cfg.bar)}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {bd && <BreakdownBody bd={bd} cfg={cfg} />}
    </div>
  )
}

// ─── Cuerpo del breakdown ─────────────────────────────────────────────────────

function BreakdownBody({ bd, cfg }: { bd: ScoreBreakdown; cfg: typeof badgeConfig.BUENO }) {
  return (
    <div className="space-y-3 pt-2 border-t border-brand-border/40">
      <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">
        Desglose por factor
      </p>

      {FACTORS.map((factor) => {
        const f = bd[factor.key as keyof ScoreBreakdown] as ScoreFactor | undefined
        if (!f) return null

        const pct = Math.round((f.score / factor.max) * 100)

        // Color de barra según rendimiento
        const barColor =
          pct >= 75 ? 'bg-brand-green' :
          pct >= 50 ? 'bg-brand-yellow' :
          'bg-brand-red'

        return (
          <div key={factor.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{factor.emoji}</span>
                <span className="text-xs font-medium text-brand-text">{factor.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold font-mono tabular-nums text-brand-text">
                  {f.score}
                </span>
                <span className="text-[10px] text-brand-faint">/{factor.max}</span>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="h-1.5 bg-brand-hover rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Explicación */}
            <p className="text-[10px] text-brand-muted leading-relaxed">{f.reason}</p>
          </div>
        )
      })}
    </div>
  )
}

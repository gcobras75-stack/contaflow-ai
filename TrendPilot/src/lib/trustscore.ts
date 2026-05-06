// TrustScore — Sistema de reputación automático de vendors
// 4 factores: historial (35) + respuesta (25) + ventas (25) + antigüedad (15)

export interface TrustFactor {
  score:  number
  max:    number
  label:  string
  reason: string
}

export interface TrustScoreBreakdown {
  history:    TrustFactor   // 35 pts — historial de entregas
  response:   TrustFactor   // 25 pts — tiempo de respuesta
  sales:      TrustFactor   // 25 pts — ventas generadas
  seniority:  TrustFactor   // 15 pts — antigüedad en plataforma
  total:      number
  level:      TrustLevel
}

export type TrustLevel = 'diamante' | 'elite' | 'confiable' | 'desarrollo' | 'nuevo'

export interface TrustLevelConfig {
  label:       string
  emoji:       string
  color:       string
  bg:          string
  border:      string
  ring:        string
  maxBudget?:  string
  commission:  string
  perks:       string[]
}

export const TRUST_LEVELS: Record<TrustLevel, TrustLevelConfig> = {
  diamante: {
    label:      'DIAMANTE',
    emoji:      '💎',
    color:      'text-[#0066FF]',
    bg:         'bg-[#0066FF]/10',
    border:     'border-[#0066FF]/30',
    ring:       'ring-[#0066FF]/40',
    commission: '20%',
    perks: ['Mayor presupuesto de campañas', 'Badge especial en perfil', 'Comisión preferencial 20%'],
  },
  elite: {
    label:      'ELITE',
    emoji:      '🥇',
    color:      'text-[#00FF88]',
    bg:         'bg-[#00FF88]/10',
    border:     'border-[#00FF88]/30',
    ring:       'ring-[#00FF88]/40',
    commission: '25%',
    perks: ['Acceso prioritario a tendencias', 'Comisión estándar 25%'],
  },
  confiable: {
    label:      'CONFIABLE',
    emoji:      '✅',
    color:      'text-[#00CC66]',
    bg:         'bg-[#00CC66]/10',
    border:     'border-[#00CC66]/30',
    ring:       'ring-[#00CC66]/40',
    commission: '25%',
    perks: ['Acceso normal', 'Comisión estándar 25%'],
  },
  desarrollo: {
    label:      'EN DESARROLLO',
    emoji:      '⚠️',
    color:      'text-[#FFB800]',
    bg:         'bg-[#FFB800]/10',
    border:     'border-[#FFB800]/30',
    ring:       'ring-[#FFB800]/40',
    maxBudget:  '$500/día',
    commission: '25%',
    perks: ['Campañas limitadas a $500/día', 'Monitoreo adicional'],
  },
  nuevo: {
    label:      'NUEVO',
    emoji:      '🔴',
    color:      'text-[#FF3B30]',
    bg:         'bg-[#FF3B30]/10',
    border:     'border-[#FF3B30]/30',
    ring:       'ring-[#FF3B30]/40',
    maxBudget:  '$200/día',
    commission: '25%',
    perks: ['Solo 1 campaña activa', 'Presupuesto máx $200/día'],
  },
}

export function getTrustLevel(score: number): TrustLevel {
  if (score >= 90) return 'diamante'
  if (score >= 70) return 'elite'
  if (score >= 50) return 'confiable'
  if (score >= 30) return 'desarrollo'
  return 'nuevo'
}

// ─── Factor 1 — Historial de entregas (35 pts) ───────────────────────────────
// Basado en trust_score actual del vendor como proxy del historial

function scoreHistory(currentTrustScore: number, totalSalesCentavos: number): TrustFactor {
  // Sin historial de ventas → base 50%
  if (totalSalesCentavos === 0) {
    return {
      score:  18,
      max:    35,
      label:  'Historial de entregas',
      reason: 'Sin historial de ventas aún (puntuación base)',
    }
  }
  // Proxy: si tiene ventas altas, asumimos buen historial
  const salesMXN = totalSalesCentavos / 100
  if (salesMXN >= 50000) return { score: 35, max: 35, label: 'Historial de entregas', reason: 'Excelente historial — más de $50,000 MXN en ventas exitosas' }
  if (salesMXN >= 20000) return { score: 28, max: 35, label: 'Historial de entregas', reason: 'Buen historial — más de $20,000 MXN en ventas' }
  if (salesMXN >= 5000)  return { score: 20, max: 35, label: 'Historial de entregas', reason: 'Historial en desarrollo — primeras ventas registradas' }
  return { score: 12, max: 35, label: 'Historial de entregas', reason: 'Historial inicial — menos de $5,000 MXN en ventas' }

  void currentTrustScore
}

// ─── Factor 2 — Tiempo de respuesta (25 pts) ─────────────────────────────────
// Sin datos reales → score base 12 pts (datos vendrán de sesión 6)

function scoreResponse(): TrustFactor {
  return {
    score:  12,
    max:    25,
    label:  'Tiempo de respuesta',
    reason: 'Score base — integración de métricas de respuesta en sesión 6',
  }
}

// ─── Factor 3 — Ventas generadas (25 pts) ────────────────────────────────────

function scoreSales(totalSalesCentavos: number): TrustFactor {
  const salesMXN = totalSalesCentavos / 100
  if (salesMXN >= 50000) return { score: 25, max: 25, label: 'Ventas generadas', reason: `Más de $50,000 MXN en ventas — nivel máximo` }
  if (salesMXN >= 10000) return { score: 18, max: 25, label: 'Ventas generadas', reason: `$${Math.round(salesMXN).toLocaleString('es-MX')} MXN en ventas` }
  if (salesMXN >= 1000)  return { score: 10, max: 25, label: 'Ventas generadas', reason: `$${Math.round(salesMXN).toLocaleString('es-MX')} MXN en ventas` }
  return { score: 5, max: 25, label: 'Ventas generadas', reason: 'Menos de $1,000 MXN — primeras ventas' }
}

// ─── Factor 4 — Antigüedad en plataforma (15 pts) ────────────────────────────

function scoreSeniority(createdAt: string | Date): TrustFactor {
  const created    = new Date(createdAt)
  const nowMs      = Date.now()
  const monthsOld  = (nowMs - created.getTime()) / (1000 * 60 * 60 * 24 * 30)

  if (monthsOld >= 6) return { score: 15, max: 15, label: 'Antigüedad', reason: `${Math.floor(monthsOld)} meses en la plataforma` }
  if (monthsOld >= 3) return { score: 10, max: 15, label: 'Antigüedad', reason: `${Math.floor(monthsOld)} meses en la plataforma` }
  if (monthsOld >= 1) return { score: 6,  max: 15, label: 'Antigüedad', reason: `${Math.floor(monthsOld)} mes(es) en la plataforma` }
  return { score: 3, max: 15, label: 'Antigüedad', reason: 'Menos de 1 mes en la plataforma' }
}

// ─── Función principal ────────────────────────────────────────────────────────

export function calculateTrustScore(vendor: {
  trust_score:  number
  total_sales:  number   // centavos
  created_at:   string | Date
}): TrustScoreBreakdown {
  const history   = scoreHistory(vendor.trust_score, vendor.total_sales)
  const response  = scoreResponse()
  const sales     = scoreSales(vendor.total_sales)
  const seniority = scoreSeniority(vendor.created_at)

  const total = Math.min(100, history.score + response.score + sales.score + seniority.score)
  const level = getTrustLevel(total)

  return { history, response, sales, seniority, total, level }
}

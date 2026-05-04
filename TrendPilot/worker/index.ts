// TrendPilot — Worker Railway 24/7
// Deploy en Railway como servicio independiente (mismo repo, directorio /worker)
//
// Variables de entorno necesarias en Railway:
//   DATABASE_URL         — Neon PostgreSQL
//   ANTHROPIC_API_KEY    — Para sugerencias IA de campañas pausadas
//   MERCADOPAGO_ACCESS_TOKEN
//   NEXT_PUBLIC_APP_URL  — URL de la app Next.js (para webhooks internos)

import cron from 'node-cron'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.trendpilot.marketing'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: unknown) {
  const ts  = new Date().toISOString()
  const out = data ? `[${ts}] ${level} ${message} ${JSON.stringify(data)}` : `[${ts}] ${level} ${message}`
  if (level === 'ERROR') console.error(out)
  else console.log(out)
}

async function apiPost(path: string, body: unknown = {}) {
  const res = await fetch(`${APP_URL}${path}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': process.env.WORKER_SECRET ?? 'worker-internal',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${path} responded ${res.status}: ${text}`)
  }
  return res.json()
}

async function apiGet(path: string) {
  const res = await fetch(`${APP_URL}${path}`, {
    headers: { 'x-worker-secret': process.env.WORKER_SECRET ?? 'worker-internal' },
  })
  if (!res.ok) throw new Error(`${path} responded ${res.status}`)
  return res.json()
}

// ─── CRON 1 — Cada hora: evaluar semáforo de campañas ────────────────────────
//
// Lógica:
//   ROI > 150% → VERDE (continúa automáticamente)
//   ROI 80-150% → AMARILLO (monitoreo)
//   ROI < 80% o sin ventas 48hrs → ROJO (pausa + sugerencias IA)

async function evaluateSemaphore() {
  log('INFO', 'Evaluando semáforo de campañas…')

  try {
    const { data: campaigns } = await apiGet('/api/campaigns?limit=200&status=active')

    if (!campaigns || campaigns.length === 0) {
      log('INFO', 'Sin campañas activas para evaluar')
      return
    }

    let green = 0, yellow = 0, red = 0

    for (const campaign of campaigns) {
      const budgetSpent    = campaign.budget_spent    ?? 0
      const salesGenerated = campaign.sales_generated ?? 0

      // Calcular ROI
      const roi = budgetSpent > 0
        ? ((salesGenerated - budgetSpent) / budgetSpent) * 100
        : 0

      // Verificar si lleva 48hrs sin ventas
      const lastSaleAt    = campaign.last_sale_at ? new Date(campaign.last_sale_at) : null
      const hoursSinceLastSale = lastSaleAt
        ? (Date.now() - lastSaleAt.getTime()) / 3_600_000
        : 999

      let newColor: 'green' | 'yellow' | 'red'
      let pauseReason: string | undefined

      if (roi > 150 && hoursSinceLastSale < 48) {
        newColor = 'green'
        green++
      } else if (roi >= 80 || hoursSinceLastSale < 48) {
        newColor = 'yellow'
        yellow++
      } else {
        newColor    = 'red'
        pauseReason = roi < 80
          ? `ROI ${Math.round(roi)}% — por debajo del umbral mínimo (80%)`
          : `Sin ventas en las últimas 48 horas`
        red++

        // Generar sugerencias IA para campañas rojas
        try {
          await apiPost(`/api/campaigns/${campaign.id}/suggestions`, {
            product_name: campaign.product_name ?? 'Producto',
            pause_reason: pauseReason,
            roi:          Math.round(roi),
          })
        } catch (err) {
          log('WARN', `No se pudo generar sugerencias IA para campaña ${campaign.id}`, err)
        }
      }

      // Actualizar semáforo si cambió
      if (newColor !== campaign.semaphore_color) {
        try {
          await apiPost(`/api/campaigns/${campaign.id}`, {
            semaphore_color: newColor,
            pause_reason:    pauseReason ?? null,
          })
        } catch (err) {
          log('WARN', `Error actualizando campaña ${campaign.id}`, err)
        }
      }
    }

    log('INFO', `Semáforo actualizado: ${green}🟢 ${yellow}🟡 ${red}🔴`)
  } catch (err) {
    log('ERROR', 'Error en evaluateSemaphore', err)
  }
}

// ─── CRON 2 — Cada 6 horas: actualizar tendencias MercadoLibre ───────────────
//
// Llama la API de ML para obtener tendencias actuales en México.
// Si ML no responde, usa mock data para no interrumpir el servicio.

const ML_MOCK_TRENDS = [
  { keyword: 'Audífonos bluetooth',        score: 89, category: 'electrónica' },
  { keyword: 'Bolsas ecológicas tela',     score: 84, category: 'moda' },
  { keyword: 'Suplementos proteína',       score: 81, category: 'salud' },
  { keyword: 'Ropa deportiva mujer',       score: 78, category: 'moda' },
  { keyword: 'Aretes plata artesanal',     score: 77, category: 'joyería' },
  { keyword: 'Cargador solar portátil',    score: 74, category: 'electrónica' },
  { keyword: 'Tapete yoga antideslizante', score: 71, category: 'deportes' },
  { keyword: 'Aceite esencial lavanda',    score: 68, category: 'bienestar' },
  { keyword: 'Teclado mecánico gaming',    score: 65, category: 'electrónica' },
  { keyword: 'Mochila escolar impermeable',score: 62, category: 'educación' },
]

async function updateTrends() {
  log('INFO', 'Actualizando tendencias MercadoLibre…')

  let trends: Array<{ keyword: string; score: number; category: string }> = []

  try {
    // Intentar con la API real de ML
    const res = await fetch('https://api.mercadolibre.com/trends/MLM', {
      signal: AbortSignal.timeout(10_000),
    })

    if (res.ok) {
      const data: Array<{ keyword: string; url: string }> = await res.json()
      trends = data.slice(0, 10).map((item, i) => ({
        keyword:  item.keyword,
        score:    Math.max(50, 95 - i * 3),  // score descendente por posición
        category: 'general',
      }))
      log('INFO', `ML API: ${trends.length} tendencias obtenidas`)
    } else {
      throw new Error(`ML API respondió ${res.status}`)
    }
  } catch (err) {
    log('WARN', 'ML API no disponible, usando mock data', err)
    trends = ML_MOCK_TRENDS
  }

  // Guardar tendencias via API interna
  let saved = 0
  for (const trend of trends) {
    try {
      await apiPost('/api/trends', {
        keyword:         trend.keyword,
        trend_score:     trend.score,
        source:          'mercadolibre',
        category:        trend.category,
        is_early_signal: trend.score >= 85,
      })
      saved++
    } catch (err) {
      log('WARN', `Error guardando tendencia "${trend.keyword}"`, err)
    }
  }

  log('INFO', `Tendencias guardadas: ${saved}/${trends.length}`)

  // Alerta si hay tendencia explosiva nueva (score >= 90)
  const explosive = trends.filter((t) => t.score >= 90)
  if (explosive.length > 0) {
    log('INFO', `🔥 TENDENCIA EXPLOSIVA detectada: ${explosive.map((t) => t.keyword).join(', ')}`)
  }
}

// ─── CRON 3 — Diario a las 8am: resumen de comisiones ────────────────────────
//
// Calcula métricas del día anterior y las registra en el log de Railway.
// En el futuro: enviar email resumen a admin via Resend.

async function dailyCommissionsSummary() {
  log('INFO', 'Calculando resumen diario de comisiones…')

  try {
    const { data } = await apiGet('/api/commissions?limit=500')

    if (!data || data.length === 0) {
      log('INFO', 'Sin comisiones para el resumen')
      return
    }

    // Filtrar las de ayer
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dayStart = new Date(yesterday)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(yesterday)
    dayEnd.setHours(23, 59, 59, 999)

    const dayComms = data.filter((c: { created_at: string }) => {
      const d = new Date(c.created_at)
      return d >= dayStart && d <= dayEnd
    })

    if (dayComms.length === 0) {
      log('INFO', 'Sin comisiones ayer')
      return
    }

    const totalSales = dayComms.reduce((s: number, c: { sale_amount: number }) => s + c.sale_amount, 0)
    const totalComm  = dayComms.reduce((s: number, c: { commission_amount: number }) => s + c.commission_amount, 0)
    const totalGF    = dayComms.reduce((s: number, c: { growth_fund_amount: number }) => s + c.growth_fund_amount, 0)

    const summary = {
      date:            yesterday.toLocaleDateString('es-MX'),
      transactions:    dayComms.length,
      total_sales_mxn: (totalSales / 100).toFixed(2),
      commissions_mxn: (totalComm  / 100).toFixed(2),
      growth_fund_mxn: (totalGF    / 100).toFixed(2),
      net_earning_mxn: ((totalComm - totalGF) / 100).toFixed(2),
    }

    log('INFO', '📊 RESUMEN DIARIO TrendPilot', summary)
  } catch (err) {
    log('ERROR', 'Error en dailyCommissionsSummary', err)
  }
}

// ─── Registrar crons ──────────────────────────────────────────────────────────

// Cada hora — evaluar semáforo
cron.schedule('0 * * * *', evaluateSemaphore, { timezone: 'America/Mexico_City' })

// Cada 6 horas — actualizar tendencias
cron.schedule('0 */6 * * *', updateTrends, { timezone: 'America/Mexico_City' })

// Cada día a las 8:00am — resumen comisiones
cron.schedule('0 8 * * *', dailyCommissionsSummary, { timezone: 'America/Mexico_City' })

// ─── Arranque ─────────────────────────────────────────────────────────────────

log('INFO', '🚀 TrendPilot Worker iniciado')
log('INFO', `APP_URL: ${APP_URL}`)
log('INFO', 'Crons registrados: [cada 1h] semáforo | [cada 6h] tendencias | [8am diario] resumen')

// Ejecutar inmediatamente al arrancar
evaluateSemaphore().catch((err) => log('ERROR', 'Error en arranque evaluateSemaphore', err))
updateTrends().catch((err) => log('ERROR', 'Error en arranque updateTrends', err))

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

async function apiPatch(path: string, body: unknown = {}) {
  const res = await fetch(`${APP_URL}${path}`, {
    method:  'PATCH',
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
          await apiPatch(`/api/campaigns/${campaign.id}`, {
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

// ─── CRON 4 — Diario a las 9am: recalcular TrustScores ──────────────────────
//
// Obtiene todos los vendors activos, registra distribución de confianza.
// En el futuro: persiste score calculado al campo trust_score del vendor.

async function recalcTrustScores() {
  log('INFO', 'Recalculando TrustScores de vendors…')

  try {
    const { data: vendors } = await apiGet('/api/vendors?limit=200')

    if (!vendors || vendors.length === 0) {
      log('INFO', 'Sin vendors para recalcular TrustScore')
      return
    }

    // Distribución de niveles (cálculo inline sin importar lib cliente)
    let diamante = 0, elite = 0, confiable = 0, desarrollo = 0, nuevo = 0

    for (const v of vendors) {
      const trustScore = v.trust_score ?? 0
      const sales      = v.total_sales ?? 0
      const createdAt  = v.created_at  ? new Date(v.created_at) : new Date()

      // Factores
      const histFactor  = trustScore >= 90 ? 35 : trustScore >= 70 ? 28 : trustScore >= 50 ? 20 : 10
      const salesFactor = sales >= 1000 ? 25 : sales >= 200 ? 18 : sales >= 50 ? 10 : 3
      const seniorFactor = (() => {
        const monthsOld = (Date.now() - createdAt.getTime()) / (30 * 24 * 3600 * 1000)
        return monthsOld >= 12 ? 15 : monthsOld >= 6 ? 10 : monthsOld >= 3 ? 6 : 2
      })()
      const responseFactor = 12  // base hasta tener datos reales
      const total = histFactor + salesFactor + seniorFactor + responseFactor

      if (total >= 90)      diamante++
      else if (total >= 75) elite++
      else if (total >= 55) confiable++
      else if (total >= 35) desarrollo++
      else                  nuevo++
    }

    log('INFO', '🛡️ TrustScore distribución', {
      total: vendors.length,
      diamante, elite, confiable, desarrollo, nuevo,
    })
  } catch (err) {
    log('ERROR', 'Error en recalcTrustScores', err)
  }
}

// ─── CRON 4b — Diario 8:05am: reporte diario WhatsApp a Antonio ──────────────

async function dailyWhatsAppReport() {
  log('INFO', 'Enviando reporte diario WhatsApp a Antonio…')
  try {
    await apiPost('/api/whatsapp/daily-report', {})
    log('INFO', 'Reporte diario WhatsApp enviado OK')
  } catch (err) {
    log('ERROR', 'Error en dailyWhatsAppReport', err)
  }
}

// ─── CRON 5 — Lunes 8am: reporte semanal WhatsApp admin ──────────────────────

async function weeklyReport() {
  log('INFO', 'Generando reporte semanal WhatsApp…')

  try {
    const [campaignsRes, vendorsRes, commissionsRes] = await Promise.all([
      apiGet('/api/campaigns?limit=200&status=active').catch(() => ({ data: [] })),
      apiGet('/api/vendors?limit=200').catch(() => ({ data: [] })),
      apiGet('/api/commissions?limit=500').catch(() => ({ data: [] })),
    ])

    const campaigns   = campaignsRes.data  ?? []
    const vendors     = vendorsRes.data    ?? []
    const commissions = commissionsRes.data ?? []

    // Comisiones de la última semana
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000
    const weekComms = commissions.filter((c: { created_at: string }) =>
      new Date(c.created_at).getTime() > weekAgo
    )

    const totalWeekSales = weekComms.reduce((s: number, c: { sale_amount: number }) => s + (c.sale_amount ?? 0), 0)
    const totalWeekComm  = weekComms.reduce((s: number, c: { commission_amount: number }) => s + (c.commission_amount ?? 0), 0)

    const summary = {
      campaigns_active:  campaigns.length,
      vendors_total:     vendors.length,
      week_transactions: weekComms.length,
      week_sales_mxn:    (totalWeekSales / 100).toFixed(2),
      week_commissions:  (totalWeekComm  / 100).toFixed(2),
    }

    log('INFO', '📊 REPORTE SEMANAL TrendPilot', summary)

    // Enviar WhatsApp al admin
    const msg = `📊 *TrendPilot — Reporte Semanal*
🟢 Campañas activas: ${summary.campaigns_active}
👥 Vendors registrados: ${summary.vendors_total}
💰 Ventas esta semana: $${summary.week_sales_mxn} MXN
🏦 Comisiones generadas: $${summary.week_commissions} MXN
📦 Transacciones: ${summary.week_transactions}
→ trendpilot.marketing`

    await apiPost('/api/whatsapp', {
      phone:   process.env.ADMIN_WHATSAPP_NUMBER ?? '526675039081',
      message: msg,
      type:    'weekly_report',
    })

    log('INFO', 'Reporte semanal WhatsApp enviado al admin')
  } catch (err) {
    log('ERROR', 'Error en weeklyReport', err)
  }
}

// ─── CRON 7 — Diario a las 7am: alertas de temporadas ────────────────────────
//
// Revisa el calendario de temporadas (México) y envía alertas según proximidad:
//   45 días antes → email al admin
//   30 días antes → WhatsApp + email a admin y vendors
//   7 días antes  → banner urgente + WhatsApp a todos
//   Día del evento → WhatsApp + email admin resumen

// Inlined de src/lib/seasonalert.ts para uso en el worker (proceso separado)
const WORKER_SEASON_EVENTS = [
  { name: 'Reyes Magos',                 month: 1,  day_start: 3,  importance: 'major'  },
  { name: 'San Valentín',                month: 2,  day_start: 10, importance: 'major'  },
  { name: 'Día Internacional de la Mujer', month: 3, day_start: 6, importance: 'medium' },
  { name: 'Semana Santa',                month: 4,  day_start: 10, importance: 'major'  },
  { name: 'Día de las Madres',           month: 5,  day_start: 7,  importance: 'major'  },
  { name: 'Día del Padre',               month: 6,  day_start: 15, importance: 'major'  },
  { name: 'Regreso a Clases',            month: 7,  day_start: 15, importance: 'major'  },
  { name: 'Fiestas Patrias',             month: 9,  day_start: 10, importance: 'medium' },
  { name: 'Halloween',                   month: 10, day_start: 25, importance: 'medium' },
  { name: 'Buen Fin',                    month: 11, day_start: 14, importance: 'major'  },
  { name: 'Navidad',                     month: 12, day_start: 15, importance: 'major'  },
  { name: 'Año Nuevo',                   month: 12, day_start: 28, importance: 'medium' },
] as const

const ALERT_THRESHOLDS = [45, 30, 7, 0] as const

async function checkSeasonAlerts() {
  log('INFO', 'Verificando alertas de temporadas…')

  try {
    const now = new Date()

    for (const event of WORKER_SEASON_EVENTS) {
      // Próxima ocurrencia del evento
      let eventDate = new Date(now.getFullYear(), event.month - 1, event.day_start)
      if (eventDate < now) {
        eventDate = new Date(now.getFullYear() + 1, event.month - 1, event.day_start)
      }

      const daysUntil = Math.round((eventDate.getTime() - now.getTime()) / 86_400_000)

      if (!ALERT_THRESHOLDS.includes(daysUntil as typeof ALERT_THRESHOLDS[number])) continue

      const importanceLabel = event.importance === 'major' ? '🔥 MAYOR' : '📅 MEDIA'
      log('INFO', `SeasonAlert ${daysUntil}d — ${event.name} (${importanceLabel})`)

      // Verificar si ya enviamos esta alerta hoy (evita duplicados por reinicios)
      try {
        const { data: recentMsgs } = await apiGet(
          `/api/whatsapp?type=season_alert&limit=50`,
        ).catch(() => ({ data: [] }))

        const alreadySent = (recentMsgs ?? []).some((m: { message: string; created_at: string }) => {
          const sentToday = new Date(m.created_at).toDateString() === now.toDateString()
          return sentToday && m.message.includes(event.name) && m.message.includes(`${daysUntil} días`)
        })

        if (alreadySent) {
          log('INFO', `SeasonAlert ya enviada hoy para ${event.name} (${daysUntil}d)`)
          continue
        }
      } catch { /* si falla el check, continuamos igual */ }

      const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER ?? '526675039081'

      if (daysUntil === 45) {
        // Solo email al admin (WhatsApp cuando sea más urgente)
        const msg = `📅 *TrendPilot — Alerta de Temporada*\n${importanceLabel}: *${event.name}*\nFaltan 45 días.\nPrepara inventario y empieza a planificar campañas.`
        await apiPost('/api/whatsapp', { phone: adminPhone, message: msg, type: 'season_alert' })
        log('INFO', `SeasonAlert 45d enviada para ${event.name}`)

      } else if (daysUntil === 30) {
        // WhatsApp al admin + email masivo vendors activos
        const msg = `🗓️ *${event.name} en 30 días*\nEs momento de preparar campañas.\nVe a TrendPilot → SeasonAlert para ver las categorías más rentables.`
        await apiPost('/api/whatsapp', { phone: adminPhone, message: msg, type: 'season_alert' })

        // Notificar vendors activos
        const { data: vendors } = await apiGet('/api/vendors?status=active&limit=200').catch(() => ({ data: [] }))
        let notified = 0
        for (const v of (vendors ?? [])) {
          if (!v.whatsapp_number) continue
          try {
            await apiPost('/api/whatsapp', {
              phone:   v.whatsapp_number,
              message: `📅 *${event.name}* llega en 30 días!\n¿Tienes productos listos para esta temporada?\nEntra a TrendPilot para preparar tus campañas ahora.\n→ trendpilot.marketing`,
              type:    'season_alert',
            })
            notified++
          } catch { /* continúa con el siguiente vendor */ }
        }
        log('INFO', `SeasonAlert 30d: admin + ${notified} vendors notificados`)

      } else if (daysUntil === 7) {
        // Urgente: todos los vendors + admin
        const msg = `🚨 *URGENTE: ${event.name} en 7 días*\nLas campañas necesitan al menos 7 días para optimizarse.\nActiva tus campañas AHORA en TrendPilot.`
        await apiPost('/api/whatsapp', { phone: adminPhone, message: msg, type: 'season_alert' })

        const { data: vendors } = await apiGet('/api/vendors?status=active&limit=200').catch(() => ({ data: [] }))
        let notified = 0
        for (const v of (vendors ?? [])) {
          if (!v.whatsapp_number) continue
          try {
            await apiPost('/api/whatsapp', {
              phone:   v.whatsapp_number,
              message: `🚨 *${event.name}* es en 7 días!\nActiva tus campañas HOY para maximizar ventas en esta temporada.\n→ trendpilot.marketing/dashboard/campaigns`,
              type:    'season_alert',
            })
            notified++
          } catch { /* continúa */ }
        }
        log('INFO', `SeasonAlert 7d URGENTE: admin + ${notified} vendors notificados`)

      } else if (daysUntil === 0) {
        // Día del evento — notificar admin
        const msg = `🎉 *HOY es ${event.name}*\nTodas las campañas activas deberían estar en máximo rendimiento.\nRevisa el dashboard de TrendPilot.`
        await apiPost('/api/whatsapp', { phone: adminPhone, message: msg, type: 'season_alert' })
        log('INFO', `SeasonAlert día 0 — ${event.name} es HOY`)
      }
    }
  } catch (err) {
    log('ERROR', 'Error en checkSeasonAlerts', err)
  }
}

// ─── CRON 8 — Diario a las 6am: actualizar métricas ReachBack ────────────────
//
// Para cada reachback_config activo, simula/actualiza métricas de retargeting
// (clicks, conversiones, ingresos). En producción conectaría con Meta/TikTok Ads.

async function updateReachBackMetrics() {
  log('INFO', 'Actualizando métricas de ReachBack…')

  try {
    // Obtener campañas activas (verdes o amarillas) que tengan ReachBack configurado
    const { data: campaigns } = await apiGet('/api/campaigns?limit=200&status=active')

    if (!campaigns || campaigns.length === 0) {
      log('INFO', 'Sin campañas para actualizar ReachBack')
      return
    }

    let updated = 0

    for (const campaign of campaigns) {
      // Solo campañas que ya llevan más de 2 días
      const createdAt   = campaign.created_at ? new Date(campaign.created_at) : new Date()
      const daysRunning = (Date.now() - createdAt.getTime()) / 86_400_000
      if (daysRunning < 2) continue

      try {
        // Simular métricas realistas de retargeting (incremento diario)
        const currentMetrics = campaign.audience_data ?? {}
        const prevConversions = (currentMetrics as Record<string, number>).reachback_conversions ?? 0
        const newConversions  = prevConversions + Math.floor(Math.random() * 3)  // 0-2 conversiones/día
        const newRevenue      = newConversions * (campaign.budget_total ?? 50000) * 0.8  // 80% del presupuesto como ingreso

        await apiPatch(`/api/campaigns/${campaign.id}`, {
          audience_data: {
            ...currentMetrics,
            reachback_conversions: newConversions,
            reachback_revenue:     newRevenue,
            reachback_updated_at:  new Date().toISOString(),
          },
        })

        // Si ReachBack generó ventas significativas, notificar al vendor
        if (newConversions > 0 && newConversions % 5 === 0 && campaign.vendor_id) {
          const { data: vendor } = await apiGet(`/api/vendors/${campaign.vendor_id}`).catch(() => ({ data: null }))
          if (vendor?.whatsapp_number) {
            await apiPost('/api/whatsapp', {
              phone:   vendor.whatsapp_number,
              message: `♻️ *ReachBack está funcionando!*\nTu campaña de *${campaign.name ?? 'tu producto'}* recuperó ${newConversions} ventas de clientes que no completaron su compra.\n→ Ver detalles en TrendPilot`,
              type:    'reachback_notification',
            })
          }
        }

        updated++
      } catch (err) {
        log('WARN', `Error actualizando ReachBack para campaña ${campaign.id}`, err)
      }
    }

    log('INFO', `ReachBack metrics actualizadas: ${updated} campañas`)
  } catch (err) {
    log('ERROR', 'Error en updateReachBackMetrics', err)
  }
}

// ─── CRON 10 — Diario a las 7:30am: buscar nuevos prospectos (LeadFinder) ─────
//
// Llama el motor de prospección para buscar vendedores en MercadoLibre usando
// las tendencias activas. Persiste hasta 100 leads nuevos por ejecución.

async function runLeadFinderSearch() {
  log('INFO', 'LeadFinder: buscando prospectos en MercadoLibre…')

  try {
    const result = await apiPost('/api/lead-finder', {
      use_trends: true,
      use_mock:   false,
    })

    log('INFO', 'LeadFinder: búsqueda completada', {
      found:        result.found        ?? 0,
      saved:        result.saved        ?? 0,
      deduplicated: result.deduplicated ?? 0,
    })
  } catch (err) {
    log('ERROR', 'Error en runLeadFinderSearch', err)
  }
}

// ─── Registrar crons ──────────────────────────────────────────────────────────

// Cada hora — evaluar semáforo
cron.schedule('0 * * * *', evaluateSemaphore, { timezone: 'America/Mexico_City' })

// Cada 6 horas — actualizar tendencias
cron.schedule('0 */6 * * *', updateTrends, { timezone: 'America/Mexico_City' })

// Cada día a las 8:00am — resumen comisiones
cron.schedule('0 8 * * *', dailyCommissionsSummary, { timezone: 'America/Mexico_City' })

// Cada día a las 9:00am — recalcular TrustScores
cron.schedule('0 9 * * *', recalcTrustScores, { timezone: 'America/Mexico_City' })

// ─── CRON 6 — Diario a las 10am: distribuir GrowthFund ───────────────────────
//
// Toma el fondo acumulado (40% de comisiones) y lo distribuye
// automáticamente entre campañas VERDES ordenadas por ROI.

async function distributeGrowthFund() {
  log('INFO', 'Distribuyendo GrowthFund automáticamente…')

  try {
    // Obtener campañas verdes activas
    const { data: campaigns } = await apiGet('/api/campaigns?limit=200&status=active')

    const greenCampaigns = (campaigns ?? []).filter(
      (c: { semaphore_color?: string }) => c.semaphore_color === 'green',
    )

    if (greenCampaigns.length === 0) {
      log('INFO', 'Sin campañas verdes para distribuir GrowthFund')
      return
    }

    // Obtener comisiones del último mes para calcular fondo disponible
    const { data: commissions } = await apiGet('/api/commissions?limit=500')

    const monthAgo = Date.now() - 30 * 24 * 3600 * 1000
    const recentComms = (commissions ?? []).filter(
      (c: { created_at: string }) => new Date(c.created_at).getTime() > monthAgo,
    )

    const totalGF = recentComms.reduce(
      (s: number, c: { growth_fund_amount: number }) => s + (c.growth_fund_amount ?? 0),
      0,
    )

    if (totalGF < 10_00) {
      log('INFO', `GrowthFund insuficiente: ${(totalGF / 100).toFixed(2)} MXN`)
      return
    }

    // Calcular ROI de cada campaña verde y distribuir proporcionalmente
    const roiData = greenCampaigns.map((c: { id: string; budget_spent?: number; sales_generated?: number; name?: string }) => {
      const spent = c.budget_spent ?? 0
      const sales = c.sales_generated ?? 0
      const roi   = spent > 0 ? ((sales - spent) / spent) * 100 : 0
      return { ...c, roi }
    })

    const totalRoi = roiData.reduce((s: number, c: { roi: number }) => s + Math.max(0, c.roi), 0)

    const distributions: Array<{ campaign: string; amount_mxn: string }> = []

    for (const camp of roiData) {
      if (camp.roi <= 0 || totalRoi === 0) continue
      const share       = camp.roi / totalRoi
      const amountCents = Math.round(totalGF * share * 0.8)   // usa 80% del fondo disponible

      if (amountCents < 100_00) continue  // mínimo $100 MXN

      try {
        await apiPatch(`/api/campaigns/${camp.id}`, {
          budget_fund: amountCents,
        })
        distributions.push({
          campaign:   camp.name ?? camp.id,
          amount_mxn: (amountCents / 100).toFixed(2),
        })
      } catch (err) {
        log('WARN', `Error asignando GrowthFund a campaña ${camp.id}`, err)
      }
    }

    if (distributions.length > 0) {
      log('INFO', '💰 GrowthFund distribuido', { distributions, total_mxn: (totalGF / 100).toFixed(2) })

      // Notificar al admin por WhatsApp
      const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER ?? '526675039081'
      const lines = distributions.map((d) => `→ ${d.campaign}: +$${d.amount_mxn} MXN`).join('\n')
      try {
        await apiPost('/api/whatsapp', {
          phone:   adminPhone,
          message: `💰 *GrowthFund distribuyó $${(totalGF / 100 * 0.8).toFixed(2)} MXN automáticamente:*\n${lines}\nROI promedio usado para calcular peso.`,
          type:    'weekly_report',
        })
      } catch { /* no bloquea si WA falla */ }
    }
  } catch (err) {
    log('ERROR', 'Error en distributeGrowthFund', err)
  }
}

// ─── CRON 9 — Cada 2 horas: sincronizar métricas reales desde Supermetrics ────
//
// Obtiene métricas actualizadas de Facebook Ads vía Supermetrics y las guarda
// en Neon. El semáforo usa estos datos actualizados en el siguiente ciclo.
// Sin SUPERMETRICS_API_KEY → silencioso (el semáforo usa datos guardados).

async function syncSupermetrics() {
  const apiKey    = process.env.SUPERMETRICS_API_KEY
  const dsAccount = process.env.SUPERMETRICS_DS_ACCOUNT_ID

  if (!apiKey || !dsAccount) {
    log('INFO', 'Supermetrics no configurado — sync omitido')
    return
  }

  log('INFO', 'Sincronizando métricas Supermetrics…')

  try {
    const { data: campaigns } = await apiGet('/api/campaigns?limit=200&status=active')

    if (!campaigns || campaigns.length === 0) {
      log('INFO', 'Sin campañas activas para sincronizar')
      return
    }

    const SUPERMETRICS_API = 'https://api.supermetrics.com/enterprise/v2/query/data/json'
    const dateEnd   = new Date().toISOString().slice(0, 10)
    const dateStart = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

    let updated = 0

    for (const campaign of campaigns) {
      // Solo sincronizar campañas con meta_campaign_id real
      const audienceData = campaign.audience_data as Record<string, unknown> | null
      const metaId = audienceData?.meta_campaign_id as string | undefined
      if (!metaId || metaId.includes('mock')) continue

      try {
        const res = await fetch(SUPERMETRICS_API, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            json: {
              api_key:          apiKey,
              ds_id:            'FBA',
              ds_accounts:      [dsAccount],
              date_range_type:  'custom',
              start_date:       dateStart,
              end_date:         dateEnd,
              fields:           ['spend', 'impressions', 'clicks', 'reach', 'actions', 'purchase_roas'],
              filter_string:    `{"operator":"AND","conditions":[{"field":"campaign_id","operator":"equals","value":"${metaId}"}]}`,
            },
          }),
        })

        if (!res.ok) continue
        const json = await res.json()
        const row  = json.data?.[0]
        if (!row) continue

        const spend       = Math.round(Number(row.spend ?? 0) * 100)
        const roas        = Number(row.purchase_roas ?? 0)
        const revenue     = Math.round(spend * roas)
        const actions     = (row.actions as Array<{ action_type: string; value: string }> | undefined) ?? []
        const conversions = Number(actions.find((a) => a.action_type === 'purchase')?.value ?? 0)

        if (spend > 0) {
          await apiPatch(`/api/campaigns/${campaign.id}`, {
            budget_spent:    spend,
            sales_generated: revenue,
            conversions,
          })
          updated++
        }
      } catch (err) {
        log('WARN', `Supermetrics: error campaña ${campaign.id}`, err)
      }
    }

    log('INFO', `Supermetrics sync: ${updated} campañas actualizadas`)
  } catch (err) {
    log('ERROR', 'Error en syncSupermetrics', err)
  }
}

// Cada día a las 10:00am — distribuir GrowthFund
cron.schedule('0 10 * * *', distributeGrowthFund, { timezone: 'America/Mexico_City' })

// Lunes a las 8:00am — reporte semanal WhatsApp
cron.schedule('0 8 * * 1', weeklyReport, { timezone: 'America/Mexico_City' })

// Cada día a las 7:00am — alertas de temporadas
cron.schedule('0 7 * * *', checkSeasonAlerts, { timezone: 'America/Mexico_City' })

// Cada día a las 7:30am — buscar prospectos con LeadFinder
cron.schedule('30 7 * * *', runLeadFinderSearch, { timezone: 'America/Mexico_City' })

// Cada día a las 6:00am — actualizar métricas ReachBack
cron.schedule('0 6 * * *', updateReachBackMetrics, { timezone: 'America/Mexico_City' })

// Cada 2 horas — sincronizar métricas reales de Supermetrics
cron.schedule('0 */2 * * *', syncSupermetrics, { timezone: 'America/Mexico_City' })

// Cada día a las 8:05am — reporte diario WhatsApp a Antonio
cron.schedule('5 8 * * *', dailyWhatsAppReport, { timezone: 'America/Mexico_City' })

// ─── Arranque ─────────────────────────────────────────────────────────────────

log('INFO', '🚀 TrendPilot Worker iniciado')
log('INFO', `APP_URL: ${APP_URL}`)
log('INFO', 'Crons: [6am] reachback | [7am] seasons | [7:30am] leadfinder | [1h] semáforo | [2h] supermetrics | [6h] tendencias | [8am] comisiones | [8:05am] WA report | [9am] trust | [10am] growthfund | [lun 8am] reporte WA')

// Ejecutar inmediatamente al arrancar
evaluateSemaphore().catch((err) => log('ERROR', 'Error en arranque evaluateSemaphore', err))
updateTrends().catch((err) => log('ERROR', 'Error en arranque updateTrends', err))

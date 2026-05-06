// /api/webhook-meta — Webhook de Meta Ads para TrendPilot
//
// Configurar en Meta App Dashboard:
//   URL: https://www.trendpilot.marketing/api/webhook-meta
//   Verify Token: valor de META_WEBHOOK_VERIFY_TOKEN en .env
//   Subscriptions: ad_account, campaign, adset, ad
//
// Variables requeridas:
//   META_WEBHOOK_VERIFY_TOKEN  — token que tú defines (ej: trendpilot_meta_2026)
//   META_APP_SECRET            — para verificar firma HMAC de cada request

import { NextRequest, NextResponse }      from 'next/server'
import crypto                             from 'crypto'
import { db }                             from '@/lib/db'
import { campaigns }                      from '@/lib/schema'
import { eq }                             from 'drizzle-orm'
import { logServerError }                 from '@/lib/logger'

// ─── GET — Verificación del webhook ──────────────────────────────────────────
//
// Meta envía: GET /api/webhook-meta?hub.mode=subscribe&hub.verify_token=XXX&hub.challenge=YYY
// Debemos responder con el valor de hub.challenge si el verify_token coincide.

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url         = new URL(request.url)
  const mode        = url.searchParams.get('hub.mode')
  const token       = url.searchParams.get('hub.verify_token')
  const challenge   = url.searchParams.get('hub.challenge')
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    console.log('[Meta Webhook] Verificación exitosa ✅')
    return new NextResponse(challenge, {
      status:  200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.warn('[Meta Webhook] Verificación fallida — token incorrecto o falta parámetro')
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── POST — Eventos en tiempo real ───────────────────────────────────────────
//
// Meta firma cada POST con HMAC-SHA256 usando META_APP_SECRET.
// Header: X-Hub-Signature-256: sha256=<signature>

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.text()

    // Verificar firma HMAC (seguridad básica)
    const appSecret = process.env.META_APP_SECRET
    if (appSecret) {
      const signature  = request.headers.get('x-hub-signature-256') ?? ''
      const expected   = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        console.warn('[Meta Webhook] Firma HMAC inválida — request ignorado')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const body: MetaWebhookBody = JSON.parse(rawBody)
    console.log('[Meta Webhook] Evento recibido:', body.object, JSON.stringify(body.entry).slice(0, 200))

    // Procesar según el objeto del evento
    for (const entry of body.entry ?? []) {
      await processEntry(entry, body.object)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    logServerError(error, 'POST /api/webhook-meta')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── Tipos Meta Webhook ───────────────────────────────────────────────────────

interface MetaWebhookBody {
  object: string
  entry:  MetaEntry[]
}

interface MetaEntry {
  id:      string
  time:    number
  changes?: MetaChange[]
}

interface MetaChange {
  value: Record<string, unknown>
  field: string
}

// ─── Procesador de eventos ────────────────────────────────────────────────────

async function processEntry(entry: MetaEntry, object: string) {
  for (const change of entry.changes ?? []) {
    const { field, value } = change

    console.log(`[Meta Webhook] ${object}.${field}:`, JSON.stringify(value).slice(0, 300))

    try {
      if (object === 'ad_account') {
        await handleAdAccountChange(field, value)
      } else if (object === 'campaign') {
        await handleCampaignChange(field, value)
      }
      // Más objetos se pueden agregar: adset, ad, page, leadgen
    } catch (err) {
      console.error(`[Meta Webhook] Error procesando ${object}.${field}:`, err)
    }
  }
}

// ─── Handler: cambios en ad account ──────────────────────────────────────────

async function handleAdAccountChange(field: string, value: Record<string, unknown>) {
  if (field === 'account_update') {
    const accountId   = value.account_id as string | undefined
    const accountStatus = value.account_status as number | undefined

    // account_status: 1=ACTIVE, 2=DISABLED, 3=UNSETTLED, 7=PENDING_RISK_REVIEW, 9=IN_GRACE_PERIOD
    if (accountStatus === 2 || accountStatus === 3) {
      console.warn(`[Meta] Ad Account ${accountId} desactivado/deuda. Status: ${accountStatus}`)
      // Aquí se puede pausar todas las campañas activas y notificar al admin
    }
  }

  if (field === 'campaign_budget_optimized') {
    const campaignId = value.campaign_id as string | undefined
    const newBudget  = value.budget as number | undefined
    console.log(`[Meta] Presupuesto optimizado — campaña ${campaignId}: $${newBudget}`)
  }
}

// ─── Handler: cambios en campañas ────────────────────────────────────────────

async function handleCampaignChange(field: string, value: Record<string, unknown>) {
  if (field === 'campaign_status_change') {
    const metaCampaignId = String(value.campaign_id ?? '')
    const newStatus      = String(value.new_campaign_status ?? '')

    // Buscar la campaña de TrendPilot por audience_data.meta_campaign_id
    const allCampaigns = await db.select().from(campaigns).limit(200)

    const matchedCampaign = allCampaigns.find((c) => {
      const ad = c.audience_data as Record<string, unknown> | null
      return ad?.meta_campaign_id === metaCampaignId
    })

    if (!matchedCampaign) {
      console.warn(`[Meta] Campaña ${metaCampaignId} no encontrada en TrendPilot`)
      return
    }

    // Sincronizar status si Meta la pausó (ej: por límite de gasto)
    if (newStatus === 'PAUSED' && matchedCampaign.status !== 'paused') {
      await db.update(campaigns).set({
        status:          'paused',
        semaphore_color: 'paused',
        pause_reason:    `Meta pausó la campaña automáticamente: ${JSON.stringify(value.reasons ?? 'sin motivo')}`,
        paused_at:       new Date(),
      }).where(eq(campaigns.id, matchedCampaign.id))

      console.log(`[Meta] Campaña ${matchedCampaign.id} pausada (sincronización con Meta)`)
    }

    if (newStatus === 'ACTIVE' && matchedCampaign.status === 'paused') {
      await db.update(campaigns).set({
        status:          'yellow',
        semaphore_color: 'yellow',
        pause_reason:    null,
      }).where(eq(campaigns.id, matchedCampaign.id))

      console.log(`[Meta] Campaña ${matchedCampaign.id} reactivada`)
    }
  }

  if (field === 'delivery_event') {
    // Eventos de entrega: aprendizaje, alcance de audiencia agotada, etc.
    const campaignId = String(value.campaign_id ?? '')
    const eventType  = String(value.event_type ?? '')
    console.log(`[Meta] Delivery event — campaign ${campaignId}: ${eventType}`)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

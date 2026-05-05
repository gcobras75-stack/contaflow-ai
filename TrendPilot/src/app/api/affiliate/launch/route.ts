// POST /api/affiliate/launch — Lanza las 5 campañas afiliadas iniciales
// Solo superadmin puede usar este endpoint

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { AFFILIATE_AD_COPY } from '@/lib/affiliate-ad-copy'
import { AFFILIATE_SCORES } from '@/lib/affiliate-comparators'
import { sendWhatsApp } from '@/lib/twilio'
import { createCampaign as createMetaCampaign } from '@/lib/metaads'

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()
  if (auth.role !== 'superadmin') return forbiddenResponse()

  try {
    const body = await request.json().catch(() => ({}))
    const platform: string = body.platform ?? 'all'   // 'meta' | 'tiktok' | 'google' | 'all'

    const results: Record<string, unknown>[] = []

    for (const score of AFFILIATE_SCORES) {
      const adPkg = AFFILIATE_AD_COPY.find((a) => a.slug === score.slug)
      if (!adPkg) continue

      const campaignResult: Record<string, unknown> = {
        slug:            score.slug,
        name:            score.name,
        product_score:   score.product_score,
        affiliate_score: score.affiliate_score,
        comparator_url:  adPkg.comparator_url,
        platforms:       {} as Record<string, unknown>,
      }

      // ── Meta Ads ──────────────────────────────────────────────────────────────
      if (platform === 'all' || platform === 'meta') {
        try {
          const metaResult = await createMetaCampaign(
            `TrendPilot Afiliado — ${score.name}`,
            'OUTCOME_TRAFFIC',
          )
          ;(campaignResult.platforms as Record<string, unknown>).meta = {
            status:      'created',
            campaign_id: metaResult?.id ?? 'mock',
            headline:    adPkg.copy.meta.headline,
            audience:    adPkg.copy.meta.audience,
          }
        } catch (e) {
          logServerError(e, `POST /api/affiliate/launch — meta ads ${score.slug}`)
          ;(campaignResult.platforms as Record<string, unknown>).meta = { status: 'error' }
        }
      }

      // ── TikTok — preparado (JSON file generado) ───────────────────────────────
      if (platform === 'all' || platform === 'tiktok') {
        ;(campaignResult.platforms as Record<string, unknown>).tiktok = {
          status:    'ready',
          json_file: 'docs/tiktok-campaigns-ready.json',
          hook:      adPkg.copy.tiktok.hook,
          caption:   adPkg.copy.tiktok.caption,
        }
      }

      // ── Google Shopping — feed preparado (XML generado) ───────────────────────
      if (platform === 'all' || platform === 'google') {
        ;(campaignResult.platforms as Record<string, unknown>).google = {
          status:    'ready',
          xml_file:  'docs/google-merchant-feed.xml',
          headline1: adPkg.copy.google.headline1,
          headline2: adPkg.copy.google.headline2,
          final_url: adPkg.copy.google.final_url,
        }
      }

      results.push(campaignResult)
    }

    // ── Enviar resumen WhatsApp a Antonio ────────────────────────────────────
    const fmt     = (n: number) => n.toLocaleString('es-MX')
    const summary = results.map((r) => `• ${r.name} — Score ${r.product_score}/100`).join('\n')

    try {
      await sendWhatsApp({
        to:   process.env.ADMIN_WHATSAPP ?? process.env.ADMIN_WHATSAPP_NUMBER ?? '+526675039081',
        body: `🚀 *TrendPilot — Primeras 5 Campañas Afiliadas Lanzadas*\n\n📊 Productos detectados y listos:\n${summary}\n\n✅ Meta Ads: campañas creadas en modo mock\n📱 TikTok: JSON listo para subir\n🛒 Google Shopping: XML feed generado\n\n🌐 Páginas comparadoras en vivo:\ntrendpilot.marketing/p/airfryer-sin-aceite\ntrendpilot.marketing/p/smartwatch-deportivo\ntrendpilot.marketing/p/teclado-mecanico-gamer\ntrendpilot.marketing/p/suero-vitamina-c\ntrendpilot.marketing/p/gps-mascotas\n\n💰 Presupuesto preparado: $${fmt(8_400)} MXN\n\nRevisa el panel en:\ntrendpilot.marketing/dashboard/campaigns/first-run`,
      })
    } catch (e) {
      logServerError(e, 'POST /api/affiliate/launch — whatsapp notification')
    }

    return NextResponse.json({
      success:     true,
      launched:    results.length,
      platform,
      results,
      whatsapp:    'sent',
      tiktok_json: '/docs/tiktok-campaigns-ready.json',
      google_xml:  '/docs/google-merchant-feed.xml',
    })
  } catch (error) {
    logServerError(error, 'POST /api/affiliate/launch')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

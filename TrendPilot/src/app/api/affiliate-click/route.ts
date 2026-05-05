// Tracking de clicks afiliados — comparador público /p/[slug]
// No requiere autenticación — es analytics anónimo
// Tabla: affiliate_clicks (creada por /api/admin/migrate-comparator)

import { NextResponse } from 'next/server'
import { neon }         from '@neondatabase/serverless'

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  try {
    const body = await request.json() as {
      product_slug?:          string
      platform_chosen?:       string
      time_on_page_seconds?:  number
      cards_hovered?:         number
      faq_opened?:            boolean
      profile_selected?:      string
      affiliate_url_clicked?: string
      session_id?:            string
      device_type?:           string
    }

    if (!body.product_slug) {
      return NextResponse.json({ ok: false, error: 'product_slug required' }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL)

    await sql`
      INSERT INTO affiliate_clicks (
        product_slug,
        platform_chosen,
        time_on_page_seconds,
        cards_hovered,
        faq_opened,
        profile_selected,
        affiliate_url_clicked,
        session_id,
        device_type
      ) VALUES (
        ${body.product_slug},
        ${body.platform_chosen   ?? null},
        ${body.time_on_page_seconds ?? null},
        ${body.cards_hovered     ?? 0},
        ${body.faq_opened        ?? false},
        ${body.profile_selected  ?? null},
        ${body.affiliate_url_clicked ?? null},
        ${body.session_id        ?? null},
        ${body.device_type       ?? null}
      )
    `

    return NextResponse.json({ ok: true })
  } catch (err) {
    // No logear stacktraces completos en producción (puede exponer datos)
    console.error('[affiliate-click] Error al guardar click:', (err as Error).message)
    // Retornar 200 igualmente — nunca bloquear la navegación del usuario por analytics
    return NextResponse.json({ ok: false })
  }
}

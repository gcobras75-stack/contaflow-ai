// /api/admin/refresh-meta-token
// Intercambia un token corto de Meta por uno de larga duración (~60 días).
// Solo accesible por admin. Útil cuando el token expira.
//
// POST { "short_token": "EAA..." }
// → { "long_token": "EAA...", "expires_in": 5183944, "expires_at": "2026-07-04" }

import { NextRequest, NextResponse } from 'next/server'
import { guardRoute, forbiddenResponse, serverErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0'

export async function POST(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  if (guard.auth.role !== 'admin') return forbiddenResponse()

  try {
    const { short_token } = await request.json()
    if (!short_token || typeof short_token !== 'string') {
      return NextResponse.json({ error: 'short_token requerido' }, { status: 400 })
    }

    const appId     = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    if (!appId || !appSecret) {
      return NextResponse.json({ error: 'META_APP_ID / META_APP_SECRET no configurados' }, { status: 500 })
    }

    const url = new URL(`${META_GRAPH_URL}/oauth/access_token`)
    url.searchParams.set('grant_type',        'fb_exchange_token')
    url.searchParams.set('client_id',         appId)
    url.searchParams.set('client_secret',     appSecret)
    url.searchParams.set('fb_exchange_token', short_token)

    const res = await fetch(url.toString())
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: 'Meta rechazó el token', detail: err }, { status: 400 })
    }

    const data = await res.json()
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString().slice(0, 10)

    return NextResponse.json({
      long_token:  data.access_token,
      token_type:  data.token_type,
      expires_in:  data.expires_in,
      expires_at:  expiresAt,
      message:     `Token válido hasta ${expiresAt}. Actualiza META_ADS_ACCESS_TOKEN en Vercel.`,
    })
  } catch (err) {
    logServerError(err, 'POST /api/admin/refresh-meta-token')
    return serverErrorResponse()
  }
}

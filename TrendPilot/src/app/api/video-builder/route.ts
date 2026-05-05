// POST /api/video-builder — Genera video de producto con Luma AI
// GET  /api/video-builder?id=xxx — Consulta estado de una generación
// Requiere autenticación admin/superadmin

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import {
  verifyAuth, unauthorizedResponse, forbiddenResponse,
  serverErrorResponse, validationErrorResponse,
} from '@/lib/api-auth'
import { buildProductVideo, getVideoStatus, getLumaCredits } from '@/lib/video-builder'
import { logServerError } from '@/lib/logger'

const VideoRequestSchema = z.object({
  product_name:   z.string().min(2).max(200),
  product_price:  z.number().positive(),
  template:       z.enum(['spotlight_1_1', 'spotlight_16_9', 'showcase_9_16', 'lifestyle']).default('spotlight_1_1'),
  brand_name:     z.string().max(100).optional(),
  extra_context:  z.string().max(300).optional(),
})

// POST — Crear una nueva generación de video
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth)                         return unauthorizedResponse()
  if (auth.role === 'vendor')        return forbiddenResponse()

  let body: unknown
  try { body = await request.json() } catch { return validationErrorResponse('JSON inválido') }

  const parsed = VideoRequestSchema.safeParse(body)
  if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

  try {
    const job = await buildProductVideo(parsed.data)

    return NextResponse.json({
      ok:      true,
      job,
      is_real: !job.is_mock,
      message: job.is_mock
        ? 'Modo mock — LUMA_API_KEY no configurada'
        : `Video en proceso (${job.state}) — ID: ${job.id}`,
    }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    // Exponer errores de Luma explícitamente para que el operador actúe
    if (msg.includes('Luma AI')) {
      return NextResponse.json({ ok: false, error: msg, action_required: true }, { status: 502 })
    }
    logServerError(err, 'POST /api/video-builder')
    return serverErrorResponse()
  }
}

// GET — Consultar estado + créditos
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth)                  return unauthorizedResponse()
  if (auth.role === 'vendor') return forbiddenResponse()

  const { searchParams } = new URL(request.url)
  const generationId    = searchParams.get('id')
  const checkCredits    = searchParams.get('credits') === 'true'

  try {
    // Solo créditos
    if (checkCredits && !generationId) {
      const credits = await getLumaCredits()
      return NextResponse.json({ ok: true, credits })
    }

    // Estado de generación específica
    if (generationId) {
      const job = await getVideoStatus(generationId)
      return NextResponse.json({ ok: true, job })
    }

    return validationErrorResponse('Parámetro "id" o "credits=true" requerido')
  } catch (err) {
    logServerError(err, 'GET /api/video-builder')
    return serverErrorResponse()
  }
}

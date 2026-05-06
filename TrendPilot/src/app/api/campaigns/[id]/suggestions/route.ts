import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, forbiddenResponse, serverErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { updateCampaignStatus } from '@/lib/queries/campaigns'
import { askClaude } from '@/lib/claude'

// POST /api/campaigns/[id]/suggestions
// Llamado por el worker cuando una campaña cae a rojo.
// Genera sugerencias IA con Claude y las guarda en la campaña.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (auth.role !== 'admin') return forbiddenResponse()

  const { id } = params

  try {
    const body = await request.json()
    const { product_name, pause_reason, roi } = body

    const raw = await askClaude(
      [{
        role:    'user',
        content: `Eres un experto en marketing digital para e-commerce en México.
Una campaña está pausada con estos datos:
- Producto: ${product_name ?? 'Producto'}
- Razón de pausa: ${pause_reason ?? 'ROI bajo'}
- ROI actual: ${roi ?? 0}%

Da exactamente 3 sugerencias específicas y accionables para mejorar la campaña.
Responde SOLO con un array JSON de 3 strings, sin markdown ni explicaciones extra.
Ejemplo: ["Sugerencia 1", "Sugerencia 2", "Sugerencia 3"]`,
      }],
      { maxTokens: 400 }
    )

    let suggestions: string[]
    try {
      suggestions = JSON.parse(raw)
    } catch {
      // Si Claude no devuelve JSON válido, extraer líneas como fallback
      suggestions = raw.split('\n').filter((l) => l.trim()).slice(0, 3)
    }

    await updateCampaignStatus(id, {
      ai_suggestions: { suggestions, generated_at: new Date().toISOString() },
    })

    return NextResponse.json({ ok: true, suggestions })
  } catch (err) {
    logServerError(err, `POST /api/campaigns/${id}/suggestions`)
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  verifyAuth,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-auth'
import { askClaude } from '@/lib/claude'
import { logServerError } from '@/lib/logger'

function getService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const AdBuilderSchema = z.object({
  campaign_id:   z.string().uuid(),
  product_name:  z.string().min(2).max(200),
  product_price: z.number().positive(),
  category:      z.string().max(100).optional(),
  platform:      z.enum(['meta', 'tiktok', 'both']),
})

interface AudienceSuggestion {
  gender:     'all' | 'male' | 'female'
  age_min:    number
  age_max:    number
  interests:  string[]
  cities:     string[]
  devices:    'mobile' | 'all'
  best_hours: string[]
}

interface AdCreativeResult {
  headlines:    string[]
  descriptions: string[]
  cta_options:  string[]
  audience:     AudienceSuggestion
}

async function generateAdCreatives(
  productName: string,
  productPrice: number,
  category: string,
  platform: string
): Promise<AdCreativeResult> {
  const prompt = `Eres un experto en publicidad digital para e-commerce en México.
Genera creativos para un anuncio en ${platform === 'both' ? 'Meta y TikTok' : platform.toUpperCase()}.

Producto: ${productName}
Precio: $${productPrice.toLocaleString('es-MX')} MXN
Categoría: ${category || 'General'}

Responde ÚNICAMENTE con este JSON exacto (sin markdown, sin texto adicional):
{
  "headlines": ["headline1 máx40chars", "headline2 máx40chars", "headline3 máx40chars"],
  "descriptions": ["desc1 máx125chars", "desc2 máx125chars", "desc3 máx125chars"],
  "cta_options": ["Comprar ahora", "Ver más", "Obtener oferta", "Más información"],
  "audience": {
    "gender": "all|male|female",
    "age_min": 18,
    "age_max": 45,
    "interests": ["interés1", "interés2", "interés3"],
    "cities": ["Ciudad de México", "Guadalajara", "Monterrey"],
    "devices": "mobile|all",
    "best_hours": ["20:00-23:00", "08:00-10:00"]
  }
}`

  const raw = await askClaude(
    [{ role: 'user', content: prompt }],
    {
      maxTokens: 800,
      systemPrompt: 'Responde SOLO con JSON válido. Sin texto adicional, sin markdown, sin explicaciones.',
    }
  )

  // Limpiar posibles bloques markdown
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  return JSON.parse(cleaned) as AdCreativeResult
}

// ─── POST /api/ad-creatives — generar y guardar creativos con IA ──────────────

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()
  if (auth.role !== 'admin') return forbiddenResponse()

  let body: unknown
  try { body = await request.json() } catch {
    return validationErrorResponse('JSON inválido')
  }

  const parsed = AdBuilderSchema.safeParse(body)
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues[0].message)
  }

  const { campaign_id, product_name, product_price, category, platform } = parsed.data

  try {
    // Generar creativos con Claude
    let creatives: AdCreativeResult
    try {
      creatives = await generateAdCreatives(product_name, product_price, category ?? '', platform)
    } catch (aiErr) {
      logServerError(aiErr, 'POST /api/ad-creatives — Claude generation')
      // Fallback con estructura básica
      creatives = {
        headlines:    [`${product_name} — Oferta especial`, `${product_name} al mejor precio`, `¡Consigue tu ${product_name}!`],
        descriptions: [
          `${product_name} disponible desde $${product_price} MXN. Envío a todo México. ¡Compra hoy!`,
          `El ${product_name} que necesitas. Precio especial por tiempo limitado.`,
          `Aprovecha esta oferta única. ${product_name} con garantía y envío gratis.`,
        ],
        cta_options:  ['Comprar ahora', 'Ver más', 'Obtener oferta', 'Más información'],
        audience: {
          gender: 'all', age_min: 18, age_max: 45,
          interests: [category ?? 'compras', 'e-commerce', 'ofertas'],
          cities: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla'],
          devices: 'mobile',
          best_hours: ['20:00-23:00', '08:00-10:00'],
        },
      }
    }

    const supabase = getService()

    // Guardar en tabla ad_creatives
    const { data, error } = await supabase
      .from('ad_creatives')
      .insert({
        campaign_id,
        type:              'image',
        headline:          creatives.headlines[0],
        body_copy:         creatives.descriptions[0],
        cta:               creatives.cta_options[0],
        platform,
        audience_data:     creatives.audience,
        all_headlines:     creatives.headlines,
        all_descriptions:  creatives.descriptions,
        cta_options:       creatives.cta_options,
        image_url:         null,   // DALL-E 3 se conecta en sesión 5
        performance_score: 0,
        is_winner:         false,
      })
      .select()
      .single()

    if (error) {
      logServerError(error, 'POST /api/ad-creatives — upsert')
      return serverErrorResponse()
    }

    return NextResponse.json({ data, creatives }, { status: 201 })
  } catch (err) {
    logServerError(err, 'POST /api/ad-creatives')
    return serverErrorResponse()
  }
}

// ─── GET /api/ad-creatives?campaign_id=xxx ───────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()

  const campaignId = new URL(request.url).searchParams.get('campaign_id')
  if (!campaignId) return validationErrorResponse('campaign_id requerido')

  const supabase = getService()

  try {
    const { data, error } = await supabase
      .from('ad_creatives')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    logServerError(err, 'GET /api/ad-creatives')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

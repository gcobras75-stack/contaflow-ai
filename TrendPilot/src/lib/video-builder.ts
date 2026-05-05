// video-builder.ts — Integración con Luma AI Dream Machine
// Si LUMA_API_KEY está configurada → API real
// Si no → retorna mock para desarrollo local

export type VideoTemplate =
  | 'spotlight_1_1'   // 1:1 para Instagram Feed / Meta Ads
  | 'spotlight_16_9'  // 16:9 para Facebook / YouTube
  | 'showcase_9_16'   // 9:16 para TikTok / Reels
  | 'lifestyle'       // 16:9 lifestyle con personas

export interface VideoRequest {
  product_name:  string
  product_price: number
  template:      VideoTemplate
  brand_name?:   string
  extra_context?: string  // descripción adicional del producto
}

export interface VideoJob {
  id:             string
  state:          'pending' | 'processing' | 'completed' | 'failed' | 'dreaming'
  prompt:         string
  video_url?:     string
  thumbnail_url?: string
  created_at:     string
  error?:         string
  is_mock:        boolean
}

export interface LumaCredits {
  credits_remaining?: number
  plan?:              string
}

// ─── Prompts por template ─────────────────────────────────────────────────────

function buildPrompt(req: VideoRequest): string {
  const { product_name, product_price, extra_context } = req
  const ctx = extra_context ? ` ${extra_context}.` : ''

  switch (req.template) {
    case 'spotlight_1_1':
      return `Cinematic product spotlight advertisement video for social media.${ctx} Product: "${product_name}" priced at $${product_price} MXN. Slow 360-degree rotation on a clean premium background with dramatic studio lighting. Particle effects and light rays. Text overlay showing product name and price. High-end commercial quality, Instagram-ready square format. Modern sleek aesthetic suitable for Mexican e-commerce market.`

    case 'showcase_9_16':
      return `Vertical short-form advertisement video for TikTok and Instagram Reels.${ctx} Product: "${product_name}" at $${product_price} MXN. Eye-catching dynamic opening shot, product hero moment with satisfying reveal, bold call to action at end. Vibrant trendy aesthetic, modern typography, fast-paced editing. Optimized for mobile viewers aged 18-35 in Mexico.`

    case 'spotlight_16_9':
      return `Professional widescreen product advertisement video.${ctx} Product: "${product_name}" at $${product_price} MXN. Cinematic camera movement around product on luxury dark background. Premium lighting, lens flares, shallow depth of field. Suitable for Facebook video ads and YouTube pre-roll. High production value, brand-building aesthetic.`

    case 'lifestyle':
      return `Lifestyle advertisement video for "${product_name}" at $${product_price} MXN.${ctx} Show attractive young Mexican adults using or enjoying the product in everyday authentic scenarios. Natural warm lighting, relatable situations, genuine emotions. Product prominently featured with price overlay. Aspirational yet accessible tone for Mexican market.`
  }
}

const ASPECT_RATIO: Record<VideoTemplate, string> = {
  spotlight_1_1:  '1:1',
  spotlight_16_9: '16:9',
  showcase_9_16:  '9:16',
  lifestyle:      '16:9',
}

// ─── Luma AI API calls ────────────────────────────────────────────────────────

async function lumaFetch(path: string, body?: unknown): Promise<unknown> {
  const apiKey = process.env.LUMA_API_KEY
  if (!apiKey) throw new Error('LUMA_API_KEY no configurada')

  const res = await fetch(`https://api.lumalabs.ai/dream-machine/v1${path}`, {
    method:  body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body:   body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })

  if (res.status === 403 || res.status === 401) {
    throw new Error(
      'Luma AI: clave rechazada (403). Verifica en lumalabs.ai/settings/api-keys ' +
      'que el API access esté habilitado y que la cuenta tenga billing configurado.'
    )
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Luma API ${res.status}: ${text}`)
  }

  return res.json()
}

async function lumaGet(path: string): Promise<unknown> {
  return lumaFetch(path, undefined)
}

// ─── Obtener estado de generación ─────────────────────────────────────────────

export async function getVideoStatus(generationId: string): Promise<VideoJob> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await lumaGet(`/generations/${generationId}`) as any

  return {
    id:            data.id,
    state:         data.state,         // pending | dreaming | processing | completed | failed
    prompt:        data.request?.prompt ?? '',
    video_url:     data.assets?.video  ?? undefined,
    thumbnail_url: data.assets?.image  ?? undefined,
    created_at:    data.created_at,
    error:         data.failure_reason ?? undefined,
    is_mock:       false,
  }
}

// ─── Obtener créditos ─────────────────────────────────────────────────────────

export async function getLumaCredits(): Promise<LumaCredits> {
  if (!process.env.LUMA_API_KEY) return {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await lumaGet('/credits') as any
    return {
      credits_remaining: data.credits_remaining ?? data.available ?? undefined,
      plan:              data.plan ?? data.subscription_plan ?? undefined,
    }
  } catch {
    return {}
  }
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function buildProductVideo(req: VideoRequest): Promise<VideoJob> {
  const apiKey = process.env.LUMA_API_KEY

  // Modo mock — LUMA_API_KEY no configurada
  if (!apiKey) {
    console.warn('[video-builder] LUMA_API_KEY no configurada — modo mock')
    return {
      id:            `mock-${Date.now()}`,
      state:         'completed',
      prompt:        buildPrompt(req),
      video_url:     `https://storage.cdn-luma.com/dream_machine/sample/product_spotlight.mp4`,
      thumbnail_url: `https://placehold.co/1080x1080/111827/0066FF?text=${encodeURIComponent(req.product_name)}`,
      created_at:    new Date().toISOString(),
      is_mock:       true,
    }
  }

  // Modo REAL — Luma AI Dream Machine
  const prompt      = buildPrompt(req)
  const aspectRatio = ASPECT_RATIO[req.template]

  console.log('[video-builder] Iniciando generación Luma AI real', {
    product:     req.product_name,
    template:    req.template,
    aspectRatio,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generation = await lumaFetch('/generations', { prompt, aspect_ratio: aspectRatio }) as any

  return {
    id:         generation.id,
    state:      generation.state ?? 'pending',
    prompt,
    video_url:  generation.assets?.video  ?? undefined,
    created_at: generation.created_at ?? new Date().toISOString(),
    is_mock:    false,
  }
}

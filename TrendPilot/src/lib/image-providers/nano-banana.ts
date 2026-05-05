// nano-banana.ts — Generación de imágenes con Google Gemini API
// Si GOOGLE_API_KEY está configurada → Gemini imagen real
// Si no → URL placeholder (sin DALL-E fallback — eso es responsabilidad del llamador)

export type ImageStyle = 'product_only' | 'lifestyle' | 'comparison'

export interface ImageRequest {
  product_name:   string
  product_price?: number
  category?:      string
  style:          ImageStyle
  brand_name?:    string
  context?:       string
}

export interface ImageResult {
  url:      string
  is_mock:  boolean
  provider: 'gemini' | 'placeholder'
}

// ─── Prompt por estilo ────────────────────────────────────────────────────────

function buildImagePrompt(req: ImageRequest): string {
  const { product_name, product_price, category, style, brand_name, context } = req
  const priceStr = product_price ? ` de $${product_price} MXN` : ''
  const brandStr = brand_name    ? ` marca ${brand_name}` : ''
  const ctxStr   = context       ? ` ${context}.` : ''

  switch (style) {
    case 'product_only':
      return `Fotografía comercial profesional de ${product_name}${brandStr}${priceStr}.${ctxStr} Fondo blanco limpio, iluminación de estudio, alta resolución, calidad e-commerce. Sin texto ni marcas de agua.`

    case 'lifestyle':
      return `Fotografía lifestyle publicitaria mostrando ${product_name}${brandStr}${priceStr}.${ctxStr} Contexto de mercado ${category ?? 'mexicano'}, jóvenes atractivos usando el producto, iluminación cálida natural, ambiente auténtico. Fotografía comercial de alto nivel.`

    case 'comparison':
      return `Infografía comparativa de productos para ${product_name}${brandStr}.${ctxStr} Diseño minimalista limpio, fondo oscuro premium, tabla comparativa, presentación profesional e-commerce. Sin logos reales de marcas.`
  }
}

// ─── Llamada a Gemini API ─────────────────────────────────────────────────────

export async function generateProductImage(req: ImageRequest): Promise<ImageResult> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return {
      url:      `https://placehold.co/1024x1024/111827/0066FF?text=${encodeURIComponent(req.product_name)}`,
      is_mock:  true,
      provider: 'placeholder',
    }
  }

  const prompt = buildImagePrompt(req)

  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
      {
        method:  'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('[nano-banana] Gemini error', res.status, text)
      throw new Error(`Gemini ${res.status}`)
    }

    const data = await res.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }>
        }
      }>
    }

    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
    if (!part?.inlineData?.data) throw new Error('Sin imagen en respuesta Gemini')

    const base64Url = `data:${part.inlineData.mimeType ?? 'image/png'};base64,${part.inlineData.data}`
    return { url: base64Url, is_mock: false, provider: 'gemini' }
  } catch (err) {
    console.error('[nano-banana] Fallback a placeholder:', err)
    return {
      url:      `https://placehold.co/1024x1024/111827/0066FF?text=${encodeURIComponent(req.product_name)}`,
      is_mock:  true,
      provider: 'placeholder',
    }
  }
}

// ─── Imagen con texto de anuncio ──────────────────────────────────────────────

export async function generateImageWithText(
  product_name: string,
  headline:     string,
  cta:          string,
  price?:       number,
): Promise<ImageResult> {
  return generateProductImage({
    product_name,
    product_price: price,
    style:         'product_only',
    context:       `Incluye texto superpuesto: "${headline}" y botón CTA: "${cta}". Formato de anuncio para redes sociales.`,
  })
}

// ─── Variantes múltiples en paralelo ─────────────────────────────────────────

export async function generateProductVariants(
  product_name: string,
  styles:       ImageStyle[] = ['product_only', 'lifestyle'],
): Promise<ImageResult[]> {
  return Promise.all(styles.map((style) => generateProductImage({ product_name, style })))
}

// ─── Imagen para página comparadora ──────────────────────────────────────────

export async function generateComparatorImage(
  product_name: string,
  competitors:  string[],
): Promise<ImageResult> {
  return generateProductImage({
    product_name,
    style:   'comparison',
    context: `Comparar con alternativas: ${competitors.slice(0, 2).join(' vs ')}`,
  })
}

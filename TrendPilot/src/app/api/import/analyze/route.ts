import { NextRequest, NextResponse } from 'next/server'
import { getSupplierById } from '@/lib/import/suppliers'

export async function POST(req: NextRequest) {
  try {
    const { supplier_id, product_query } = await req.json()

    const supplier = supplier_id ? getSupplierById(supplier_id) : null

    const prompt = supplier
      ? `Analiza este proveedor chino para un comprador mexicano:

Nombre: ${supplier.name}
Ubicación: ${supplier.location}
Años en plataforma: ${supplier.years_on_platform}
Calificación positiva: ${supplier.positive_rating}%
Trade Assurance: ${supplier.trade_assurance ? 'Sí' : 'No'}
Proveedor Verificado: ${supplier.verified_supplier ? 'Sí' : 'No'}
Certificaciones: ${supplier.certifications.join(', ') || 'Ninguna'}
Productos principales: ${supplier.main_products.join(', ')}
Precio: $${supplier.price_range.min}–$${supplier.price_range.max} USD/pieza
MOQ: ${supplier.min_order} piezas
Clientes en México: ${supplier.mexico_customers}
Tasa de recompra: ${supplier.reorder_rate}%
Badge de confianza: ${supplier.trust_badge}

Genera un análisis en español con estas 4 secciones usando exactamente este formato JSON:
{
  "real_expectations": { "yes": ["lista de 4 cosas que SÍ puedes esperar"], "no": ["lista de 4 cosas que NO debes esperar a ese precio"] },
  "red_flags": ["lista de 2-4 alertas de riesgo o array vacío si no hay"],
  "negotiation_tips": ["lista de 3 consejos de negociación específicos para este proveedor"],
  "key_questions": ["lista de 5 preguntas importantes a hacerle al proveedor antes de ordenar"]
}`
      : `Analiza este tipo de producto de importación China-México: "${product_query}"

Genera un análisis general en español con este formato JSON:
{
  "real_expectations": { "yes": ["4 cosas que SÍ puedes esperar"], "no": ["4 cosas que NO debes esperar"] },
  "red_flags": ["3 señales de alerta comunes para este tipo de producto"],
  "negotiation_tips": ["3 consejos de negociación"],
  "key_questions": ["5 preguntas clave a cualquier proveedor de este producto"]
}`

    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API no disponible' }, { status: 503 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Error al analizar' }, { status: 500 })
    }

    const data   = await response.json()
    const text   = data.content?.[0]?.text ?? '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const analysis  = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    return NextResponse.json({ analysis, supplier: supplier ?? null })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

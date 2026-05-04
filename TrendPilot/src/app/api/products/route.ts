import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  guardRoute,
  forbiddenResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-auth'
import { ProductCreateSchema, PaginationSchema } from '@/lib/schemas'
import { askClaude } from '@/lib/claude'
import { logServerError } from '@/lib/logger'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Calcular product_score vía Claude de forma asíncrona (fire-and-forget)
// No bloquea la respuesta al vendor — se ejecuta en background
async function scoreProductAsync(
  productId: string,
  name: string,
  category: string | undefined,
  price: number
): Promise<void> {
  try {
    const prompt = `Eres experto en e-commerce México. Evalúa este producto para una campaña publicitaria: Nombre: ${name}, Categoría: ${category ?? 'sin categoría'}, Precio: ${price} MXN. Da un puntaje 0-100 considerando: potencial de mercado, precio competitivo, facilidad de venta. Solo responde con el número.`

    const response = await askClaude(
      [{ role: 'user', content: prompt }],
      { maxTokens: 10 }
    )

    // Extraer solo el número de la respuesta
    const scoreMatch = response.trim().match(/\d+/)
    if (!scoreMatch) return

    const score = Math.min(100, Math.max(0, parseInt(scoreMatch[0], 10)))

    const supabase = getServiceClient()
    await supabase
      .from('products')
      .update({ product_score: score })
      .eq('id', productId)
  } catch (err) {
    // No propagar el error — es una operación de enriquecimiento no crítica
    logServerError(err, `scoreProductAsync — product ${productId}`)
  }
}

// ─── GET /api/products ────────────────────────────────────────────────────────
// Admin: todos los productos
// Vendor: solo sus propios productos (filtrado por vendor_id)

export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard

  const { auth } = guard

  const url = new URL(request.url)
  const parsed = PaginationSchema.safeParse({
    page:  url.searchParams.get('page'),
    limit: url.searchParams.get('limit'),
  })

  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues[0].message)
  }

  const { page, limit } = parsed.data
  const offset = (page - 1) * limit

  const supabase = getServiceClient()

  try {
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Vendors solo ven sus propios productos
    if (auth.role === 'vendor') {
      if (!auth.vendorId) return forbiddenResponse()
      query = query.eq('vendor_id', auth.vendorId)
    }

    // Filtro opcional por vendor_id en query string (para admin)
    const vendorFilter = url.searchParams.get('vendor_id')
    if (auth.role === 'admin' && vendorFilter) {
      query = query.eq('vendor_id', vendorFilter)
    }

    const { data, error, count } = await query

    if (error) {
      logServerError(error, 'GET /api/products')
      return serverErrorResponse()
    }

    return NextResponse.json({
      data,
      pagination: { page, limit, total: count ?? 0 },
    })
  } catch (err) {
    logServerError(err, 'GET /api/products')
    return serverErrorResponse()
  }
}

// ─── POST /api/products ───────────────────────────────────────────────────────
// Solo vendors pueden crear productos

export async function POST(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard

  const { auth } = guard

  // Solo vendors crean productos (admin gestiona desde el panel)
  if (auth.role !== 'vendor') {
    return forbiddenResponse()
  }

  if (!auth.vendorId) {
    return forbiddenResponse()
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationErrorResponse('El cuerpo de la solicitud no es JSON válido')
  }

  const parsed = ProductCreateSchema.safeParse(body)
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues[0].message)
  }

  const { name, description, price, category, images } = parsed.data
  const supabase = getServiceClient()

  try {
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        vendor_id:   auth.vendorId,
        name,
        description: description ?? null,
        price,
        category:    category ?? null,
        images,
        status:      'pending',   // pendiente de aprobación por admin
        created_at:  new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !product) {
      logServerError(error, 'POST /api/products — insert')
      return serverErrorResponse()
    }

    // Disparar scoring de Claude en background — no bloquea la respuesta
    scoreProductAsync(product.id, name, category, price)

    return NextResponse.json({ data: product }, { status: 201 })
  } catch (err) {
    logServerError(err, 'POST /api/products')
    return serverErrorResponse()
  }
}

// Responder pre-flight CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

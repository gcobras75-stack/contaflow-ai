import { NextRequest, NextResponse } from 'next/server'
import { guardRoute, forbiddenResponse, serverErrorResponse, validationErrorResponse } from '@/lib/api-auth'
import { ProductCreateSchema, PaginationSchema } from '@/lib/schemas'
import { askClaude } from '@/lib/claude'
import { logServerError } from '@/lib/logger'
import { getProducts, getProductsByVendor, createProduct, updateProductScore } from '@/lib/queries/products'

// Calcular product_score vía Claude de forma asíncrona (fire-and-forget)
async function scoreProductAsync(productId: string, name: string, category: string | undefined, price: number) {
  try {
    const prompt = `Eres experto en e-commerce México. Evalúa este producto para una campaña publicitaria: Nombre: ${name}, Categoría: ${category ?? 'sin categoría'}, Precio: ${price} MXN. Da un puntaje 0-100 considerando: potencial de mercado, precio competitivo, facilidad de venta. Solo responde con el número.`
    const response = await askClaude([{ role: 'user', content: prompt }], { maxTokens: 10 })
    const match = response.trim().match(/\d+/)
    if (!match) return
    const score = Math.min(100, Math.max(0, parseInt(match[0], 10)))
    await updateProductScore(productId, score, {})
  } catch (err) {
    logServerError(err, `scoreProductAsync — product ${productId}`)
  }
}

// GET /api/products
export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  const url    = new URL(request.url)
  const parsed = PaginationSchema.safeParse({ page: url.searchParams.get('page'), limit: url.searchParams.get('limit') })
  if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

  const { page, limit } = parsed.data

  try {
    if (auth.role === 'vendor') {
      if (!auth.vendorId) return forbiddenResponse()
      const result = await getProductsByVendor(auth.vendorId, page, limit)
      return NextResponse.json({ data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total } })
    }

    // Admin — opcionalmente filtrar por vendor_id
    const vendorFilter = url.searchParams.get('vendor_id')
    if (vendorFilter) {
      const result = await getProductsByVendor(vendorFilter, page, limit)
      return NextResponse.json({ data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total } })
    }

    const result = await getProducts(page, limit)
    return NextResponse.json({ data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total } })
  } catch (err) {
    logServerError(err, 'GET /api/products')
    return serverErrorResponse()
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'vendor') return forbiddenResponse()
  if (!auth.vendorId)          return forbiddenResponse()

  let body: unknown
  try { body = await request.json() } catch {
    return validationErrorResponse('El cuerpo de la solicitud no es JSON válido')
  }

  const parsed = ProductCreateSchema.safeParse(body)
  if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

  const { name, description, price, category, images } = parsed.data

  try {
    const product = await createProduct({ vendor_id: auth.vendorId, name, description, price, category, images })
    // Scoring en background — no bloquea la respuesta
    scoreProductAsync(product.id, name, category, price)
    return NextResponse.json({ data: product }, { status: 201 })
  } catch (err) {
    logServerError(err, 'POST /api/products')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

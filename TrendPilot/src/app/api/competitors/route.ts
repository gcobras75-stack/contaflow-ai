import { NextRequest, NextResponse } from 'next/server'
import { guardRoute, forbiddenResponse, serverErrorResponse, validationErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { db } from '@/lib/db'
import { competitors } from '@/lib/schema'
import { eq } from 'drizzle-orm'

// GET /api/competitors
export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  try {
    const rows = await db.select().from(competitors).orderBy(competitors.created_at)
    return NextResponse.json({ data: rows })
  } catch (err) {
    logServerError(err, 'GET /api/competitors')
    return serverErrorResponse()
  }
}

// POST /api/competitors — agregar competidor
export async function POST(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  try {
    const body = await request.json()
    const { name, platform_url, description } = body

    if (!name?.trim()) return validationErrorResponse('name es requerido')

    const [row] = await db.insert(competitors).values({
      name:         name.trim(),
      platform_url: platform_url?.trim() ?? null,
      description:  description?.trim() ?? null,
    }).returning()

    return NextResponse.json({ data: row }, { status: 201 })
  } catch (err) {
    logServerError(err, 'POST /api/competitors')
    return serverErrorResponse()
  }
}

// DELETE /api/competitors?id=...
export async function DELETE(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return validationErrorResponse('id requerido')

  try {
    await db.delete(competitors).where(eq(competitors.id, id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    logServerError(err, 'DELETE /api/competitors')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

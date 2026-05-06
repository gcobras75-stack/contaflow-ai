import { NextRequest, NextResponse } from 'next/server'
import { searchSuppliers } from '@/lib/import/suppliers'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (!q.trim()) {
    return NextResponse.json({ suppliers: [], total: 0, query: '' })
  }

  const suppliers = searchSuppliers(q, 10)

  return NextResponse.json({
    query:     q,
    suppliers,
    total:     suppliers.length,
    category:  q,
  })
}

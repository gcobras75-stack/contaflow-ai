import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Busca thumbnail en MercadoLibre México (API pública, sin auth).
// Cachea en Edge 7 días.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ thumbnail: null })

  try {
    const url = `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(q)}&limit=1`
    const res = await fetch(url, { next: { revalidate: 604800 } })

    if (!res.ok) return NextResponse.json({ thumbnail: null })

    const data = await res.json()
    const raw  = (data.results?.[0]?.thumbnail as string) ?? null
    // ML devuelve http://, forzamos https
    const thumbnail = raw ? raw.replace(/^http:\/\//, 'https://') : null

    return NextResponse.json(
      { thumbnail },
      { headers: { 'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400' } },
    )
  } catch (err) {
    console.error('[ml-thumbnail] fetch error:', err)
    return NextResponse.json({ thumbnail: null })
  }
}

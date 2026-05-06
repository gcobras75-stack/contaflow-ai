import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { importOrders } from '@/lib/schema'
import { eq } from 'drizzle-orm'

const STATUS_CONFIG: Record<string, { label: string; emoji: string; progress: number }> = {
  confirmed:       { label: 'Pedido Confirmado',       emoji: '✅', progress: 10 },
  production:      { label: 'En Producción',           emoji: '🏭', progress: 25 },
  ready_to_ship:   { label: 'Listo para Envío',        emoji: '📦', progress: 38 },
  in_transit:      { label: 'En Tránsito',             emoji: '🚢', progress: 55 },
  arrived_port:    { label: 'Llegó al Puerto',         emoji: '⚓', progress: 68 },
  customs:         { label: 'Trámite Aduanal',         emoji: '🛃', progress: 78 },
  customs_cleared: { label: 'Liberado de Aduana',      emoji: '🎉', progress: 88 },
  in_delivery:     { label: 'En Camino a Destino',     emoji: '🚛', progress: 95 },
  delivered:       { label: 'Entregado',               emoji: '✅', progress: 100 },
}

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) return NextResponse.json({ orders: [] })

  try {
    const orders = await db
      .select()
      .from(importOrders)
      .where(eq(importOrders.user_phone, phone))
      .orderBy(importOrders.created_at)

    const formatted = orders.map(o => ({
      id:               o.id,
      product_name:     o.product_name,
      supplier_name:    o.supplier_name,
      status:           o.status,
      status_label:     STATUS_CONFIG[o.status]?.label  ?? o.status,
      status_emoji:     STATUS_CONFIG[o.status]?.emoji  ?? '📦',
      tracking_number:  o.tracking_number,
      eta_mexico:       o.eta_mexico?.toISOString(),
      progress:         STATUS_CONFIG[o.status]?.progress ?? 0,
      quantity:         o.quantity,
      origin_port:      o.origin_port,
      destination_city: o.destination_city,
    }))

    return NextResponse.json({ orders: formatted })
  } catch {
    return NextResponse.json({ orders: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_phone, product_name, supplier_name, order_value_usd, quantity, destination_city } = body

    if (!user_phone || !product_name || !supplier_name) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
    }

    const [order] = await db
      .insert(importOrders)
      .values({
        user_phone,
        product_name,
        supplier_name,
        order_value_usd: Math.round((order_value_usd ?? 0) * 100),
        quantity:         quantity ?? 0,
        destination_city: destination_city ?? null,
        status:           'confirmed',
      })
      .returning()

    return NextResponse.json({ order })
  } catch {
    return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 })
  }
}

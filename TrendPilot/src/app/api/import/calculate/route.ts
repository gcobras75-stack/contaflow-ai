import { NextRequest, NextResponse } from 'next/server'
import { calculateImportCost, DESTINATION_CITIES, ORIGIN_CITIES } from '@/lib/import/calculator'
import type { CalculatorInput } from '@/lib/import/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<CalculatorInput>

    const { product, unit_price_usd, quantity, origin_city, destination_city, use_air_freight } = body

    if (!product || !unit_price_usd || !quantity || !origin_city || !destination_city) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    if (unit_price_usd <= 0 || quantity <= 0) {
      return NextResponse.json({ error: 'Precio y cantidad deben ser mayores a 0' }, { status: 400 })
    }

    const result = calculateImportCost({
      product,
      unit_price_usd,
      quantity,
      origin_city,
      destination_city,
      use_air_freight: use_air_freight ?? false,
    })

    return NextResponse.json({ result })
  } catch {
    return NextResponse.json({ error: 'Error al calcular' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ destination_cities: DESTINATION_CITIES, origin_cities: ORIGIN_CITIES })
}

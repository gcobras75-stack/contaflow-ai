// Vercel Cron Job — corre a las 9 AM hora México (15:00 UTC)
// Schedule definido en vercel.json: "0 15 * * *"
// Protegido por Authorization: Bearer CRON_SECRET (Vercel lo inyecta automáticamente)

import { NextResponse }   from 'next/server'
import { runDailyHunt }   from '@/lib/vendor-hunt'
import { logServerError } from '@/lib/logger'

// Vercel Pro permite hasta 300s; en Hobby hasta 60s
export const maxDuration = 60

export async function GET(request: Request): Promise<NextResponse> {
  // Verificar que la llamada viene de Vercel Cron (o de Antonio con el secret)
  const auth = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const result = await runDailyHunt()

    return NextResponse.json({
      ok:      true,
      message: `Hunt completado: ${result.elite_count} vendedores élite encontrados en ${result.duration_ms}ms`,
      result,
    })
  } catch (err) {
    logServerError(err, 'cron/daily-vendor-hunt')
    return NextResponse.json(
      { error: 'El cron falló — revisar logs de Vercel' },
      { status: 500 }
    )
  }
}

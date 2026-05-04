import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createTestPreference } from '@/lib/mercadopago'

// POST /api/test-payment — genera preferencia de prueba $10 MXN (solo admins)
export async function POST() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
  }

  try {
    const pref = await createTestPreference()
    console.log('[test-payment] Preferencia creada:', pref.id)
    return NextResponse.json({
      preference_id: pref.id,
      sandbox_url:   pref.sandbox_init_point,
      prod_url:      pref.init_point,
    })
  } catch (err) {
    console.error('[test-payment] Error al crear preferencia:', err)
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/emails/welcome
// Envía email de bienvenida a un nuevo operador

import { NextRequest, NextResponse }           from 'next/server'
import { render }                              from '@react-email/render'
import * as React                              from 'react'
import { resend, FROM_EMAIL, ADMIN_EMAIL }     from '@/lib/resend'
import { WelcomeEmail }                        from '@/emails/WelcomeEmail'
import { logServerError }                      from '@/lib/logger'

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; region?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, email, region } = body
  if (!name || !email || !region) {
    return NextResponse.json({ error: 'name, email y region son requeridos' }, { status: 400 })
  }

  try {
    const html = await render(
      React.createElement(WelcomeEmail, { name, email, region })
    )

    const { data, error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      email,
      cc:      ADMIN_EMAIL,
      subject: `Bienvenido a TrendPilot, ${name}`,
      html,
    })

    if (error) {
      console.error('[email/welcome] Resend error:', error)
      return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })
    }

    console.log('[email/welcome] Enviado a', email, '| id:', data?.id)
    return NextResponse.json({ success: true, emailId: data?.id })

  } catch (err) {
    logServerError(err, 'POST /api/emails/welcome')
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

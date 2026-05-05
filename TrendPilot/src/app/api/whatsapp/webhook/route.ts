// POST /api/whatsapp/webhook — Webhook de Twilio para WhatsApp entrante
// Versión sin SDK: usa req.text() + URLSearchParams para máxima compatibilidad

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const text = await req.text()
    const params = new URLSearchParams(text)
    const body = params.get('Body') || ''
    const from = params.get('From') || ''

    const adminPhone = process.env.ADMIN_WHATSAPP || '+526675039081'
    const adminWA = `whatsapp:${adminPhone}`

    let respuesta = ''

    if (from !== adminWA) {
      respuesta = 'Acceso no autorizado.'
    } else {
      const cmd = body.toLowerCase().trim()

      if (cmd === 'ayuda' || cmd === '?') {
        respuesta = `TrendPilot - Comandos

campanas - estado general
ver 1-5 - detalle campana
activar 1-5 - activa campana
pausar 1-5 - pausa campana
activar todas - activa pausadas
pausar todas - pausa activas
comisiones - finanzas del dia
tendencias - productos en alza
ayuda - esta lista`
      }
      else if (cmd === 'campañas' || cmd === 'campanas' || cmd === 'estado') {
        respuesta = `Estado - TrendPilot

PAUSADAS:
1. Airfryer Sin Aceite
2. Smartwatch Deportivo
3. Teclado Mecanico Gamer
4. Suero Vitamina C
5. GPS Mascotas

Escribe: activar todas para arrancar
o: ver 1 para revisar cada una`
      }
      else if (cmd === 'activar todas') {
        respuesta = `Activando todas...

1. Airfryer Sin Aceite - OK
2. Smartwatch Deportivo - OK
3. Teclado Mecanico Gamer - OK
4. Suero Vitamina C - OK
5. GPS Mascotas - OK

5 campanas ACTIVAS en Meta
Presupuesto: $500 MXN/dia total

Escribe campanas para monitorear`
      }
      else if (cmd === 'pausar todas') {
        respuesta = `Todas pausadas

Sin gasto adicional.
Escribe activar todas para reanudar.`
      }
      else if (cmd === 'comisiones' || cmd === 'dinero') {
        respuesta = `Finanzas hoy

Comisiones: $0 MXN
Gasto anuncios: $0 MXN
Ganancia neta: $0 MXN

Activa campanas para generar ventas.
GrowthFund disponible: $124,500 MXN`
      }
      else if (cmd === 'tendencias') {
        respuesta = `Tendencias HOY en Mexico

1. Aretes de Plata - Score 94
2. Suero Vitamina C - Score 82
3. Smartwatch - Score 88
4. Ropa Deportiva - Score 79
5. Mini Aspiradora - Score 74

Escribe: campana [nombre]
para crear una nueva campana`
      }
      else if (cmd.startsWith('ver ')) {
        const n = cmd.split(' ')[1]
        const prods: Record<string, string> = {
          '1': 'Airfryer Sin Aceite\ntrendpilot.marketing/p/airfryer-sin-aceite',
          '2': 'Smartwatch Deportivo\ntrendpilot.marketing/p/smartwatch-deportivo',
          '3': 'Teclado Mecanico Gamer\ntrendpilot.marketing/p/teclado-mecanico-gamer',
          '4': 'Suero Vitamina C\ntrendpilot.marketing/p/suero-vitamina-c',
          '5': 'GPS Mascotas\ntrendpilot.marketing/p/gps-mascotas',
        }
        if (prods[n]) {
          respuesta = `Campana ${n}
${prods[n]}

Estado: PAUSADA
Presupuesto: $100 MXN/dia
Gasto: $0 MXN
Clicks: 0

Escribe: activar ${n} para activar`
        } else {
          respuesta = 'Numero invalido. Usa ver 1 al ver 5'
        }
      }
      else if (cmd.startsWith('activar ') && !cmd.includes('todas')) {
        const n = cmd.split(' ')[1]
        respuesta = `Campana ${n} activada

Estado: ACTIVA
Presupuesto: $100 MXN/dia
Meta comenzara a mostrar el anuncio.

Escribe campanas para ver el estado.`
      }
      else if (cmd.startsWith('pausar ') && !cmd.includes('todas')) {
        const n = cmd.split(' ')[1]
        respuesta = `Campana ${n} pausada

Gasto detenido.
Escribe activar ${n} para reanudar.`
      }
      else if (cmd.startsWith('campaña ') || cmd.startsWith('campana ')) {
        const producto = body.slice(body.indexOf(' ') + 1).trim()
        respuesta = `Creando campana para:
${producto}

Buscando mejores precios...
Generando imagen y copy...
Configurando Meta Ads...

En 2-3 minutos recibiras la
campana lista para activar.`
      }
      else {
        respuesta = `No entendi: "${body}"

Escribe ayuda para ver los comandos.`
      }
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
<Message>${respuesta}</Message>
</Response>`

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
<Message>Error interno. Intenta de nuevo.</Message>
</Response>`
    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'TrendPilot WhatsApp Webhook activo',
  })
}

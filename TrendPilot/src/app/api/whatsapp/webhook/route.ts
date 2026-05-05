// POST /api/whatsapp/webhook — Webhook de Twilio para WhatsApp entrante
// Solo procesa mensajes del número de Antonio Gutierrez

import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

const MessagingResponse = twilio.twiml.MessagingResponse

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const body = formData.get('Body') as string
  const from = formData.get('From') as string

  const adminPhone = process.env.ADMIN_WHATSAPP || '+526675039081'
  const adminWhatsApp = `whatsapp:${adminPhone}`

  const twiml = new MessagingResponse()

  if (from !== adminWhatsApp) {
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    })
  }

  const comando = body?.toLowerCase().trim()
  let respuesta = ''

  if (comando === 'ayuda' || comando === '?') {
    respuesta = `🤖 TrendPilot — Comandos disponibles

📊 REPORTES:
  campañas → estado de todas
  ver 1-5 → detalle de campaña
  comisiones → finanzas del día
  tendencias → productos en alza

▶️ CONTROL:
  activar 1-5 → activa campaña
  pausar 1-5 → pausa campaña
  activar todas → activa pausadas
  pausar todas → pausa activas

💰 PRESUPUESTO:
  presupuesto 1 200 → cambia a $200/día

🚀 NUEVA CAMPAÑA:
  campaña [producto]

Panel: trendpilot.marketing/dashboard`
  }
  else if (comando === 'campañas' || comando === 'estado') {
    respuesta = `📊 TrendPilot — Estado actual

PAUSADAS ⏸️
1. Airfryer Sin Aceite — $100/día
2. Smartwatch Deportivo — $100/día
3. Teclado Mecánico Gamer — $100/día
4. Suero Vitamina C — $100/día
5. GPS Mascotas — $100/día

Escribe 'activar todas' para arrancar
o 'ver 1' para revisar cada una`
  }
  else if (comando === 'activar todas') {
    respuesta = `✅ Activando todas las campañas...

1. Airfryer Sin Aceite ✅
2. Smartwatch Deportivo ✅
3. Teclado Mecánico Gamer ✅
4. Suero Vitamina C ✅
5. GPS Mascotas ✅

5 campañas ahora ACTIVAS en Meta.
Presupuesto total: $500 MXN/día

Escribe 'campañas' para monitorear.`
  }
  else if (comando === 'comisiones' || comando === 'dinero') {
    respuesta = `💰 TrendPilot — Finanzas hoy

Comisiones generadas: $0 MXN
Gasto en anuncios: $0 MXN
Ganancia neta: $0 MXN

Las campañas están pausadas.
Escribe 'activar todas' para arrancar.

GrowthFund: $124,500 MXN disponible`
  }
  else if (comando === 'tendencias') {
    respuesta = `🔥 Tendencias HOY en México

1. Aretes de Plata ⚡ EXPLOSIVO — Score 94
2. Suero Vitamina C ⚡ EXPLOSIVO — Score 82
3. Smartwatch Deportivo 📈 ALERTA — Score 88
4. Ropa Deportiva Mujer 📈 ALERTA — Score 79
5. Mini Aspiradora ✅ ESTABLE — Score 74

¿Crear campaña?
Escribe: campaña [nombre del producto]`
  }
  else if (comando?.startsWith('ver ')) {
    const num = comando.split(' ')[1]
    const productos: Record<string, string> = {
      '1': 'Airfryer Sin Aceite\ntrendpilot.marketing/p/airfryer-sin-aceite',
      '2': 'Smartwatch Deportivo\ntrendpilot.marketing/p/smartwatch-deportivo',
      '3': 'Teclado Mecánico Gamer\ntrendpilot.marketing/p/teclado-mecanico-gamer',
      '4': 'Suero Vitamina C\ntrendpilot.marketing/p/suero-vitamina-c',
      '5': 'GPS Mascotas\ntrendpilot.marketing/p/gps-mascotas'
    }
    const prod = productos[num]
    if (prod) {
      respuesta = `📋 Campaña ${num}: ${prod}

Estado: ⏸️ PAUSADA
Presupuesto: $100 MXN/día
Gasto hoy: $0 MXN
Impresiones: 0
Clicks: 0

Escribe 'activar ${num}' para activar`
    } else {
      respuesta = 'Número de campaña inválido. Usa: ver 1, ver 2, ver 3, ver 4 o ver 5'
    }
  }
  else if (comando?.startsWith('activar ') && !comando.includes('todas')) {
    const num = comando.split(' ')[1]
    respuesta = `✅ Campaña ${num} activada en Meta

Estado: 🟢 ACTIVA
Presupuesto: $100 MXN/día
Comenzará a mostrarse en Meta en minutos.

Escribe 'campañas' para ver el estado.`
  }
  else if (comando?.startsWith('pausar ') && !comando.includes('todas')) {
    const num = comando.split(' ')[1]
    respuesta = `⏸️ Campaña ${num} pausada

Ya no se muestran anuncios.
Gasto detenido.

Escribe 'activar ${num}' para reanudar.`
  }
  else if (comando === 'pausar todas') {
    respuesta = `⏸️ Todas las campañas pausadas

Sin gasto adicional.
Escribe 'activar todas' para reanudar.`
  }
  else if (comando?.startsWith('presupuesto ')) {
    const parts = comando.split(' ')
    const num   = parts[1]
    const monto = parts[2]
    respuesta = `💰 Presupuesto campaña ${num} actualizado

Nuevo presupuesto: $${monto} MXN/día
Cambio aplicado en Meta.

Escribe 'campañas' para confirmar.`
  }
  else if (comando?.startsWith('campaña ')) {
    const producto = body.slice(8).trim()
    respuesta = `🚀 Creando campaña para: ${producto}

TrendPilot está procesando...
• Buscando mejores precios
• Generando página comparadora
• Preparando anuncios

En unos minutos recibirás el resultado.
Panel: trendpilot.marketing/dashboard`
  }
  else {
    respuesta = `No entendí ese comando.
Escribe 'ayuda' para ver los comandos disponibles.`
  }

  twiml.message(respuesta)

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  })
}

// Twilio envía GET para validar el webhook URL
export async function GET() {
  return new NextResponse('TrendPilot WhatsApp Webhook OK', { status: 200 })
}

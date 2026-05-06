/**
 * Diagnóstico de emails — corre con:
 *   npx tsx scripts/diagnose-email.mts
 *
 * No necesita Next.js corriendo. Prueba render + Resend SDK directamente.
 */
import * as React  from 'react'
import { render }  from '@react-email/render'
import { Resend }  from 'resend'
import * as dotenv from 'dotenv'
import * as path   from 'path'
import * as fs     from 'fs'
import { pathToFileURL } from 'url'

// ── 1. Cargar .env.local ──────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
  console.log('✅ .env.local cargado')
} else {
  console.warn('⚠️  .env.local NO encontrado en', envPath)
}

const RESEND_API_KEY = process.env.RESEND_API_KEY
console.log('RESEND_API_KEY existe:', !!RESEND_API_KEY)
console.log('RESEND_API_KEY prefijo:', RESEND_API_KEY?.slice(0, 6) ?? 'undefined')

// ── 2. Instanciar Resend ──────────────────────────────────────────────────────
let resend: Resend | null = null
try {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY no definida en .env.local')
  resend = new Resend(RESEND_API_KEY)
  console.log('✅ Resend instanciado OK')
} catch (e) {
  console.error('❌ Error instanciando Resend:', e)
  process.exit(1)
}

// ── 3. Test render de cada template ──────────────────────────────────────────
const FROM  = 'TrendPilot <onboarding@resend.dev>'
// Sin dominio verificado Resend solo permite enviar al email del dueño de la cuenta
const TO    = 'gcobras75@gmail.com'
const tests: Array<{ name: string; ok: boolean; len?: number; error?: string; emailId?: string }> = []

async function testTemplate(
  name: string,
  makeElement: () => React.ReactElement,
  subject: string,
) {
  process.stdout.write(`\n--- ${name}: `)
  try {
    const el   = makeElement()
    const html = await render(el)
    process.stdout.write(`render OK (${html.length}b) `)

    if (!resend) throw new Error('resend null')
    const { data, error } = await resend.emails.send({ from: FROM, to: TO, subject, html })

    if (error) {
      process.stdout.write(`send ERROR: ${JSON.stringify(error)}\n`)
      tests.push({ name, ok: false, len: html.length, error: JSON.stringify(error) })
    } else {
      process.stdout.write(`send OK id=${data?.id}\n`)
      tests.push({ name, ok: true, len: html.length, emailId: data?.id })
    }
  } catch (e) {
    process.stdout.write(`ERROR: ${e}\n`)
    if (e instanceof Error) console.error('  stack:', e.stack)
    tests.push({ name, ok: false, error: String(e) })
  }
}

// ── 4. Import dinámico de templates (resuelve @/ alias manualmente) ───────────
const src = (p: string) => pathToFileURL(path.resolve(process.cwd(), 'src', p)).href

const { WelcomeEmail }    = await import(src('emails/WelcomeEmail.tsx'))
const { CommissionAlert } = await import(src('emails/CommissionAlert.tsx'))
const { WeeklyReport }    = await import(src('emails/WeeklyReport.tsx'))
const { CampaignAlert }   = await import(src('emails/CampaignAlert.tsx'))

await testTemplate('WelcomeEmail', () =>
  React.createElement(WelcomeEmail, { name: 'Antonio', region: 'sinaloa', email: TO }),
  '[DIAGNOSE] Bienvenido a TrendPilot',
)

await testTemplate('CommissionAlert', () =>
  React.createElement(CommissionAlert, {
    operatorName:     'Antonio',
    product:          'Smartwatch Deportivo',
    saleAmount:       1500,
    commissionAmount: 90,
    operatorShare:    63,
    antonioShare:     27,
    network:          'mercadolibre',
    date:             '6 may 2026',
  }),
  '[DIAGNOSE] 💰 Nueva comisión',
)

await testTemplate('WeeklyReport', () =>
  React.createElement(WeeklyReport, {
    weekLabel:        'Semana diagnóstico',
    recipientName:    'Antonio',
    totalCommissions: 4320,
    totalSpend:       1800,
    topCampaign:      'Smartwatch',
    campaigns:        [{ name: 'Test', spend: 500, conversions: 5, commission: 1000, roi: 100 }],
  }),
  '[DIAGNOSE] 📊 Reporte semanal',
)

await testTemplate('CampaignAlert', () =>
  React.createElement(CampaignAlert, {
    campaignName: 'Test Campaign',
    event:        'ROI_ALTO',
    spend:        800,
    commissions:  2160,
    roi:          170,
    suggestion:   'Aumenta el presupuesto.',
  }),
  '[DIAGNOSE] 🚀 Campaign Alert',
)

// ── 5. Resumen ────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════')
console.log('RESUMEN:')
for (const t of tests) {
  const icon = t.ok ? '✅' : '❌'
  console.log(`  ${icon} ${t.name}${t.ok ? ` id=${t.emailId}` : ` — ${t.error}`}`)
}
const allOk = tests.every(t => t.ok)
console.log(`\n${allOk ? '✅ TODOS OK' : '❌ HAY ERRORES'}`)
process.exit(allOk ? 0 : 1)

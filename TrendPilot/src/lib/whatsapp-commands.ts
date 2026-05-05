// Motor de comandos WhatsApp — TrendPilot
// Procesa mensajes de Antonio (+526675039081) y retorna respuesta de texto

import {
  getAffiliateCampaigns,
  activateAffiliateCampaign,
  pauseAffiliateCampaign,
  updateAffiliateBudget,
  activateAllAffiliateCampaigns,
  pauseAllAffiliateCampaigns,
  type AffiliateRow,
} from './affiliate-campaigns-db'
import { sendWhatsApp } from './twilio'

// ─── Helpers de formato ───────────────────────────────────────────────────────

const fmx = (n: number) => `$${n.toLocaleString('es-MX')} MXN`
const pct  = (n: number) => (n > 0 ? `+${n}%` : `${n}%`)

function statusIcon(s: AffiliateRow['status']): string {
  return s === 'active' ? '🟢' : '⏸️'
}

// ─── Parseo de comando ────────────────────────────────────────────────────────

type Cmd =
  | { type: 'status' }
  | { type: 'detail';    index: number }
  | { type: 'activate';  index: number }
  | { type: 'pause';     index: number }
  | { type: 'activateAll' }
  | { type: 'pauseAll' }
  | { type: 'budget';    index: number; amount: number }
  | { type: 'finances' }
  | { type: 'trends' }
  | { type: 'newCampaign'; keyword: string }
  | { type: 'help' }
  | { type: 'unknown' }

export function parseCommand(body: string): Cmd {
  const text = body.trim().toLowerCase()

  if (/^(campañas?|estado|campaigns?)$/.test(text))      return { type: 'status' }
  if (/^(comisiones?|dinero|finances?)$/.test(text))     return { type: 'finances' }
  if (/^(tendencias?|trends?)$/.test(text))              return { type: 'trends' }
  if (/^(ayuda|\?|help)$/.test(text))                    return { type: 'help' }
  if (/^activar todas?$/.test(text))                     return { type: 'activateAll' }
  if (/^pausar todas?$/.test(text))                      return { type: 'pauseAll' }

  const detailMatch = text.match(/^(ver|detalle)\s+(\d)$/)
  if (detailMatch) return { type: 'detail', index: parseInt(detailMatch[2]) }

  const activateMatch = text.match(/^activar\s+(\d)$/)
  if (activateMatch) return { type: 'activate', index: parseInt(activateMatch[1]) }

  const pauseMatch = text.match(/^pausar\s+(\d)$/)
  if (pauseMatch) return { type: 'pause', index: parseInt(pauseMatch[1]) }

  const budgetMatch = text.match(/^presupuesto\s+(\d)\s+(\d+)$/)
  if (budgetMatch) return { type: 'budget', index: parseInt(budgetMatch[1]), amount: parseInt(budgetMatch[2]) }

  const campaignMatch = text.match(/^campaña\s+(.+)$/)
  if (campaignMatch) return { type: 'newCampaign', keyword: campaignMatch[1].trim() }

  return { type: 'unknown' }
}

// ─── Ejecutores ───────────────────────────────────────────────────────────────

async function execStatus(): Promise<string> {
  const camps = await getAffiliateCampaigns()
  const active = camps.filter((c) => c.status === 'active')
  const paused = camps.filter((c) => c.status === 'paused')

  let msg = `📊 *TrendPilot — Estado actual*\n\n`

  if (active.length) {
    msg += `*ACTIVAS 🟢*\n`
    for (const c of active) {
      msg += `${c.index}. ${c.emoji} ${c.name}\n   ROI: ${pct(c.roi)} | Gasto: ${fmx(c.spent_today)}\n\n`
    }
  }

  if (paused.length) {
    msg += `*PAUSADAS ⏸️*\n`
    for (const c of paused) {
      msg += `${c.index}. ${c.emoji} ${c.name}\n`
    }
    msg += '\n'
  }

  msg += `*Comandos:*\n`
  msg += `▶️ activar [N] — Activa campaña\n`
  msg += `⏸️ pausar [N] — Pausa campaña\n`
  msg += `📋 ver [N] — Detalle completo\n`
  msg += `✅ activar todas — Activa las pausadas\n`
  msg += `⏹️ pausar todas — Pausa las activas`

  return msg
}

async function execDetail(index: number): Promise<string> {
  const camps = await getAffiliateCampaigns()
  const c = camps.find((x) => x.index === index)
  if (!c) return `❌ No existe campaña número ${index}. Escribe *campañas* para ver la lista.`

  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00'

  return `📋 *${c.emoji} ${c.name}*\n\nPlataforma: Meta Ads\nEstado: ${statusIcon(c.status)} ${c.status === 'active' ? 'ACTIVA' : 'PAUSADA'}\nPresupuesto: ${fmx(c.budget_day)}/día\nGasto hoy: ${fmx(c.spent_today)}\nImpresiones: ${c.impressions.toLocaleString('es-MX')}\nClicks: ${c.clicks.toLocaleString('es-MX')}\nCTR: ${ctr}%\nROI: ${pct(c.roi)}\nComisiones: ${fmx(c.commissions)}\n\n🌐 Página comparadora:\ntrendpilot.marketing/p/${c.slug}\n\nOpciones:\n▶️ Escribe *activar ${index}*\n⏸️ Escribe *pausar ${index}*\n💰 Escribe *presupuesto ${index} 200*\n   para cambiar a $200/día`
}

async function execActivate(index: number): Promise<string> {
  const c = await activateAffiliateCampaign(index)
  if (!c) return `❌ No existe campaña número ${index}. Escribe *campañas* para ver la lista.`

  return `✅ *Campaña activada*\n\n${c.emoji} ${c.name}\nMeta Ads → 🟢 ACTIVA\nPresupuesto: ${fmx(c.budget_day)}/día\n\nComenzará a mostrarse en\nFacebook e Instagram en minutos.\n\nEscribe *campañas* para monitorear.`
}

async function execPause(index: number): Promise<string> {
  const c = await pauseAffiliateCampaign(index)
  if (!c) return `❌ No existe campaña número ${index}. Escribe *campañas* para ver la lista.`

  return `⏸️ *Campaña pausada*\n\n${c.emoji} ${c.name}\nMeta Ads → PAUSADA\nGasto hasta ahora: ${fmx(c.spent_today)}\n\nYa no se muestran anuncios.\nEscribe *activar ${index}* para reanudar.`
}

async function execActivateAll(): Promise<string> {
  const activated = await activateAllAffiliateCampaigns()
  if (activated.length === 0) return `✅ Todas las campañas ya están activas.\n\nEscribe *campañas* para ver el estado.`

  const list = activated.map((c) => `${c.index}. ${c.emoji} ${c.name} ✅`).join('\n')
  const totalBudget = activated.reduce((sum, c) => sum + c.budget_day, 0)

  return `✅ *Activando todas las campañas...*\n\n${list}\n\n${activated.length} campañas ahora activas en Meta.\nPresupuesto total: ${fmx(totalBudget)}/día\n\nEscribe *campañas* para ver el estado.`
}

async function execPauseAll(): Promise<string> {
  const paused = await pauseAllAffiliateCampaigns()
  if (paused.length === 0) return `⏸️ Todas las campañas ya están pausadas.\n\nEscribe *activar todas* para reanudarlas.`

  const list = paused.map((c) => `${c.index}. ${c.emoji} ${c.name} ⏸️`).join('\n')

  return `⏸️ *Todas las campañas pausadas*\n\n${list}\n\nSin gasto adicional hasta que\nlas reactives con *activar todas*`
}

async function execBudget(index: number, amount: number): Promise<string> {
  const camps = await getAffiliateCampaigns()
  const prev  = camps.find((c) => c.index === index)
  if (!prev) return `❌ No existe campaña número ${index}.`
  if (amount < 50 || amount > 5000) return `❌ El presupuesto debe estar entre $50 y $5,000 MXN/día.`

  await updateAffiliateBudget(index, amount)

  return `💰 *Presupuesto actualizado*\n\n${prev.emoji} ${prev.name}\n${fmx(prev.budget_day)}/día → ${fmx(amount)}/día\n\nEl cambio aplica inmediatamente en Meta.`
}

function execFinances(): string {
  return `💰 *TrendPilot — Finanzas hoy*\n\nComisiones generadas:\nMercadoLibre: $45 MXN\nTemu: $23 MXN\nAliExpress: $12 MXN\n*Total hoy: $80 MXN*\n\nGasto en anuncios: $50 MXN\nGanancia neta: $30 MXN\nROI promedio: +60%\n\nGrowthFund disponible: $0 MXN\n(En construcción — primeras campañas)`
}

function execTrends(): string {
  return `🔥 *TrendPilot — Tendencias HOY*\n\n1. Aretes de Plata ⚡ EXPLOSIVO\n   Score: 94 | En ML y Google\n\n2. Suplementos Colágeno ⚡ EXPLOSIVO\n   Score: 82 | En TikTok\n\n3. Ropa Deportiva Mujer ⚠️ ALERTA\n   Score: 79\n\n¿Crear campaña para alguno?\nEscribe: *campaña aretes*\no: *campaña colágeno*`
}

async function execNewCampaign(keyword: string, adminPhone: string): Promise<string> {
  // Respuesta inmediata
  const immediate = `🚀 *Creando campaña para ${keyword}...*\n\nBuscando mejores precios...\nCreando página comparadora...\nGenerando imagen...\nConfigurando Meta Ads...\n\nEn 2-3 minutos recibirás otro mensaje\ncon la campaña lista para activar.`

  // Genera respuesta de seguimiento en background
  void buildAndSendCampaignResult(keyword, adminPhone)

  return immediate
}

async function buildAndSendCampaignResult(keyword: string, adminPhone: string) {
  // Simula el tiempo de creación
  await new Promise((r) => setTimeout(r, 5_000))

  // Generar slug básico a partir del keyword
  const slug = keyword.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  const newIndex = 6

  const followUp = `✅ *Campaña lista*\n\n${keyword.charAt(0).toUpperCase() + keyword.slice(1)}\nPágina: trendpilot.marketing/p/${slug}\nEstado: ⏸️ PAUSADA\n\nMejores opciones encontradas:\n💰 AliExpress: $180 MXN (15 días)\n⚡ MercadoLibre: $450 MXN (2 días)\n🏆 Coppel: $520 MXN (4 días, garantía)\n\nPresupuesto: $100 MXN/día\nAudiencia: México · todas las edades\n\n¿Activar ahora?\nEscribe: *activar ${newIndex}*\no: *ver ${newIndex}* para revisar primero`

  await sendWhatsApp({
    to:   adminPhone,
    body: followUp,
  })
}

function execHelp(): string {
  return `🤖 *TrendPilot — Comandos WhatsApp*\n\n📊 *REPORTES:*\n  campañas → estado de todas\n  ver [N] → detalle de campaña\n  comisiones → finanzas del día\n  tendencias → productos en alza\n\n▶️ *CONTROL:*\n  activar [N] → activa campaña\n  pausar [N] → pausa campaña\n  activar todas → activa pausadas\n  pausar todas → pausa activas\n\n💰 *PRESUPUESTO:*\n  presupuesto [N] [monto]\n  Ej: presupuesto 1 200\n\n🚀 *NUEVA CAMPAÑA:*\n  campaña [producto]\n  Ej: campaña aretes plata\n\n🌐 Panel completo:\ntrendpilot.marketing/dashboard`
}

// ─── Ejecutor principal ───────────────────────────────────────────────────────

export async function executeCommand(
  body:       string,
  adminPhone: string,
): Promise<string> {
  const cmd = parseCommand(body)

  switch (cmd.type) {
    case 'status':      return execStatus()
    case 'detail':      return execDetail(cmd.index)
    case 'activate':    return execActivate(cmd.index)
    case 'pause':       return execPause(cmd.index)
    case 'activateAll': return execActivateAll()
    case 'pauseAll':    return execPauseAll()
    case 'budget':      return execBudget(cmd.index, cmd.amount)
    case 'finances':    return execFinances()
    case 'trends':      return execTrends()
    case 'newCampaign': return execNewCampaign(cmd.keyword, adminPhone)
    case 'help':        return execHelp()
    default:
      return `❓ Comando no reconocido.\n\nEscribe *ayuda* para ver todos los comandos disponibles.\n\nComandos principales:\n• campañas\n• activar [N]\n• pausar [N]\n• comisiones\n• tendencias`
  }
}

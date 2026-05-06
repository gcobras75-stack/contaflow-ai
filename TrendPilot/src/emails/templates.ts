// Templates de email premium para TrendPilot
// Usar con resend.ts: send(to, subject, html)

import { emailLayout, eBtn, eHero, eDivider, eText, eStat } from './base'

const APP_URL = 'https://www.trendpilot.marketing'

// ─── EMAIL 1 — Bienvenida vendor ─────────────────────────────────────────────

export function emailVendorWelcome(params: {
  vendor_name:   string
  dashboard_url?: string
}): { subject: string; html: string } {
  const { vendor_name, dashboard_url = `${APP_URL}/dashboard` } = params

  const content = `
    ${eHero('✈️', `¡Estás a bordo, ${vendor_name.split(' ')[0]}!`, 'Bienvenido a TrendPilot — la plataforma que hace crecer tu negocio con IA')}

    <tr>
      <td style="padding:0 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${[
            ['🔍', 'Detectamos tendencias', 'Nuestra IA analiza el mercado y encuentra los mejores momentos para vender tus productos'],
            ['🚀', 'Lanzamos campañas',      'Creamos y publicamos tus anuncios en Meta y TikTok completamente automático'],
            ['💰', 'Cobras sin hacer nada',  'Solo pagas cuando hay ventas — sin costos fijos, sin riesgos'],
          ].map(([icon, title, desc], i) => `
            <tr>
              <td style="padding:8px;background:rgba(0,102,255,0.06);border:1px solid rgba(0,102,255,0.12);border-radius:12px;margin-bottom:8px;display:block;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width:36px;vertical-align:top;padding:4px 12px 4px 4px;font-size:20px;">${icon}</td>
                    <td>
                      <p style="color:#F8FAFC;font-weight:700;font-size:14px;margin-bottom:3px;">${i + 1}. ${title}</p>
                      <p style="color:#94A3B8;font-size:13px;line-height:1.5;">${desc}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td style="height:8px;"></td></tr>
          `).join('')}
        </table>
      </td>
    </tr>

    ${eDivider()}
    ${eBtn('Ir a mi panel →', dashboard_url)}
  `

  return {
    subject: `✈️ Bienvenido a TrendPilot, ${vendor_name.split(' ')[0]}`,
    html:    emailLayout(content, `Tu cuenta de TrendPilot está lista — empieza a vender hoy`),
  }
}

// ─── EMAIL 2 — Producto aprobado ─────────────────────────────────────────────

export function emailProductApproved(params: {
  vendor_name:    string
  product_name:   string
  score:          number
  campaign_url?:  string
}): { subject: string; html: string } {
  const { vendor_name, product_name, score, campaign_url = `${APP_URL}/dashboard/campaigns` } = params

  const scoreColor = score >= 80 ? '#00FF88' : score >= 60 ? '#FFB800' : '#0066FF'

  const content = `
    ${eHero('✅', '¡Tu producto fue aprobado!', `${product_name} ya está listo para su campaña`)}

    <tr>
      <td style="padding:0 32px 24px;text-align:center;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.2);border-radius:16px;padding:24px 40px;">
          <tr>
            ${eStat('ProductScore', `${score}/100`, scoreColor)}
            ${eStat('Lanzamiento', '24hrs', '#0066FF')}
            ${eStat('Plataforma', 'Meta Ads', '#7C3AED')}
          </tr>
        </table>
      </td>
    </tr>

    ${eText(`Hola ${vendor_name.split(' ')[0]}, tu producto <strong style="color:#F8FAFC">${product_name}</strong> obtuvo un excelente score. En las próximas 24 horas nuestro equipo de IA lanzará la campaña automáticamente en Meta Ads.`)}

    ${eDivider()}
    ${eBtn('Ver mi campaña →', campaign_url, '#00FF88')}
  `

  return {
    subject: `✅ Tu producto ${product_name} fue aprobado — campaña en 24hrs`,
    html:    emailLayout(content, 'Tu producto fue aprobado y la campaña está por comenzar'),
  }
}

// ─── EMAIL 3 — Producto rechazado ────────────────────────────────────────────

export function emailProductRejected(params: {
  vendor_name:   string
  product_name:  string
  reason:        string
  suggestions:   string[]
  edit_url?:     string
}): { subject: string; html: string } {
  const { vendor_name, product_name, reason, suggestions, edit_url = `${APP_URL}/dashboard/products` } = params

  const content = `
    ${eHero('⚠️', 'Tu producto necesita ajustes', `${product_name} no cumplió los criterios mínimos`)}

    ${eText(`Hola ${vendor_name.split(' ')[0]}, revisamos <strong style="color:#F8FAFC">${product_name}</strong> y necesita algunos cambios antes de lanzar su campaña.`)}

    <tr>
      <td style="padding:0 32px 16px;">
        <div style="background:rgba(255,59,48,0.06);border:1px solid rgba(255,59,48,0.2);border-radius:12px;padding:16px 20px;">
          <p style="color:#FF3B30;font-weight:600;font-size:13px;margin-bottom:6px;">Motivo:</p>
          <p style="color:#94A3B8;font-size:14px;line-height:1.6;">${reason}</p>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:0 32px 24px;">
        <p style="color:#F8FAFC;font-weight:600;font-size:14px;margin-bottom:12px;">💡 Sugerencias para aprobar:</p>
        ${suggestions.map((s, i) => `
          <div style="display:flex;margin-bottom:10px;">
            <span style="color:#0066FF;font-weight:700;min-width:20px;">${i + 1}.</span>
            <p style="color:#94A3B8;font-size:13px;line-height:1.5;margin-left:8px;">${s}</p>
          </div>
        `).join('')}
      </td>
    </tr>

    ${eDivider()}
    ${eBtn('Editar y reenviar →', edit_url, '#FFB800')}
  `

  return {
    subject: `⚠️ Tu producto ${product_name} necesita ajustes`,
    html:    emailLayout(content, 'Revisa los cambios necesarios para que tu producto sea aprobado'),
  }
}

// ─── EMAIL 4 — Reporte semanal vendor ────────────────────────────────────────

export function emailWeeklyVendor(params: {
  vendor_name:     string
  week_sales:      number   // centavos
  prev_week_sales: number   // centavos
  commissions:     number   // centavos
  top_campaign:    string
  ai_tip:          string
  dashboard_url?:  string
}): { subject: string; html: string } {
  const { vendor_name, week_sales, prev_week_sales, commissions, top_campaign, ai_tip, dashboard_url = `${APP_URL}/dashboard` } = params

  const fmt        = (n: number) => `$${(n / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN`
  const weekNum    = Math.ceil((new Date().getDate()) / 7)
  const trend      = week_sales >= prev_week_sales ? '📈' : '📉'
  const trendColor = week_sales >= prev_week_sales ? '#00FF88' : '#FFB800'
  const pct        = prev_week_sales > 0 ? Math.round(((week_sales - prev_week_sales) / prev_week_sales) * 100) : 0

  const content = `
    ${eHero('📊', `Tu semana en TrendPilot`, `Semana ${weekNum} · ${new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`)}

    <tr>
      <td style="padding:0 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(0,102,255,0.06);border:1px solid #1E293B;border-radius:16px;">
          <tr>
            ${eStat('Ventas esta semana', fmt(week_sales), '#00FF88')}
            ${eStat(`vs semana anterior ${trend}`, `${pct >= 0 ? '+' : ''}${pct}%`, trendColor)}
            ${eStat('Comisiones TrendPilot', fmt(commissions), '#0066FF')}
          </tr>
        </table>
      </td>
    </tr>

    ${eText(`<strong style="color:#F8FAFC">Top campaña de la semana:</strong> ${top_campaign}`)}

    <tr>
      <td style="padding:0 32px 24px;">
        <div style="background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.15);border-radius:12px;padding:16px 20px;">
          <p style="color:#00FF88;font-weight:600;font-size:13px;margin-bottom:6px;">💡 Sugerencia de la IA:</p>
          <p style="color:#94A3B8;font-size:14px;line-height:1.6;">${ai_tip}</p>
        </div>
      </td>
    </tr>

    ${eDivider()}
    ${eBtn('Ver mi dashboard →', dashboard_url)}
  `

  return {
    subject: `📊 Tu semana ${weekNum} en TrendPilot — ${fmt(week_sales)} en ventas`,
    html:    emailLayout(content, `Revisa tu rendimiento de la semana ${weekNum}`),
  }
}

// ─── EMAIL 5 — Reporte semanal admin (Antonio) ───────────────────────────────

export function emailWeeklyAdmin(params: {
  week_commissions: number   // centavos
  growth_fund:      number   // centavos
  active_vendors:   number
  top_products:     string[]
  alerts:           string[]
  dashboard_url?:   string
}): { subject: string; html: string } {
  const { week_commissions, growth_fund, active_vendors, top_products, alerts, dashboard_url = `${APP_URL}/dashboard` } = params

  const fmt     = (n: number) => `$${(n / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN`
  const weekNum = Math.ceil((new Date().getDate()) / 7)

  const content = `
    ${eHero('📊', `TrendPilot — Semana ${weekNum}`, 'Resumen ejecutivo semanal')}

    <tr>
      <td style="padding:0 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(0,102,255,0.06);border:1px solid #1E293B;border-radius:16px;">
          <tr>
            ${eStat('Comisiones semana', fmt(week_commissions), '#00FF88')}
            ${eStat('GrowthFund total', fmt(growth_fund), '#7C3AED')}
            ${eStat('Vendors activos', String(active_vendors), '#0066FF')}
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 32px 16px;">
        <p style="color:#F8FAFC;font-weight:600;font-size:14px;margin-bottom:12px;">🏆 Top 3 productos:</p>
        ${top_products.slice(0, 3).map((p, i) => `
          <div style="padding:8px 12px;margin-bottom:6px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid #1E293B;">
            <span style="color:#0066FF;font-weight:700;">${i + 1}.</span>
            <span style="color:#94A3B8;font-size:13px;margin-left:8px;">${p}</span>
          </div>
        `).join('')}
      </td>
    </tr>

    ${alerts.length > 0 ? `
    <tr>
      <td style="padding:0 32px 24px;">
        <div style="background:rgba(255,184,0,0.06);border:1px solid rgba(255,184,0,0.2);border-radius:12px;padding:16px 20px;">
          <p style="color:#FFB800;font-weight:600;font-size:13px;margin-bottom:8px;">⚠️ Alertas (${alerts.length}):</p>
          ${alerts.map((a) => `<p style="color:#94A3B8;font-size:13px;margin-bottom:4px;">→ ${a}</p>`).join('')}
        </div>
      </td>
    </tr>` : ''}

    ${eDivider()}
    ${eBtn('Ver dashboard completo →', dashboard_url)}
  `

  return {
    subject: `📊 TrendPilot Semana ${weekNum} — ${fmt(week_commissions)} en comisiones`,
    html:    emailLayout(content, `Resumen ejecutivo semana ${weekNum}`),
  }
}

// ─── EMAIL 6 — Contrato enviado ──────────────────────────────────────────────

export function emailContractSent(params: {
  vendor_name: string
  sign_url:    string
}): { subject: string; html: string } {
  const { vendor_name, sign_url } = params
  const content = `
    ${eHero('📄', 'Tu contrato está listo', 'Firma el acuerdo para activar tu cuenta')}
    ${eText(`Hola ${vendor_name.split(' ')[0]}, hemos preparado tu <strong style="color:#F8FAFC">Acuerdo de Marketing por Resultados</strong> con TrendPilot. El proceso toma menos de 2 minutos desde tu celular.`)}
    ${eDivider()}
    ${eBtn('Firmar mi contrato →', sign_url)}
    ${eText('Una vez firmado, tu cuenta quedará activa automáticamente y podrás subir tu primer producto.', 'text-align:center;')}
  `
  return {
    subject: `📄 ${vendor_name.split(' ')[0]}, firma tu contrato TrendPilot`,
    html:    emailLayout(content, 'Tu contrato está listo — firma en 2 minutos'),
  }
}

// ─── EMAIL 7 — Contrato firmado ──────────────────────────────────────────────

export function emailContractSigned(params: {
  vendor_name:  string
  dashboard_url?: string
}): { subject: string; html: string } {
  const { vendor_name, dashboard_url = `${APP_URL}/dashboard` } = params
  const content = `
    ${eHero('🎉', '¡Contrato firmado!', 'Tu cuenta TrendPilot está activa')}
    ${eText(`¡Excelente, ${vendor_name.split(' ')[0]}! Hemos recibido tu firma correctamente. Tu cuenta ya está <strong style="color:#00FF88">activa</strong> y lista para empezar a vender.`)}
    ${eDivider()}
    ${eBtn('Ir a mi panel →', dashboard_url, '#00FF88')}
  `
  return {
    subject: `🎉 ¡Bienvenido oficialmente, ${vendor_name.split(' ')[0]}! Contrato firmado`,
    html:    emailLayout(content, 'Tu cuenta está activa — empieza a subir productos'),
  }
}

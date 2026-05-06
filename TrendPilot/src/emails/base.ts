// Base layout para todos los emails de TrendPilot
// Fondo oscuro #0A0F1E · Acento #0066FF · Verde #00FF88

export function emailLayout(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>TrendPilot</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#0A0F1E;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: #0A0F1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    a { color: #0066FF; }
    @media (max-width: 600px) { .container { width: 100% !important; border-radius: 0 !important; } .hero-title { font-size: 28px !important; } }
  </style>
</head>
<body style="background:#0A0F1E;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A0F1E;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!-- Wrapper -->
        <table class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#111827;border-radius:20px;border:1px solid #1E293B;overflow:hidden;">

          <!-- Header / Logo -->
          <tr>
            <td style="background:linear-gradient(135deg,rgba(0,102,255,0.15),rgba(124,58,237,0.1));padding:28px 32px;text-align:center;border-bottom:1px solid #1E293B;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg,#0066FF,#7C3AED);border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-weight:900;font-size:16px;">TP</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="color:#F8FAFC;font-weight:700;font-size:18px;letter-spacing:-0.3px;">TrendPilot</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          ${content}

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;text-align:center;border-top:1px solid #1E293B;">
              <p style="color:#374151;font-size:12px;line-height:1.6;margin-bottom:8px;">
                © 2026 TrendPilot · Automatia Negocios Inteligentes<br/>
                <a href="https://www.trendpilot.marketing" style="color:#4B5563;text-decoration:none;">trendpilot.marketing</a>
                &nbsp;·&nbsp;
                <a href="mailto:contacto@automatia.mx" style="color:#4B5563;text-decoration:none;">contacto@automatia.mx</a>
              </p>
              <p style="color:#2D3748;font-size:11px;">Este email fue enviado automáticamente por TrendPilot.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function eBtn(text: string, href: string, color = '#0066FF'): string {
  return `
  <tr>
    <td style="padding:0 32px 28px;text-align:center;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${color},${color === '#0066FF' ? '#7C3AED' : color});border-radius:12px;color:#fff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-0.2px;">
        ${text}
      </a>
    </td>
  </tr>`
}

export function eHero(emoji: string, title: string, subtitle: string): string {
  return `
  <tr>
    <td style="padding:40px 32px 24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">${emoji}</div>
      <h1 class="hero-title" style="color:#F8FAFC;font-size:32px;font-weight:800;letter-spacing:-1px;margin-bottom:12px;line-height:1.2;">${title}</h1>
      <p style="color:#94A3B8;font-size:16px;line-height:1.6;max-width:440px;margin:0 auto;">${subtitle}</p>
    </td>
  </tr>`
}

export function eDivider(): string {
  return `<tr><td style="padding:0 32px;"><div style="height:1px;background:#1E293B;"></div></td></tr>`
}

export function eText(text: string, style = ''): string {
  return `
  <tr>
    <td style="padding:16px 32px;">
      <p style="color:#94A3B8;font-size:15px;line-height:1.7;${style}">${text}</p>
    </td>
  </tr>`
}

export function eStat(label: string, value: string, color = '#00FF88'): string {
  return `
  <td style="text-align:center;padding:16px;">
    <p style="color:${color};font-size:28px;font-weight:900;font-variant-numeric:tabular-nums;">${value}</p>
    <p style="color:#4B5563;font-size:12px;margin-top:4px;">${label}</p>
  </td>`
}

import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr,
} from '@react-email/components'
import * as React from 'react'

export type CampaignEvent = 'ACTIVADA' | 'PAUSADA' | 'ROI_BAJO' | 'ROI_ALTO' | 'SIN_DATOS'

export interface CampaignAlertProps {
  campaignName: string
  event:        CampaignEvent
  spend:        number
  commissions:  number
  roi:          number
  suggestion:   string
}

const EVENT_CONFIG: Record<CampaignEvent, {
  emoji: string; title: string
  badgeColor: string; badgeBg: string; badgeBorder: string
  accentColor: string
}> = {
  ACTIVADA:  { emoji: '🟢', title: 'Campaña activada',             badgeColor: '#00ff88', badgeBg: '#00ff880d', badgeBorder: '#00ff8825', accentColor: '#00ff88' },
  PAUSADA:   { emoji: '⏸️', title: 'Campaña pausada',              badgeColor: '#aaaaaa', badgeBg: '#aaaaaa0d', badgeBorder: '#aaaaaa25', accentColor: '#aaaaaa' },
  ROI_BAJO:  { emoji: '⚠️', title: 'ROI bajo — revisar campaña',   badgeColor: '#ffb800', badgeBg: '#ffb8000d', badgeBorder: '#ffb80025', accentColor: '#ffb800' },
  ROI_ALTO:  { emoji: '🚀', title: 'Campaña con excelente ROI',    badgeColor: '#00ff88', badgeBg: '#00ff880d', badgeBorder: '#00ff8825', accentColor: '#00ff88' },
  SIN_DATOS: { emoji: 'ℹ️', title: 'Campaña sin datos aún',        badgeColor: '#4da6ff', badgeBg: '#4da6ff0d', badgeBorder: '#4da6ff25', accentColor: '#4da6ff' },
}

export function CampaignAlert({
  campaignName,
  event,
  spend,
  commissions,
  roi,
  suggestion,
}: CampaignAlertProps) {
  const cfg = EVENT_CONFIG[event] ?? EVENT_CONFIG.SIN_DATOS

  return (
    <Html lang="es">
      <Head />
      <Body style={body}>
        <Container style={container}>

          {/* Logo */}
          <Section style={{ textAlign: 'center', padding: '24px 0 8px' }}>
            <Text style={logo}>TrendPilot</Text>
          </Section>

          <Hr style={divider} />

          {/* Header */}
          <Section style={{ textAlign: 'center', padding: '20px 0 8px' }}>
            <Text style={{
              ...badge,
              color: cfg.badgeColor,
              backgroundColor: cfg.badgeBg,
              border: `1px solid ${cfg.badgeBorder}`,
            }}>
              {cfg.emoji} {event.replace('_', ' ')}
            </Text>
            <Heading style={h1}>{cfg.title}</Heading>
          </Section>

          {/* Campaña nombre */}
          <Section style={{ ...campaignBox, borderColor: cfg.badgeBorder, backgroundColor: cfg.badgeBg }}>
            <Text style={campaignLabel}>Campaña</Text>
            <Text style={{ ...campaignName2, color: cfg.accentColor }}>{campaignName}</Text>
          </Section>

          {/* Métricas */}
          <Section style={card}>
            <Text style={sectionTitle}>Métricas actuales</Text>
            <Section style={metricsRow}>
              <Section style={metricItem}>
                <Text style={metricLabel}>Gasto Meta</Text>
                <Text style={metricValue}>${spend.toFixed(2)}</Text>
                <Text style={metricSub}>MXN</Text>
              </Section>
              <Section style={metricItem}>
                <Text style={metricLabel}>Comisiones</Text>
                <Text style={{ ...metricValue, color: commissions > 0 ? '#00ff88' : '#555' }}>
                  ${commissions.toFixed(2)}
                </Text>
                <Text style={metricSub}>MXN</Text>
              </Section>
              <Section style={metricItem}>
                <Text style={metricLabel}>ROI</Text>
                <Text style={{
                  ...metricValue,
                  color: roi > 0 ? '#00ff88' : roi < 0 ? '#ff3b30' : '#555',
                  fontWeight: '800',
                }}>
                  {roi > 0 ? '+' : ''}{roi}%
                </Text>
                <Text style={metricSub}>retorno</Text>
              </Section>
            </Section>
          </Section>

          {/* Sugerencia IA */}
          <Section style={suggestionBox}>
            <Text style={suggestionLabel}>💡 Sugerencia</Text>
            <Text style={suggestionText}>{suggestion}</Text>
          </Section>

          {/* CTA */}
          <Section style={{ textAlign: 'center', padding: '8px 0 24px' }}>
            <Button
              href="https://www.trendpilot.marketing/dashboard/campaigns"
              style={{ ...ctaButton, backgroundColor: cfg.accentColor, color: roi < 0 ? '#000' : '#000' }}
            >
              Gestionar Campaña →
            </Button>
          </Section>

          <Hr style={divider} />
          <Section>
            <Text style={footer}>
              TrendPilot · Automatia Negocios Inteligentes · Culiacán, Sinaloa
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

CampaignAlert.PreviewProps = {
  campaignName: 'Smartwatch Deportivo — Meta',
  event:        'ROI_ALTO',
  spend:        800,
  commissions:  2160,
  roi:          170,
  suggestion:   'Considera aumentar el presupuesto diario — el ROI está muy por encima del umbral.',
} satisfies CampaignAlertProps

export default CampaignAlert

// ─── Estilos ──────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: '40px 0',
}

const container: React.CSSProperties = {
  maxWidth: '540px',
  margin: '0 auto',
  padding: '0 20px',
}

const logo: React.CSSProperties = {
  color: '#00ff88',
  fontSize: '26px',
  fontWeight: '800',
  margin: 0,
}

const divider: React.CSSProperties = { borderColor: '#1a1a1a', margin: '8px 0' }

const badge: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '1.5px',
  padding: '4px 14px',
  borderRadius: '20px',
}

const h1: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '26px',
  fontWeight: '800',
  margin: '12px 0 4px',
  letterSpacing: '-0.3px',
}

const campaignBox: React.CSSProperties = {
  borderRadius: '10px',
  border: '1px solid',
  padding: '14px 18px',
  marginBottom: '16px',
}

const campaignLabel: React.CSSProperties = {
  color: '#555',
  fontSize: '10px',
  fontWeight: '700',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  margin: '0 0 4px',
}

const campaignName2: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '700',
  margin: 0,
}

const card: React.CSSProperties = {
  backgroundColor: '#111',
  borderRadius: '12px',
  border: '1px solid #1a1a1a',
  padding: '20px',
  marginBottom: '16px',
}

const sectionTitle: React.CSSProperties = {
  color: '#555',
  fontSize: '10px',
  fontWeight: '700',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  margin: '0 0 16px',
}

const metricsRow: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
}

const metricItem: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#0a0a0a',
  border: '1px solid #1f1f1f',
  borderRadius: '8px',
  padding: '12px',
  textAlign: 'center',
}

const metricLabel: React.CSSProperties = {
  color: '#555',
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  margin: '0 0 6px',
}

const metricValue: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '800',
  fontFamily: 'monospace',
  margin: 0,
  lineHeight: '1',
}

const metricSub: React.CSSProperties = {
  color: '#444',
  fontSize: '10px',
  margin: '4px 0 0',
}

const suggestionBox: React.CSSProperties = {
  backgroundColor: '#0066ff0a',
  border: '1px solid #0066ff20',
  borderRadius: '10px',
  padding: '16px 18px',
  marginBottom: '16px',
}

const suggestionLabel: React.CSSProperties = {
  color: '#4da6ff',
  fontSize: '10px',
  fontWeight: '700',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  margin: '0 0 8px',
}

const suggestionText: React.CSSProperties = {
  color: '#aaaaaa',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: 0,
}

const ctaButton: React.CSSProperties = {
  backgroundColor: '#00ff88',
  color: '#000',
  fontSize: '14px',
  fontWeight: '700',
  padding: '13px 28px',
  borderRadius: '10px',
  textDecoration: 'none',
  display: 'inline-block',
}

const footer: React.CSSProperties = {
  color: '#333',
  fontSize: '11px',
  textAlign: 'center',
  margin: '4px 0',
}

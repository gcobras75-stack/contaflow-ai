import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr,
} from '@react-email/components'
import * as React from 'react'

export interface WeeklyCampaign {
  name:        string
  spend:       number
  conversions: number
  commission:  number
  roi:         number
}

export interface WeeklyReportProps {
  weekLabel:        string
  campaigns:        WeeklyCampaign[]
  totalCommissions: number
  totalSpend:       number
  topCampaign:      string
  recipientName:    string
}

export function WeeklyReport({
  weekLabel,
  campaigns,
  totalCommissions,
  totalSpend,
  topCampaign,
  recipientName,
}: WeeklyReportProps) {
  const hasData = totalCommissions > 0

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
            <Text style={badge}>📊 REPORTE SEMANAL</Text>
            <Heading style={h1}>{weekLabel}</Heading>
            <Text style={subtitle}>Hola {recipientName}</Text>
          </Section>

          {/* KPIs */}
          <Section style={kpiGrid}>
            <Section style={kpiCard}>
              <Text style={kpiLabel}>Comisiones totales</Text>
              <Text style={{ ...kpiValue, color: hasData ? '#00ff88' : '#555' }}>
                ${totalCommissions.toFixed(2)}
              </Text>
              <Text style={kpiSub}>MXN</Text>
            </Section>
            <Section style={kpiCard}>
              <Text style={kpiLabel}>Gasto en anuncios</Text>
              <Text style={kpiValue}>${totalSpend.toFixed(2)}</Text>
              <Text style={kpiSub}>MXN</Text>
            </Section>
          </Section>

          {hasData ? (
            <>
              {/* Campaña estrella */}
              {topCampaign && (
                <Section style={starCard}>
                  <Text style={starLabel}>⭐ Campaña estrella de la semana</Text>
                  <Text style={starName}>{topCampaign}</Text>
                </Section>
              )}

              {/* Tabla de campañas */}
              {campaigns.length > 0 && (
                <Section style={card}>
                  <Text style={sectionTitle}>Rendimiento por campaña</Text>
                  {/* Header */}
                  <Section style={tableHeader}>
                    <Text style={{ ...tableCell, width: '35%' }}>Campaña</Text>
                    <Text style={{ ...tableCell, width: '16%', textAlign: 'right' }}>Gasto</Text>
                    <Text style={{ ...tableCell, width: '16%', textAlign: 'right' }}>Ventas</Text>
                    <Text style={{ ...tableCell, width: '18%', textAlign: 'right' }}>Comisión</Text>
                    <Text style={{ ...tableCell, width: '15%', textAlign: 'right' }}>ROI</Text>
                  </Section>
                  {campaigns.map((c, i) => (
                    <Section key={i} style={tableRow}>
                      <Text style={{ ...tableCell, width: '35%', color: '#ccc' }}>{c.name}</Text>
                      <Text style={{ ...tableCell, width: '16%', textAlign: 'right' }}>${c.spend.toFixed(0)}</Text>
                      <Text style={{ ...tableCell, width: '16%', textAlign: 'right' }}>{c.conversions}</Text>
                      <Text style={{ ...tableCell, width: '18%', textAlign: 'right', color: '#ccc' }}>${c.commission.toFixed(0)}</Text>
                      <Text style={{
                        ...tableCell, width: '15%', textAlign: 'right',
                        color: c.roi >= 0 ? '#00ff88' : '#ff3b30',
                        fontWeight: '700',
                      }}>
                        {c.roi > 0 ? '+' : ''}{c.roi}%
                      </Text>
                    </Section>
                  ))}
                </Section>
              )}
            </>
          ) : (
            /* Sin datos — mensaje motivacional */
            <Section style={emptyCard}>
              <Text style={emptyIcon}>🚀</Text>
              <Text style={emptyTitle}>Las campañas están activas</Text>
              <Text style={emptyText}>
                Las comisiones aparecen cuando los compradores confirman su pedido.
                Esto puede tomar entre 24 y 72 horas según la red de afiliados.
              </Text>
              <Text style={emptyText}>
                Puedes ver el estado de tus campañas en tiempo real desde el dashboard.
              </Text>
            </Section>
          )}

          {/* CTA */}
          <Section style={{ textAlign: 'center', padding: '8px 0 24px' }}>
            <Button
              href="https://www.trendpilot.marketing/dashboard"
              style={ctaButton}
            >
              Ver Dashboard Completo →
            </Button>
          </Section>

          <Hr style={divider} />
          <Section>
            <Text style={footer}>
              TrendPilot · Automatia Negocios Inteligentes · Culiacán, Sinaloa
            </Text>
            <Text style={footer}>
              Recibes este reporte cada lunes por ser operador de TrendPilot.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

WeeklyReport.PreviewProps = {
  weekLabel:        'Semana del 29 abr — 5 may 2026',
  recipientName:    'Antonio',
  totalCommissions: 4320,
  totalSpend:       1800,
  topCampaign:      'Smartwatch Deportivo ML',
  campaigns: [
    { name: 'Smartwatch Deportivo', spend: 800, conversions: 12, commission: 2160, roi: 170 },
    { name: 'Airfryer Sin Aceite',  spend: 600, conversions: 8,  commission: 1248, roi: 108 },
    { name: 'GPS Mascotas',         spend: 400, conversions: 3,  commission: 912,  roi: 128 },
  ],
} satisfies WeeklyReportProps

export default WeeklyReport

// ─── Estilos ──────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: '40px 0',
}

const container: React.CSSProperties = {
  maxWidth: '600px',
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
  backgroundColor: '#0066ff15',
  color: '#4da6ff',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '1.5px',
  padding: '4px 14px',
  borderRadius: '20px',
  border: '1px solid #0066ff30',
}

const h1: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '26px',
  fontWeight: '800',
  margin: '12px 0 4px',
}

const subtitle: React.CSSProperties = { color: '#666', fontSize: '14px', margin: '4px 0' }

const kpiGrid: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginBottom: '16px',
}

const kpiCard: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#111',
  border: '1px solid #1a1a1a',
  borderRadius: '12px',
  padding: '16px',
  textAlign: 'center',
}

const kpiLabel: React.CSSProperties = {
  color: '#555',
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  margin: '0 0 8px',
}

const kpiValue: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '800',
  fontFamily: 'monospace',
  margin: 0,
  lineHeight: '1',
}

const kpiSub: React.CSSProperties = { color: '#444', fontSize: '11px', margin: '4px 0 0' }

const starCard: React.CSSProperties = {
  backgroundColor: '#00ff880a',
  border: '1px solid #00ff8820',
  borderRadius: '10px',
  padding: '14px 18px',
  marginBottom: '16px',
}

const starLabel: React.CSSProperties = {
  color: '#00ff8880',
  fontSize: '10px',
  fontWeight: '700',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  margin: '0 0 4px',
}

const starName: React.CSSProperties = {
  color: '#00ff88',
  fontSize: '16px',
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
  margin: '0 0 12px',
}

const tableHeader: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #1f1f1f',
  paddingBottom: '8px',
  marginBottom: '4px',
}

const tableRow: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #141414',
  padding: '8px 0',
}

const tableCell: React.CSSProperties = {
  color: '#555',
  fontSize: '12px',
  margin: 0,
  padding: '0 4px',
}

const emptyCard: React.CSSProperties = {
  backgroundColor: '#111',
  border: '1px solid #1a1a1a',
  borderRadius: '14px',
  padding: '32px 24px',
  textAlign: 'center',
  marginBottom: '16px',
}

const emptyIcon: React.CSSProperties = { fontSize: '36px', margin: '0 0 12px' }

const emptyTitle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0 0 12px',
}

const emptyText: React.CSSProperties = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 8px',
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

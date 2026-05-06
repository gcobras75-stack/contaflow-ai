import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr,
} from '@react-email/components'
import * as React from 'react'

export interface CommissionAlertProps {
  operatorName:     string
  product:          string
  saleAmount:       number
  commissionAmount: number
  operatorShare:    number   // 70%
  antonioShare:     number   // 30%
  network:          string
  date:             string
}

export function CommissionAlert({
  operatorName,
  product,
  saleAmount,
  commissionAmount,
  operatorShare,
  antonioShare,
  network,
  date,
}: CommissionAlertProps) {
  const networkLabel = network === 'mercadolibre' ? '🛒 MercadoLibre'
    : network === 'shein' ? '👗 SHEIN'
    : network === 'temu'  ? '🟠 Temu'
    : network.toUpperCase()

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
            <Text style={badge}>💰 NUEVA COMISIÓN</Text>
            <Heading style={h1}>Comisión registrada</Heading>
            <Text style={subtitle}>Hola {operatorName}</Text>
          </Section>

          {/* Main metric — tu ganancia */}
          <Section style={heroCard}>
            <Text style={heroLabel}>Tu ganancia (70%)</Text>
            <Text style={heroValue}>${operatorShare.toFixed(2)}<span style={{ fontSize: '20px' }}> MXN</span></Text>
          </Section>

          {/* Detalle */}
          <Section style={card}>
            <Text style={sectionTitle}>Detalle de la venta</Text>
            <Row label="Producto"       value={product} />
            <Row label="Monto de venta" value={`$${saleAmount.toFixed(2)} MXN`} />
            <Row label="Comisión total" value={`$${commissionAmount.toFixed(2)} MXN`} />
            <Hr style={innerDivider} />
            <Row label="Tu parte (70%)" value={`$${operatorShare.toFixed(2)} MXN`} green />
            <Row label="TrendPilot (30%)" value={`$${antonioShare.toFixed(2)} MXN`} />
            <Row label="Red afiliada"   value={networkLabel} />
            <Row label="Fecha"          value={date} />
          </Section>

          {/* CTA */}
          <Section style={{ textAlign: 'center', padding: '8px 0 24px' }}>
            <Button
              href="https://www.trendpilot.marketing/dashboard/commissions"
              style={ctaButton}
            >
              Ver en Dashboard →
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

CommissionAlert.PreviewProps = {
  operatorName:     'Manuel García',
  product:          'Smartwatch Deportivo',
  saleAmount:       1500,
  commissionAmount: 90,
  operatorShare:    63,
  antonioShare:     27,
  network:          'mercadolibre',
  date:             '6 may 2026',
} satisfies CommissionAlertProps

export default CommissionAlert

// ─── Sub-componente ───────────────────────────────────────────────────────────

function Row({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return (
    <Section style={{ marginBottom: '8px' }}>
      <Text style={rowLabel}>{label}</Text>
      <Text style={{ ...rowValue, ...(green ? { color: '#00ff88', fontWeight: '700' } : {}) }}>
        {value}
      </Text>
    </Section>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: '40px 0',
}

const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '0 20px',
}

const logo: React.CSSProperties = {
  color: '#00ff88',
  fontSize: '26px',
  fontWeight: '800',
  margin: 0,
}

const divider: React.CSSProperties = {
  borderColor: '#1a1a1a',
  margin: '8px 0',
}

const innerDivider: React.CSSProperties = {
  borderColor: '#1f1f1f',
  margin: '12px 0',
}

const badge: React.CSSProperties = {
  backgroundColor: '#00ff8815',
  color: '#00ff88',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '1.5px',
  padding: '4px 14px',
  borderRadius: '20px',
  border: '1px solid #00ff8830',
}

const h1: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '800',
  margin: '12px 0 4px',
  letterSpacing: '-0.5px',
}

const subtitle: React.CSSProperties = {
  color: '#666',
  fontSize: '14px',
  margin: '4px 0',
}

const heroCard: React.CSSProperties = {
  backgroundColor: '#00ff880e',
  border: '1px solid #00ff8825',
  borderRadius: '14px',
  padding: '24px',
  textAlign: 'center',
  marginBottom: '16px',
}

const heroLabel: React.CSSProperties = {
  color: '#00ff8899',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  margin: '0 0 8px',
}

const heroValue: React.CSSProperties = {
  color: '#00ff88',
  fontSize: '48px',
  fontWeight: '800',
  fontFamily: 'monospace',
  lineHeight: '1',
  margin: 0,
  letterSpacing: '-1px',
}

const card: React.CSSProperties = {
  backgroundColor: '#111111',
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

const rowLabel: React.CSSProperties = {
  color: '#555',
  fontSize: '11px',
  margin: '0 0 2px',
}

const rowValue: React.CSSProperties = {
  color: '#cccccc',
  fontSize: '14px',
  fontWeight: '500',
  margin: 0,
}

const ctaButton: React.CSSProperties = {
  backgroundColor: '#00ff88',
  color: '#000000',
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

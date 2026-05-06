import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr, Link,
} from '@react-email/components'
import * as React from 'react'

export interface WelcomeEmailProps {
  name:   string
  region: string
  email:  string
}

export function WelcomeEmail({ name, region, email }: WelcomeEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Body style={body}>
        <Container style={container}>

          {/* Logo */}
          <Section style={logoSection}>
            <Text style={logo}>TrendPilot</Text>
          </Section>

          <Hr style={divider} />

          {/* Hero */}
          <Section style={hero}>
            <Text style={badge}>NUEVO OPERADOR</Text>
            <Heading style={h1}>Bienvenido a la familia</Heading>
            <Text style={subtitle}>
              El sistema de afiliados más inteligente de México
            </Text>
          </Section>

          {/* Greeting */}
          <Section style={card}>
            <Text style={bodyText}>
              Hola <strong style={{ color: '#00ff88' }}>{name}</strong>,
            </Text>
            <Text style={bodyText}>
              Ya eres operador oficial de la región{' '}
              <strong style={{ color: '#ffffff' }}>{region}</strong>.
              Tu cuenta está activa y lista para usar.
            </Text>

            {/* Acceso */}
            <Section style={infoBox}>
              <Text style={infoLabel}>Tu acceso al sistema</Text>
              <Text style={infoValue}>{email}</Text>
              <Text style={{ ...infoLabel, marginTop: '12px' }}>Región asignada</Text>
              <Text style={{ ...infoValue, textTransform: 'capitalize' }}>{region}</Text>
            </Section>
          </Section>

          {/* CTA */}
          <Section style={{ textAlign: 'center', padding: '8px 0 24px' }}>
            <Button
              href="https://www.trendpilot.marketing/dashboard"
              style={ctaButton}
            >
              Ir a mi Dashboard →
            </Button>
          </Section>

          {/* Features */}
          <Section style={card}>
            <Text style={sectionTitle}>¿Qué puedes hacer ahora?</Text>
            {[
              '📊  Ver tus campañas activas y su ROI en tiempo real',
              '💰  Registrar comisiones de MercadoLibre y SHEIN',
              '🏦  Consultar tu split 70/30 por cada venta',
              '📈  Acceder al TrendRadar para detectar tendencias',
              '🤖  Usar el análisis IA de Claude para optimizar campañas',
            ].map((feat, i) => (
              <Text key={i} style={featureItem}>{feat}</Text>
            ))}
          </Section>

          <Hr style={divider} />

          {/* Soporte */}
          <Section style={{ padding: '16px 0' }}>
            <Text style={supportText}>
              ¿Tienes dudas? Escríbele directamente a Antonio:
            </Text>
            <Text style={supportText}>
              <Link href="mailto:antonio@automatia.mx" style={link}>
                antonio@automatia.mx
              </Link>
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section>
            <Text style={footer}>
              Automatia Negocios Inteligentes · Culiacán, Sinaloa, México
            </Text>
            <Text style={footer}>
              © {new Date().getFullYear()} TrendPilot · Todos los derechos reservados
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

WelcomeEmail.PreviewProps = {
  name:   'Manuel García',
  region: 'sinaloa',
  email:  'manuel@trendpilot.marketing',
} satisfies WelcomeEmailProps

export default WelcomeEmail

// ─── Estilos ──────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: '40px 0',
}

const container: React.CSSProperties = {
  maxWidth: '580px',
  margin: '0 auto',
  padding: '0 20px',
}

const logoSection: React.CSSProperties = {
  textAlign: 'center',
  padding: '24px 0 16px',
}

const logo: React.CSSProperties = {
  color: '#00ff88',
  fontSize: '28px',
  fontWeight: '800',
  letterSpacing: '-0.5px',
  margin: 0,
}

const divider: React.CSSProperties = {
  borderColor: '#1a1a1a',
  margin: '8px 0',
}

const hero: React.CSSProperties = {
  textAlign: 'center',
  padding: '24px 0 16px',
}

const badge: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#00ff8820',
  color: '#00ff88',
  fontSize: '10px',
  fontWeight: '700',
  letterSpacing: '2px',
  padding: '4px 12px',
  borderRadius: '20px',
  border: '1px solid #00ff8840',
  margin: '0 0 16px',
}

const h1: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: '800',
  lineHeight: '1.2',
  margin: '0 0 8px',
  letterSpacing: '-0.5px',
}

const subtitle: React.CSSProperties = {
  color: '#666666',
  fontSize: '14px',
  margin: '0 0 8px',
}

const card: React.CSSProperties = {
  backgroundColor: '#111111',
  borderRadius: '12px',
  border: '1px solid #1a1a1a',
  padding: '24px',
  marginBottom: '16px',
}

const bodyText: React.CSSProperties = {
  color: '#cccccc',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 12px',
}

const infoBox: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  borderRadius: '8px',
  border: '1px solid #1f1f1f',
  padding: '16px',
  marginTop: '16px',
}

const infoLabel: React.CSSProperties = {
  color: '#555555',
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  margin: '0 0 4px',
}

const infoValue: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  fontFamily: 'monospace',
  margin: 0,
}

const ctaButton: React.CSSProperties = {
  backgroundColor: '#00ff88',
  color: '#000000',
  fontSize: '15px',
  fontWeight: '700',
  padding: '14px 32px',
  borderRadius: '10px',
  textDecoration: 'none',
  display: 'inline-block',
}

const sectionTitle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  margin: '0 0 16px',
  textTransform: 'uppercase',
}

const featureItem: React.CSSProperties = {
  color: '#aaaaaa',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 8px',
  paddingLeft: '4px',
}

const supportText: React.CSSProperties = {
  color: '#666666',
  fontSize: '13px',
  textAlign: 'center',
  margin: '4px 0',
}

const link: React.CSSProperties = {
  color: '#00ff88',
  textDecoration: 'none',
}

const footer: React.CSSProperties = {
  color: '#333333',
  fontSize: '11px',
  textAlign: 'center',
  margin: '4px 0',
}

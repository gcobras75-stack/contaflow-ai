import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import ImportChatbot from '@/components/ImportChatbot'

export const metadata: Metadata = {
  title: {
    default:  'TrendPilot — Marketing automatizado con IA',
    template: '%s | TrendPilot',
  },
  description: 'Detectamos los productos más vendidos, encontramos vendedores y lanzamos campañas automáticas en Meta y TikTok. Tú cobras sin hacer nada.',
  keywords:    ['marketing automatizado', 'Meta Ads', 'TikTok Ads', 'e-commerce México', 'vendedores online', 'comisiones automáticas'],
  authors:     [{ name: 'Automatia Negocios Inteligentes' }],
  creator:     'Automatia',
  metadataBase: new URL('https://www.trendpilot.marketing'),
  openGraph: {
    type:        'website',
    locale:      'es_MX',
    url:         'https://www.trendpilot.marketing',
    title:       'TrendPilot — Marketing automatizado con IA',
    description: 'Detectamos tendencias, lanzamos campañas, tú cobras. El piloto inteligente de tus ventas.',
    siteName:    'TrendPilot',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'TrendPilot — Marketing automatizado con IA',
    description: 'Detectamos tendencias, lanzamos campañas, tú cobras.',
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  icons: {
    icon:  [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0F1E',
  width:      'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">
        {children}
        <ImportChatbot />
      </body>
    </html>
  )
}

/** @type {import('next').NextConfig} */

// Dominios permitidos para CORS y CSP
const ALLOWED_ORIGINS = [
  'https://trendpilot.marketing',
  'https://www.trendpilot.marketing',
  'https://trendpilot.vercel.app',
]

const isDev = process.env.NODE_ENV === 'development'

// Headers de seguridad aplicados a todas las respuestas
const securityHeaders = [
  // Evita que la app se cargue en iframes (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },

  // Evita MIME-sniffing attacks
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Controla referrer al navegar
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // Bloquea acceso a cámara, micrófono y GPS
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },

  // Fuerza HTTPS por 1 año
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },

  // Content Security Policy: solo permite conexiones a servicios reales de TrendPilot
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: solo nuestro código + Next.js inline (necesario para hidratación)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Estilos: propio + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fuentes: propio + Google Fonts CDN
      "font-src 'self' https://fonts.gstatic.com",
      // Imágenes: propio + data URIs + blobs + CDN de MercadoLibre
      "img-src 'self' data: blob: https://*.mlstatic.com https://http.mlstatic.com",
      // Conexiones API: solo servicios que realmente usamos
      [
        "connect-src 'self'",
        '*.supabase.co',
        'https://api.mercadopago.com',
        'https://graph.facebook.com',
        'https://business-api.tiktok.com',
        'https://api.twilio.com',
        'https://api.resend.com',
        'https://api.openai.com',
        'https://api.anthropic.com',
        'https://api.mercadolibre.com',
        // Desarrollo local
        ...(isDev ? ['http://localhost:*', 'ws://localhost:*'] : []),
      ].join(' '),
      // Frames: nunca
      "frame-ancestors 'none'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  async headers() {
    return [
      // Aplicar headers de seguridad a TODAS las rutas
      {
        source: '/(.*)',
        headers: securityHeaders,
      },

      // CORS para las APIs de TrendPilot
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            // En dev permite localhost, en prod solo dominios autorizados
            value: isDev ? 'http://localhost:3000' : 'https://trendpilot.marketing',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Authorization, Content-Type, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
    ]
  },

  async redirects() {
    return [
      // HTTP → HTTPS en producción
      ...(isDev
        ? []
        : [
            {
              source: '/(.*)',
              has: [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
              destination: 'https://trendpilot.marketing/:path*',
              permanent: true,
            },
          ]),
    ]
  },
}

export default nextConfig

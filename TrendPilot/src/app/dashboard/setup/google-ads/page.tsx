'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle2, Circle, ExternalLink, Copy, Check,
  ShoppingCart, Key, Globe, Settings, Zap,
} from 'lucide-react'
import { cn } from '@/utils'

// ─── Guía de configuración Google Shopping Ads — 5 pasos ─────────────────────

const STEPS = [
  {
    id:    1,
    icon:  ShoppingCart,
    title: 'Crear cuenta Google Merchant Center',
    desc:  'El catálogo de productos que Google Shopping usa para mostrar tus anuncios.',
    actions: [
      { label: 'Abrir Merchant Center', href: 'https://merchants.google.com', external: true },
    ],
    instructions: [
      'Ve a merchants.google.com y haz clic en "Comenzar"',
      'Selecciona el país de tu negocio: México',
      'Sube tus productos o conéctalos con tu tienda',
      'Verifica tu dominio (agrega la meta tag o archivo HTML)',
      'Copia tu Merchant Center ID (número en la esquina superior izquierda)',
    ],
    envVars: [{ key: 'GOOGLE_ADS_MERCHANT_ID', placeholder: '123456789' }],
  },
  {
    id:    2,
    icon:  Key,
    title: 'Solicitar Developer Token de Google Ads',
    desc:  'Token de acceso a la API de Google Ads — requiere cuenta Google Ads activa.',
    actions: [
      { label: 'Google Ads API Center', href: 'https://ads.google.com/intl/es/home/tools/api/', external: true },
    ],
    instructions: [
      'Inicia sesión en Google Ads (ads.google.com)',
      'Ve a Herramientas → Centro de API',
      'Solicita acceso de prueba o producción',
      'Copia el Developer Token que aparece en pantalla',
      'Guarda también tu Customer ID (xxx-xxx-xxxx en la esquina superior)',
    ],
    envVars: [
      { key: 'GOOGLE_ADS_DEVELOPER_TOKEN', placeholder: 'ABcd_EFgh-1234...' },
      { key: 'GOOGLE_ADS_CUSTOMER_ID',     placeholder: '123-456-7890' },
    ],
  },
  {
    id:    3,
    icon:  Globe,
    title: 'Crear credenciales OAuth2 en Google Cloud',
    desc:  'Necesitas un proyecto en Google Cloud Console con la Google Ads API habilitada.',
    actions: [
      { label: 'Google Cloud Console', href: 'https://console.cloud.google.com/', external: true },
    ],
    instructions: [
      'Crea un nuevo proyecto en Google Cloud Console',
      'Habilita "Google Ads API" en Biblioteca de APIs',
      'Ve a Credenciales → Crear credencial → OAuth 2.0',
      'Tipo de aplicación: "Aplicación de escritorio"',
      'Descarga el JSON de credenciales y copia Client ID y Client Secret',
    ],
    envVars: [
      { key: 'GOOGLE_ADS_CLIENT_ID',     placeholder: '1234567890-abc.apps.googleusercontent.com' },
      { key: 'GOOGLE_ADS_CLIENT_SECRET', placeholder: 'GOCSPX-abc123...' },
    ],
  },
  {
    id:    4,
    icon:  Settings,
    title: 'Obtener Refresh Token',
    desc:  'Autoriza la aplicación con tu cuenta Google Ads para obtener un token permanente.',
    actions: [],
    instructions: [
      'Instala la librería Google Ads: npm install google-ads-api',
      'Ejecuta el script de autenticación OAuth2:',
      '  node -e "const {GoogleAdsApi} = require(\'google-ads-api\'); ..."',
      'O usa el Playground de OAuth2: oauth2.googleapis.com/token',
      'Copia el Refresh Token de la respuesta (empieza con "1//...")',
    ],
    envVars: [
      { key: 'GOOGLE_ADS_REFRESH_TOKEN', placeholder: '1//0g-abc123...' },
    ],
    codeSnippet: `# Script OAuth2 rápido (Node.js)
const {OAuth2Client} = require('google-auth-library')
const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, 'urn:ietf:wg:oauth:2.0:oob')
const url = client.generateAuthUrl({ scope: ['https://www.googleapis.com/auth/adwords'] })
console.log('Visita:', url)
// Pega el código y obtén tokens:
const {tokens} = await client.getToken(CODE)
console.log('Refresh Token:', tokens.refresh_token)`,
  },
  {
    id:    5,
    icon:  Zap,
    title: 'Configurar en Vercel y verificar',
    desc:  'Agrega todas las variables de entorno en Vercel y verifica la conexión.',
    actions: [
      { label: 'Abrir Vercel Dashboard', href: 'https://vercel.com/dashboard', external: true },
    ],
    instructions: [
      'Ve a tu proyecto TrendPilot en Vercel',
      'Settings → Environment Variables',
      'Agrega todas las variables de esta guía',
      'Marca cada una como "Sensitive" para mayor seguridad',
      'Redespliega el proyecto para que los cambios tomen efecto',
      'Verifica la conexión usando el botón de abajo',
    ],
    envVars: [],
  },
]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function GoogleAdsSetupPage() {
  const router   = useRouter()
  const [step,   setStep]   = useState(1)
  const [done,   setDone]   = useState<number[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)

  const current = STEPS.find((s) => s.id === step)!

  function markDone(id: number) {
    setDone((prev) => prev.includes(id) ? prev : [...prev, id])
    if (id < 5) setStep(id + 1)
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* silencioso */ }
  }

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      // Llama a un endpoint ligero que verifica si las credenciales existen
      const res = await fetch('/api/google-ads/status')
      const json = await res.json()
      setTestResult(json.connected ? 'ok' : 'fail')
    } catch {
      setTestResult('fail')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-brand-border transition-colors text-brand-muted hover:text-white"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart size={20} className="text-[#4285F4]" />
            Configuración Google Shopping Ads
          </h1>
          <p className="text-sm text-brand-muted mt-0.5">Guía paso a paso para conectar Google Ads API</p>
        </div>
        <div className="ml-auto">
          <span className="text-[10px] px-2 py-1 bg-brand-yellow/15 text-brand-yellow rounded-full border border-brand-yellow/20 font-semibold">
            SUPERADMIN
          </span>
        </div>
      </div>

      {/* Progreso */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <button
              onClick={() => setStep(s.id)}
              className="flex flex-col items-center gap-1.5 flex-1"
            >
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all border-2',
                done.includes(s.id)
                  ? 'border-brand-green bg-brand-green/15 text-brand-green'
                  : step === s.id
                  ? 'border-brand-primary bg-brand-primary/15 text-brand-primary'
                  : 'border-brand-border bg-brand-hover text-brand-faint',
              )}>
                {done.includes(s.id) ? <CheckCircle2 size={18} /> : <span className="text-xs font-bold">{s.id}</span>}
              </div>
              <span className={cn(
                'text-[9px] font-medium hidden sm:block text-center leading-tight w-16',
                step === s.id ? 'text-brand-primary' : done.includes(s.id) ? 'text-brand-green' : 'text-brand-faint',
              )}>
                {s.title.split(' ').slice(0, 3).join(' ')}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn('h-px flex-1 mx-1 transition-all', done.includes(s.id) ? 'bg-brand-green' : 'bg-brand-border')} />
            )}
          </div>
        ))}
      </div>

      {/* Paso actual */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-5">
        {/* Título del paso */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4285F4]/15 flex items-center justify-center shrink-0">
            <current.icon size={20} className="text-[#4285F4]" />
          </div>
          <div>
            <p className="text-[10px] text-brand-faint uppercase tracking-widest mb-0.5">Paso {current.id} de 5</p>
            <h2 className="text-base font-bold text-white">{current.title}</h2>
            <p className="text-sm text-brand-muted mt-1">{current.desc}</p>
          </div>
        </div>

        {/* Links de acción */}
        {current.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {current.actions.map((a) => (
              <a
                key={a.label}
                href={a.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#4285F4]/10 border border-[#4285F4]/25 text-[#4285F4] rounded-xl text-sm font-medium hover:bg-[#4285F4]/20 transition-colors"
              >
                {a.label} <ExternalLink size={13} />
              </a>
            ))}
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-brand-hover rounded-xl p-4 space-y-2">
          {current.instructions.map((ins, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-brand-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-brand-primary">{i + 1}</span>
              </div>
              <p className={cn('text-sm leading-relaxed', ins.startsWith('  ') ? 'text-brand-faint font-mono text-xs ml-2' : 'text-brand-text')}>
                {ins}
              </p>
            </div>
          ))}
        </div>

        {/* Code snippet */}
        {current.codeSnippet && (
          <div className="relative">
            <pre className="bg-[#0A0F1C] border border-brand-border rounded-xl p-4 text-xs text-brand-muted overflow-x-auto leading-relaxed">
              {current.codeSnippet}
            </pre>
            <button
              onClick={() => copyToClipboard(current.codeSnippet!)}
              className="absolute top-3 right-3 p-1.5 bg-brand-border rounded-lg hover:bg-brand-hover transition-colors"
            >
              {copied === current.codeSnippet
                ? <Check size={12} className="text-brand-green" />
                : <Copy size={12} className="text-brand-muted" />
              }
            </button>
          </div>
        )}

        {/* Variables de entorno */}
        {current.envVars.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-brand-muted font-semibold">Variables de entorno a configurar:</p>
            {current.envVars.map((env) => (
              <div key={env.key} className="flex items-center gap-2 bg-brand-hover border border-brand-border rounded-lg px-3 py-2">
                <code className="text-xs text-brand-primary font-mono flex-1">{env.key}</code>
                <span className="text-[10px] text-brand-faint font-mono truncate max-w-[200px]">= {env.placeholder}</span>
                <button
                  onClick={() => copyToClipboard(env.key)}
                  className="p-1 hover:bg-brand-border rounded transition-colors shrink-0"
                >
                  {copied === env.key
                    ? <Check size={11} className="text-brand-green" />
                    : <Copy size={11} className="text-brand-muted" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Test de conexión (paso 5) */}
        {current.id === 5 && (
          <div className="space-y-3">
            <button
              onClick={testConnection}
              disabled={testing}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#4285F4]/15 border border-[#4285F4]/30 text-[#4285F4] rounded-xl text-sm font-semibold hover:bg-[#4285F4]/25 transition-colors disabled:opacity-50"
            >
              <Zap size={14} />
              {testing ? 'Verificando...' : 'Verificar conexión'}
            </button>
            {testResult === 'ok' && (
              <div className="flex items-center gap-2 px-4 py-3 bg-brand-green/10 border border-brand-green/25 rounded-xl text-sm text-brand-green">
                <CheckCircle2 size={16} /> Google Ads API conectada correctamente
              </div>
            )}
            {testResult === 'fail' && (
              <div className="flex items-center gap-2 px-4 py-3 bg-brand-red/10 border border-brand-red/25 rounded-xl text-sm text-brand-red">
                <Circle size={16} /> Sin conexión — revisa las variables de entorno
              </div>
            )}
          </div>
        )}

        {/* Botones de navegación */}
        <div className="flex gap-3 pt-2">
          {current.id > 1 && (
            <button
              onClick={() => setStep(current.id - 1)}
              className="px-4 py-2.5 bg-brand-hover border border-brand-border text-brand-muted rounded-xl text-sm hover:text-white transition-colors"
            >
              ← Anterior
            </button>
          )}
          <button
            onClick={() => markDone(current.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4285F4] hover:bg-[#3367d6] text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {done.includes(current.id) ? <CheckCircle2 size={15} /> : null}
            {current.id < 5 ? 'Paso completado →' : 'Finalizar configuración ✓'}
          </button>
        </div>
      </div>

      {/* Resumen de variables */}
      <div className="mt-5 bg-brand-card border border-brand-border rounded-2xl p-5">
        <p className="text-xs font-semibold text-brand-text mb-3">Resumen de variables de entorno</p>
        <div className="space-y-1.5 font-mono text-xs">
          {[
            'GOOGLE_API_KEY',
            'GOOGLE_ADS_MERCHANT_ID',
            'GOOGLE_ADS_CLIENT_ID',
            'GOOGLE_ADS_CLIENT_SECRET',
            'GOOGLE_ADS_DEVELOPER_TOKEN',
            'GOOGLE_ADS_CUSTOMER_ID',
            'GOOGLE_ADS_REFRESH_TOKEN',
          ].map((key) => (
            <div key={key} className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full shrink-0',
                key === 'GOOGLE_API_KEY' ? 'bg-brand-green' : done.length >= 4 ? 'bg-brand-yellow' : 'bg-brand-border',
              )} />
              <span className="text-brand-primary">{key}</span>
              <span className="text-brand-faint">=</span>
              <span className="text-brand-muted italic">
                {key === 'GOOGLE_API_KEY' ? 'ya configurada ✓' : 'pendiente'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-brand-faint mt-3">
          GOOGLE_API_KEY ya está configurada desde la integración Nano Banana (Gemini).
          El resto requiere cuenta Google Ads activa.
        </p>
      </div>
    </div>
  )
}

// Validación de variables de entorno al arrancar
// Si falta alguna crítica → la app no arranca en producción

// Variables del servidor requeridas siempre
const SERVER_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'ANTHROPIC_API_KEY',
] as const

// Variables requeridas solo en producción
const PRODUCTION_VARS = [
  'MERCADOPAGO_ACCESS_TOKEN',
  'MERCADOPAGO_PUBLIC_KEY',
  'RESEND_API_KEY',
  'NEXTAUTH_URL',
] as const

type ServerVar = typeof SERVER_VARS[number]

function validateEnv(): void {
  const missing: string[] = []
  const isProd = process.env.NODE_ENV === 'production'

  for (const key of SERVER_VARS) {
    if (!process.env[key]) missing.push(key)
  }

  if (isProd) {
    for (const key of PRODUCTION_VARS) {
      if (!process.env[key]) missing.push(key)
    }
  }

  if (missing.length > 0) {
    const list = missing.map((k) => `  • ${k}`).join('\n')
    throw new Error(
      `TrendPilot no puede arrancar: faltan variables de entorno críticas.\n` +
      `Agrega estas variables en .env.local (desarrollo) o en Vercel (producción):\n\n` +
      `${list}\n\n` +
      `Consulta .env.example para ver la lista completa.`
    )
  }
}

// Acceso tipado y seguro a variables de servidor
export function getServerEnv(key: ServerVar): string {
  const value = process.env[key]
  if (!value) throw new Error(`Variable de entorno requerida no configurada. Revisar configuración del servidor.`)
  return value
}

// Ejecutar validación una vez al importar (solo en servidor)
if (typeof window === 'undefined') {
  try {
    validateEnv()
  } catch (error) {
    console.error('\n⛔ ERROR DE CONFIGURACIÓN:\n', (error as Error).message)
    if (process.env.NODE_ENV === 'production') process.exit(1)
  }
}

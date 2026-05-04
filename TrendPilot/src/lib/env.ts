// Validación de variables de entorno al arrancar
// Si falta alguna crítica → la app no arranca en producción

// Variables del lado del cliente (NEXT_PUBLIC_)
const PUBLIC_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

// Variables del servidor — NUNCA en el navegador
const SERVER_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
] as const

// Variables requeridas solo en producción
const PRODUCTION_VARS = [
  'MERCADOPAGO_ACCESS_TOKEN',
  'MERCADOPAGO_PUBLIC_KEY',
  'RESEND_API_KEY',
] as const

type PublicVar = typeof PUBLIC_VARS[number]
type ServerVar = typeof SERVER_VARS[number]

// Valida que las variables críticas existan
function validateEnv(): void {
  const missing: string[] = []
  const isProd = process.env.NODE_ENV === 'production'

  // Siempre requeridas
  for (const key of [...PUBLIC_VARS, ...SERVER_VARS]) {
    if (!process.env[key]) missing.push(key)
  }

  // Solo requeridas en producción
  if (isProd) {
    for (const key of PRODUCTION_VARS) {
      if (!process.env[key]) missing.push(key)
    }
  }

  if (missing.length > 0) {
    // NUNCA mostrar valores — solo los nombres de variables faltantes
    const list = missing.map(k => `  • ${k}`).join('\n')
    throw new Error(
      `TrendPilot no puede arrancar: faltan variables de entorno críticas.\n` +
      `Agrega estas variables en .env.local (desarrollo) o en Vercel/Railway (producción):\n\n` +
      `${list}\n\n` +
      `Consulta .env.example para ver la lista completa.`
    )
  }
}

// Acceso tipado y seguro a variables de servidor
// (lanza error si la variable no existe)
export function getServerEnv(key: ServerVar): string {
  const value = process.env[key]
  if (!value) {
    // Mensaje de error genérico — no revela info sensible
    throw new Error(`Variable de entorno requerida no configurada. Revisar configuración del servidor.`)
  }
  return value
}

// Acceso tipado a variables públicas
export function getPublicEnv(key: PublicVar): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Variable pública no configurada: ${key}`)
  }
  return value
}

// Ejecutar validación una vez al importar el módulo (solo en servidor)
if (typeof window === 'undefined') {
  try {
    validateEnv()
  } catch (error) {
    // En desarrollo mostrar el error completo
    // En producción también — necesitamos saber qué falta
    console.error('\n⛔ ERROR DE CONFIGURACIÓN:\n', (error as Error).message)
    // Solo detener en producción para evitar deploy roto silencioso
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}

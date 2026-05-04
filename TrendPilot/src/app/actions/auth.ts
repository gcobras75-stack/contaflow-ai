'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { AuthError } from 'next-auth'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'
import { signIn, signOut } from '@/lib/auth'
import { db } from '@/lib/db'
import { profiles, vendors } from '@/lib/schema'
import { logLoginFailed, logServerError } from '@/lib/logger'
import { sendVendorWelcome } from '@/lib/twilio'

const resend = new Resend(process.env.RESEND_API_KEY ?? '')

// ─── Schemas de validación ──────────────────────────────────────────────────

const LoginSchema = z.object({
  email:    z.string().email('Correo inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

const RegisterSchema = z.object({
  name:         z.string().min(2).max(100).trim(),
  email:        z.string().email().toLowerCase().trim(),
  password:     z.string().min(6),
  whatsapp:     z.string().regex(/^\+?[0-9]{10,15}$/, 'WhatsApp inválido'),
  product_type: z.string().min(2).max(100).trim(),
  plan:         z.enum(['despegue', 'piloto', 'comandante', 'flota']),
})

const AdminVendorSchema = z.object({
  name:            z.string().min(2).max(100).trim(),
  email:           z.string().email().toLowerCase().trim(),
  whatsapp_number: z.string().regex(/^\+?[0-9]{10,15}$/, 'WhatsApp inválido'),
  product_type:    z.string().min(2).max(100).trim(),
  plan:            z.enum(['despegue', 'piloto', 'comandante', 'flota']),
})

// ─── Email HTML ─────────────────────────────────────────────────────────────

function buildWelcomeEmail(name: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a TrendPilot</title>
</head>
<body style="margin:0;padding:0;background-color:#0A1628;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A1628;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#0D1F3C;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#0066FF;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">TrendPilot</h1>
              <p style="margin:8px 0 0;color:#c0d8ff;font-size:14px;">Marketing automatizado con IA</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600;">¡Bienvenido, ${name}! 🚀</h2>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Tu cuenta en TrendPilot ha sido creada exitosamente.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#0066FF;border-radius:8px;padding:14px 28px;">
                    <a href="https://trendpilot.marketing/login" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Acceder ahora →</a>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A1628;border-radius:8px;padding:20px;border:1px solid #1e3a5f;">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Tus datos de acceso</p>
                    <p style="margin:0 0 4px;color:#ffffff;font-size:14px;"><strong style="color:#00FF88;">Correo:</strong> ${email}</p>
                    <p style="margin:0;color:#94a3b8;font-size:13px;">Usa la contraseña que registraste al crear tu cuenta.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #1e3a5f;text-align:center;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">
                ¿Tienes dudas? <a href="mailto:soporte@trendpilot.marketing" style="color:#0066FF;text-decoration:none;">soporte@trendpilot.marketing</a>
              </p>
              <p style="margin:0;color:#4a6080;font-size:12px;">© 2025 TrendPilot. Todos los derechos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

// ─── loginAction ────────────────────────────────────────────────────────────

export async function loginAction(
  _prevState: { error: string } | undefined | void,
  formData: FormData
): Promise<{ error: string } | void> {
  const raw = {
    email:    formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = LoginSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    await signIn('credentials', {
      email:      parsed.data.email,
      password:   parsed.data.password,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      logLoginFailed(parsed.data.email, 'server-action', error.message)
      return { error: 'Correo o contraseña incorrectos' }
    }
    // Re-throw para que Next.js maneje el NEXT_REDIRECT
    throw error
  }
}

// ─── logoutAction ───────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}

// ─── registerAction ─────────────────────────────────────────────────────────

export async function registerAction(
  _prevState: { error: string } | undefined | void,
  formData: FormData
): Promise<{ error: string } | void> {
  const raw = {
    name:         formData.get('name'),
    email:        formData.get('email'),
    password:     formData.get('password'),
    whatsapp:     formData.get('whatsapp'),
    product_type: formData.get('product_type'),
    plan:         formData.get('plan'),
  }

  const parsed = RegisterSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, email, password, whatsapp, product_type, plan } = parsed.data

  // Verificar si el correo ya existe
  const existing = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, email)).limit(1)
  if (existing.length > 0) {
    return { error: 'Este correo ya está registrado.' }
  }

  try {
    // Hashear contraseña con bcrypt (12 rounds)
    const password_hash = await bcrypt.hash(password, 12)

    // Crear registro de vendor
    const [vendor] = await db.insert(vendors).values({
      name,
      email,
      whatsapp_number: whatsapp,
      product_type,
      plan,
      status: 'active',
    }).returning()

    // Crear perfil de usuario con referencia al vendor
    await db.insert(profiles).values({
      email,
      password_hash,
      name,
      role:      'vendor',
      vendor_id: vendor.id,
    })
  } catch (err) {
    logServerError(err, 'registerAction/insertUser')
    return { error: 'No se pudo completar el registro. Intenta de nuevo.' }
  }

  // Enviar email de bienvenida — fire-and-forget
  resend.emails.send({
    from:    'TrendPilot <hola@trendpilot.marketing>',
    to:      email,
    subject: 'Bienvenido a TrendPilot 🚀',
    html:    buildWelcomeEmail(name, email),
  }).catch((err) => logServerError(err, 'registerAction/sendEmail'))

  redirect('/login?registered=true')
}

// ─── createVendorByAdmin ─────────────────────────────────────────────────────

export async function createVendorByAdmin(data: {
  name:            string
  email:           string
  whatsapp_number: string
  product_type:    string
  plan:            'despegue' | 'piloto' | 'comandante' | 'flota'
}): Promise<{ success: true; vendorId: string } | { error: string }> {
  const parsed = AdminVendorSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, email, whatsapp_number, product_type, plan } = parsed.data

  // Contraseña temporal de 8 caracteres
  const tempPassword = Math.random().toString(36).slice(-4) +
    Math.random().toString(36).toUpperCase().slice(-4)

  try {
    const password_hash = await bcrypt.hash(tempPassword, 12)

    const [vendor] = await db.insert(vendors).values({
      name, email, whatsapp_number, product_type, plan, status: 'active',
    }).returning()

    await db.insert(profiles).values({
      email,
      password_hash,
      name,
      role:      'vendor',
      vendor_id: vendor.id,
    })

    // Notificaciones — fire-and-forget
    sendVendorWelcome(whatsapp_number, name).catch((err) =>
      logServerError(err, 'createVendorByAdmin/sendWhatsApp')
    )
    resend.emails.send({
      from:    'TrendPilot <hola@trendpilot.marketing>',
      to:      email,
      subject: 'Bienvenido a TrendPilot 🚀',
      html:    buildWelcomeEmail(name, email),
    }).catch((err) => logServerError(err, 'createVendorByAdmin/sendEmail'))

    return { success: true, vendorId: vendor.id }
  } catch (err) {
    logServerError(err, 'createVendorByAdmin')
    return { error: 'No se pudo crear el vendedor.' }
  }
}

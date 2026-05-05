import { auth } from './auth'
import { redirect } from 'next/navigation'

// Obtiene la sesión actual del servidor (Server Components / Server Actions)
export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

// Helpers de rol
export function isSuperAdmin(role?: string): boolean {
  return role === 'superadmin'
}

export function isAdmin(role?: string): boolean {
  return role === 'admin' || role === 'superadmin'
}

export function isSupervisor(role?: string): boolean {
  return role === 'supervisor'
}

export function isVendor(role?: string): boolean {
  return role === 'vendor'
}

// Verifica si el usuario puede hacer cambios (no es solo lectura)
export function canWrite(role?: string): boolean {
  return role === 'admin' || role === 'superadmin'
}

// Protege una ruta — redirige a /login si no hay sesión
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session.user
}

// Protege una ruta — redirige a /dashboard si el usuario no es admin o superadmin
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user.role)) redirect('/dashboard')
  return session.user
}

// Protege una ruta — solo superadmin
export async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isSuperAdmin(session.user.role)) redirect('/dashboard')
  return session.user
}

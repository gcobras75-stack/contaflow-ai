import { auth } from './auth'
import { redirect } from 'next/navigation'

// Obtiene la sesión actual del servidor (Server Components / Server Actions)
export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

// Verifica si el usuario tiene rol admin
export function isAdmin(role?: string): boolean {
  return role === 'admin'
}

// Verifica si el usuario tiene rol vendor
export function isVendor(role?: string): boolean {
  return role === 'vendor'
}

// Protege una ruta — redirige a /login si no hay sesión
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session.user
}

// Protege una ruta — redirige a /dashboard si el usuario no es admin
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'admin') redirect('/dashboard')
  return session.user
}

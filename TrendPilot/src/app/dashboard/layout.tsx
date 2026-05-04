import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'
import { MobileRedirect } from '@/components/dashboard/MobileRedirect'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

async function getSemaphoreData() {
  try {
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await service
      .from('campaigns')
      .select('semaphore_status')
      .in('semaphore_status', ['green', 'yellow', 'red'])

    if (!data) return { green: 0, yellow: 0, red: 0 }

    const counts = { green: 0, yellow: 0, red: 0 }
    data.forEach(({ semaphore_status }) => {
      if (semaphore_status in counts) {
        counts[semaphore_status as keyof typeof counts]++
      }
    })
    return counts
  } catch {
    return { green: 0, yellow: 0, red: 0 }
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificar sesión — el middleware ya protege la ruta, esto es para obtener datos del user
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Obtener perfil y rol del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  const semaphore = await getSemaphoreData()

  return (
    <div className="min-h-screen bg-brand-bg">
      <MobileRedirect />
      <Sidebar role={profile?.role ?? 'vendor'} />
      <Header
        green={semaphore.green}
        yellow={semaphore.yellow}
        red={semaphore.red}
        userName={profile?.name ?? user.email ?? ''}
        userRole={profile?.role ?? 'vendor'}
        userId={user.id}
      />
      <main className="ml-56 pt-14 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}

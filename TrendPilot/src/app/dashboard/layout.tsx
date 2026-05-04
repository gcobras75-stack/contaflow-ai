import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'
import { MobileRedirect } from '@/components/dashboard/MobileRedirect'
import { auth } from '@/lib/auth'
import { getSemaphoreCount } from '@/lib/queries/campaigns'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificar sesión NextAuth
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { user } = session
  const semaphore = await getSemaphoreCount().catch(() => ({ green: 0, yellow: 0, red: 0 }))

  return (
    <div className="min-h-screen bg-brand-bg">
      <MobileRedirect />
      <Sidebar role={user.role ?? 'vendor'} />
      <Header
        green={semaphore.green}
        yellow={semaphore.yellow}
        red={semaphore.red}
        userName={user.name ?? user.email ?? ''}
        userRole={user.role ?? 'vendor'}
        userId={user.id}
      />
      <main className="ml-56 pt-14 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}

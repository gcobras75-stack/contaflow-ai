import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'
import { MobileRedirect } from '@/components/dashboard/MobileRedirect'
import { SidebarProvider } from '@/components/dashboard/SidebarContext'
import { MainContent } from '@/components/dashboard/MainContent'
import { auth } from '@/lib/auth'
import { getSemaphoreCount } from '@/lib/queries/campaigns'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { user } = session
  const semaphore = await getSemaphoreCount().catch(() => ({ green: 0, yellow: 0, red: 0 }))
  const userName  = user.name ?? user.email ?? ''

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-brand-bg">
        <MobileRedirect />
        <Sidebar role={user.role ?? 'vendor'} userName={userName} />
        <Header
          green={semaphore.green}
          yellow={semaphore.yellow}
          red={semaphore.red}
          userName={userName}
          userRole={user.role ?? 'vendor'}
          userId={user.id}
        />
        <MainContent>{children}</MainContent>
      </div>
    </SidebarProvider>
  )
}

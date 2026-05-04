import { redirect } from 'next/navigation'

// Redirige al dashboard principal
export default function RootPage() {
  redirect('/dashboard')
}

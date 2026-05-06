'use client'

import { Suspense } from 'react'
import BuscarClient from './BuscarClient'

export default function BuscarPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0A1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#0066FF', fontSize: 18 }}>Buscando proveedores...</div>
      </div>
    }>
      <BuscarClient />
    </Suspense>
  )
}

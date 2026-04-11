'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single();

      if (data?.rol !== 'superadmin') { router.replace('/dashboard'); return; }
      setOk(true);
    })();
  }, [router]);

  if (!ok) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0F172A' }}>
        <div style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Verificando acceso…</div>
      </div>
    );
  }

  const navLinks = [
    { href: '/admin',          label: 'Resumen' },
    { href: '/admin/ingresos', label: 'Ingresos' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: '#E2E8F0' }}>
      {/* Top bar */}
      <header style={{
        background: '#1E293B', borderBottom: '1px solid #334155',
        padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 24,
      }}>
        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#F1F5F9', letterSpacing: '-0.01em' }}>
          ContaFlow <span style={{ color: '#22C55E' }}>Admin</span>
        </span>
        <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
          {navLinks.map(l => (
            <a
              key={l.href}
              href={l.href}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 500,
                textDecoration: 'none',
                background: pathname === l.href ? '#334155' : 'transparent',
                color: pathname === l.href ? '#F1F5F9' : '#94A3B8',
              }}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a href="/dashboard" style={{ fontSize: '0.8125rem', color: '#64748B', textDecoration: 'none' }}>
          ← Panel contador
        </a>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}

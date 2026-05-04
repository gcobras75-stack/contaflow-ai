'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/* ============================================================
   SIDEBAR — ContaFlow AI
   Navegación principal del panel de contadores
   ============================================================ */

type NavItem = {
  href:   string;
  label:  string;
  icon:   React.ReactNode;
  badge?: number | null;
};

function IconEmpresas({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M3 21h18M9 21V8.5a1 1 0 011-1h4a1 1 0 011 1V21M3 21V11a2 2 0 012-2h2M19 21V11a2 2 0 00-2-2h-2M9 3h6l1.5 5.5H7.5L9 3z" />
    </svg>
  );
}

function IconCFDIs({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function IconConciliacion({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function IconExportar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function IconCalendario({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IconBilling({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function IconConfiguracion({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconAdmin({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function LogoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {/* Flujo de datos — dos líneas que convergen hacia la derecha */}
      <rect x="2" y="5" width="10" height="2.5" rx="1.25" fill="white" opacity="0.9" />
      <rect x="2" y="9" width="14" height="2.5" rx="1.25" fill="white" />
      <rect x="2" y="13" width="10" height="2.5" rx="1.25" fill="white" opacity="0.9" />
      {/* Punto de acción — verde */}
      <circle cx="17" cy="10.25" r="2.5" fill="#00A651" />
    </svg>
  );
}

/* ---- Iniciales del usuario para el avatar ---- */
function getInitials(email: string): string {
  const parts = email.split('@')[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

/* ============================================================
   COMPONENTE SIDEBAR
   ============================================================ */

function Sidebar({
  navItems,
  userEmail,
  userRole,
  onLogout,
}: {
  navItems: NavItem[];
  userEmail: string;
  userRole?: string;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  /* Determina si una ruta está activa */
  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <aside className="sidebar" role="navigation" aria-label="Navegación principal">

      {/* ---- Logo ---- */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark" aria-hidden="true">
          <LogoMark />
        </div>
        <div>
          <div className="sidebar-logo-text">
            ContaFlow <span className="sidebar-logo-ai">AI</span>
          </div>
          <div style={{ fontSize: '0.5625rem', color: '#6B7280', fontWeight: 500, marginTop: '1px', letterSpacing: '0.04em' }}>
            PANEL CONTABLE
          </div>
        </div>
      </div>

      {/* ---- Navegación ---- */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Principal</div>

        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`sidebar-item ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="sidebar-badge" aria-label={`${item.badge} pendientes`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      {/* ---- Footer: usuario + logout ---- */}
      <div className="sidebar-footer">
        {userEmail && (
          <div className="sidebar-user" title={userEmail} aria-label="Perfil de usuario">
            <div className="sidebar-avatar" aria-hidden="true">
              {getInitials(userEmail)}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{userEmail.split('@')[0]}</div>
              <div className="sidebar-user-role">
                {userRole === 'superadmin' ? 'Super Admin' : 'Contador'}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          className="sidebar-item"
          style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', marginTop: '0.25rem' }}
          aria-label="Cerrar sesión"
        >
          <span className="sidebar-item-icon">
            <IconLogout className="w-4.5 h-4.5" />
          </span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

/* ============================================================
   LAYOUT PRINCIPAL DEL DASHBOARD
   ============================================================ */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const [userEmail,    setUserEmail]    = useState('');
  const [pendientes,   setPendientes]   = useState<number | null>(null);
  const [sinPagar,     setSinPagar]     = useState<number | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserEmail(user.email ?? '');

      /* Cargar conteo de CFDIs pendientes para el badge */
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('despacho_id, rol')
        .eq('id', user.id)
        .single();

      if (usuario?.rol === 'superadmin') setIsSuperAdmin(true);

      if (!usuario?.despacho_id) { router.replace('/onboarding'); return; }

      const { data: emps } = await supabase
        .from('empresas_clientes')
        .select('id')
        .eq('despacho_id', usuario.despacho_id)
        .eq('activa', true);

      if (!emps || emps.length === 0) { setPendientes(0); return; }

      const empIds = emps.map(e => e.id);

      const [cfdiRes, subsRes] = await Promise.all([
        supabase
          .from('cfdis')
          .select('id', { count: 'exact', head: true })
          .in('empresa_id', empIds)
          .eq('status', 'pendiente'),
        supabase
          .from('suscripciones')
          .select('id', { count: 'exact', head: true })
          .in('empresa_id', empIds)
          .in('status', ['vencida', 'cancelada']),
      ]);

      setPendientes(cfdiRes.count ?? 0);
      setSinPagar(subsRes.count ?? 0);
    }
    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const navItems: NavItem[] = [
    ...(isSuperAdmin ? [{
      href:  '/admin',
      label: 'Admin',
      icon:  <IconAdmin className="sidebar-item-icon" />,
    }] : []),
    {
      href:  '/dashboard',
      label: 'Empresas',
      icon:  <IconEmpresas className="sidebar-item-icon" />,
    },
    {
      href:   '/dashboard/cfdis',
      label:  'CFDIs',
      icon:   <IconCFDIs className="sidebar-item-icon" />,
      badge:  pendientes,
    },
    {
      href:  '/dashboard/conciliacion',
      label: 'Conciliación',
      icon:  <IconConciliacion className="sidebar-item-icon" />,
    },
    {
      href:  '/dashboard/exportar',
      label: 'Exportar',
      icon:  <IconExportar className="sidebar-item-icon" />,
    },
    {
      href:  '/dashboard/calendario',
      label: 'Calendario Fiscal',
      icon:  <IconCalendario className="sidebar-item-icon" />,
    },
    {
      href:  '/dashboard/billing',
      label: 'Facturación',
      icon:  <IconBilling className="sidebar-item-icon" />,
      badge: sinPagar,
    },
    {
      href:  '/dashboard/configuracion',
      label: 'Configuración',
      icon:  <IconConfiguracion className="sidebar-item-icon" />,
    },
  ];

  return (
    <div className="app-shell">
      <Sidebar
        navItems={navItems}
        userEmail={userEmail}
        userRole={isSuperAdmin ? 'superadmin' : undefined}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

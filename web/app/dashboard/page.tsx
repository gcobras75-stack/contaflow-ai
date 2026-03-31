'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const NAV_ITEMS = [
  { href: '/dashboard/empresas',      label: 'Empresas',      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { href: '/dashboard/cfdis',         label: 'CFDIs',         icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href: '/dashboard/conciliacion',  label: 'Conciliación',  icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { href: '/dashboard/exportar',      label: 'Exportar',      icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login');
      } else {
        setUserEmail(user.email ?? '');
      }
    });
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Header */}
      <header className="bg-[#1B3A6B] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-end gap-1">
          <span className="text-2xl font-extrabold tracking-tight">ContaFlow</span>
          <span className="text-lg font-bold text-[#00A651] mb-0.5">AI</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/70 hidden sm:block">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 text-sm text-white px-3 py-1.5 rounded-lg transition"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Banner */}
      <div className="bg-[#E8F8F0] border-b border-[#D0EFE0] px-6 py-3 flex items-center gap-2">
        <span className="text-[#00A651] text-sm font-medium">
          Panel del Contador — Módulos en construcción (Sesión 3)
        </span>
      </div>

      {/* Grid de módulos */}
      <main className="flex-1 p-6">
        <h2 className="text-lg font-bold text-[#333333] mb-4">Módulos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {NAV_ITEMS.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="bg-white rounded-xl p-5 flex items-center gap-4 shadow-sm border border-gray-100 hover:border-[#1B3A6B]/20 hover:shadow-md transition group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#EEF2FA] flex items-center justify-center shrink-0 group-hover:bg-[#1B3A6B] transition">
                <svg className="w-5 h-5 text-[#1B3A6B] group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#333333] text-sm">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">En construcción</p>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}

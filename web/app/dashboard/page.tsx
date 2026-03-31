'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Empresa = {
  id: string;
  nombre: string;
  rfc: string;
  giro: string | null;
  activa: boolean;
  _cfdis_mes: number;
  _ultimo_cfdi: string | null;
  _semaforo: 'verde' | 'amarillo' | 'rojo';
};

function calcularSemaforo(cfdisMes: number, ultimoCfdi: string | null): 'verde' | 'amarillo' | 'rojo' {
  if (cfdisMes === 0 && !ultimoCfdi) return 'rojo';
  const diasSinActividad = ultimoCfdi
    ? Math.floor((Date.now() - new Date(ultimoCfdi).getTime()) / 86400000)
    : 999;
  if (diasSinActividad > 30) return 'rojo';
  if (diasSinActividad > 14 || cfdisMes < 2) return 'amarillo';
  return 'verde';
}

const SEMAFORO = {
  verde:    { bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A', label: 'Al corriente' },
  amarillo: { bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706', label: 'Pendiente revisión' },
  rojo:     { bg: '#FFF1F2', border: '#FECDD3', dot: '#DC2626', label: 'Sin actividad' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [despachoId, setDespachoId] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserEmail(user.email ?? '');

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('despacho_id')
        .eq('id', user.id)
        .single();

      if (!usuario?.despacho_id) { setLoading(false); return; }
      setDespachoId(usuario.despacho_id);

      const { data: emps } = await supabase
        .from('empresas_clientes')
        .select('id, nombre, rfc, giro, activa')
        .eq('despacho_id', usuario.despacho_id)
        .eq('activa', true);

      if (!emps || emps.length === 0) { setLoading(false); return; }

      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const empresasConStats = await Promise.all(emps.map(async (emp) => {
        const { data: cfdis } = await supabase
          .from('cfdis')
          .select('id, created_at')
          .eq('empresa_id', emp.id)
          .gte('created_at', inicioMes);

        const { data: ultimo } = await supabase
          .from('cfdis')
          .select('created_at')
          .eq('empresa_id', emp.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const cfdisMes = cfdis?.length ?? 0;
        const ultimoCfdi = ultimo?.[0]?.created_at ?? null;

        return {
          ...emp,
          _cfdis_mes: cfdisMes,
          _ultimo_cfdi: ultimoCfdi,
          _semaforo: calcularSemaforo(cfdisMes, ultimoCfdi),
        };
      }));

      setEmpresas(empresasConStats);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const counts = {
    verde: empresas.filter(e => e._semaforo === 'verde').length,
    amarillo: empresas.filter(e => e._semaforo === 'amarillo').length,
    rojo: empresas.filter(e => e._semaforo === 'rojo').length,
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
          <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 text-sm text-white px-3 py-1.5 rounded-lg transition">
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 flex gap-1 overflow-x-auto">
        {[
          { href: '/dashboard', label: 'Empresas', active: true },
          { href: '/dashboard/cfdis', label: 'CFDIs' },
          { href: '/dashboard/conciliacion', label: 'Conciliación' },
          { href: '/dashboard/exportar', label: 'Exportar' },
          { href: '/dashboard/configuracion', label: 'Configuración' },
        ].map(item => (
          <a key={item.href} href={item.href}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${item.active ? 'border-[#1B3A6B] text-[#1B3A6B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {item.label}
          </a>
        ))}
      </nav>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#333333]">Empresas cliente</h1>
          <a href="/dashboard/configuracion"
            className="bg-[#00A651] hover:bg-[#008F45] text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2">
            + Agregar empresa
          </a>
        </div>

        {/* Resumen semáforo */}
        {!loading && empresas.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {(['verde', 'amarillo', 'rojo'] as const).map(s => (
              <div key={s} style={{ borderColor: SEMAFORO[s].border, backgroundColor: SEMAFORO[s].bg }}
                className="rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold" style={{ color: SEMAFORO[s].dot }}>{counts[s]}</div>
                <div className="text-xs text-gray-500 mt-1">{SEMAFORO[s].label}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
          </div>
        ) : empresas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-4">🏢</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Sin empresas cliente</h2>
            <p className="text-sm text-gray-400 mb-6">Agrega tu primera empresa cliente para comenzar.</p>
            <a href="/dashboard/configuracion"
              className="bg-[#1B3A6B] text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-[#152d55] transition">
              Agregar primera empresa
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {empresas.map(emp => {
              const sem = SEMAFORO[emp._semaforo];
              return (
                <a key={emp.id} href={`/dashboard/empresas?id=${emp.id}`}
                  className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md hover:border-[#1B3A6B]/20 transition group block">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sem.dot }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#333333] truncate">{emp.nombre}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{emp.rfc} · {emp.giro ?? 'Sin giro'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-[#1B3A6B]">{emp._cfdis_mes} CFDIs</div>
                    <div className="text-xs" style={{ color: sem.dot }}>{sem.label}</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-[#1B3A6B] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

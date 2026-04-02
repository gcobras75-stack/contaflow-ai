'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type CFDI = {
  id: string;
  uuid_sat: string | null;
  tipo: string | null;
  total: number | null;
  iva: number | null;
  subtotal: number | null;
  fecha_emision: string | null;
  status: string;
  created_at: string;
};

type EstadoCuenta = {
  id: string;
  banco: string | null;
  periodo: string | null;
  status: string;
  created_at: string;
};

const fmt = (n: number | null) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const STATUS_CFDI: Record<string, { label: string; badge: string; text: string }> = {
  pendiente: { label: 'Pendiente', badge: 'bg-yellow-100', text: 'text-yellow-700' },
  aprobado:  { label: 'Aprobado',  badge: 'bg-green-100',  text: 'text-green-700'  },
  rechazado: { label: 'Rechazado', badge: 'bg-red-100',    text: 'text-red-700'    },
};

export default function MiClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<{ nombre: string; rfc: string; giro: string | null } | null>(null);
  const [cfdis, setCfdis] = useState<CFDI[]>([]);
  const [estados, setEstados] = useState<EstadoCuenta[]>([]);
  const [tab, setTab] = useState<'cfdis' | 'estados'>('cfdis');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserEmail(user.email ?? '');

      const { data: usuario } = await supabase
        .from('usuarios').select('empresa_id, rol').eq('id', user.id).single();

      // Solo accede si es empresa, si es contador redirige al dashboard
      if (usuario?.rol === 'contador') { router.replace('/dashboard'); return; }

      if (!usuario?.empresa_id) { setLoading(false); return; }

      const [empRes, cfdiRes, estadoRes] = await Promise.all([
        supabase.from('empresas_clientes').select('nombre, rfc, giro').eq('id', usuario.empresa_id).single(),
        supabase.from('cfdis').select('*').eq('empresa_id', usuario.empresa_id).order('created_at', { ascending: false }),
        supabase.from('estados_cuenta').select('*').eq('empresa_id', usuario.empresa_id).order('created_at', { ascending: false }),
      ]);

      setEmpresa(empRes.data);
      setCfdis(cfdiRes.data ?? []);
      setEstados(estadoRes.data ?? []);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const totales = cfdis.reduce((acc, c) => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
    if (c.created_at >= inicioMes) acc.esteMe++;
    acc.pendientes += c.status === 'pendiente' ? 1 : 0;
    if (c.tipo === 'ingreso') acc.ivaAPagar += Number(c.iva ?? 0);
    if (c.tipo === 'egreso') acc.ivaAFavor += Number(c.iva ?? 0);
    return acc;
  }, { esteMe: 0, pendientes: 0, ivaAPagar: 0, ivaAFavor: 0 });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="bg-[#1B3A6B] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-end gap-1">
          <span className="text-2xl font-extrabold tracking-tight">ContaFlow</span>
          <span className="text-lg font-bold text-[#00A651] mb-0.5">AI</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/70 hidden sm:block">{userEmail}</span>
          <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 text-sm text-white px-3 py-1.5 rounded-lg transition">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">

        {/* Info empresa */}
        {empresa ? (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FA] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#1B3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#333333]">{empresa.nombre}</h1>
                <p className="text-sm text-gray-400 font-mono">{empresa.rfc}</p>
                {empresa.giro && <p className="text-sm text-gray-500 mt-0.5">{empresa.giro}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5 text-sm text-yellow-800">
            Tu cuenta no tiene una empresa asignada. Contacta a tu despacho contable.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'CFDIs este mes', val: String(totales.esteMe),              color: 'text-[#1B3A6B]' },
            { label: 'Pendientes',     val: String(totales.pendientes),           color: 'text-yellow-600' },
            { label: 'IVA a pagar',    val: fmt(totales.ivaAPagar),              color: 'text-red-500'    },
            { label: 'IVA a favor',    val: fmt(totales.ivaAFavor),              color: 'text-green-600'  },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className={`text-lg font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-4 w-fit">
          {(['cfdis', 'estados'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === t ? 'bg-[#1B3A6B] text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'cfdis' ? `Mis CFDIs (${cfdis.length})` : `Estados de cuenta (${estados.length})`}
            </button>
          ))}
        </div>

        {/* CFDIs */}
        {tab === 'cfdis' && (
          cfdis.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-gray-400 text-sm">Sin CFDIs registrados. Sube tu primer CFDI desde la app móvil.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cfdis.map(c => {
                const cfg = STATUS_CFDI[c.status] ?? STATUS_CFDI.pendiente;
                return (
                  <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400 uppercase font-medium">{c.tipo}</span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono truncate">{c.uuid_sat ?? 'Sin UUID'}</p>
                      <p className="text-xs text-gray-400">{c.fecha_emision ?? c.created_at?.slice(0, 10)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-[#1B3A6B]">{fmt(c.total)}</div>
                      <div className="text-xs text-gray-400">IVA {fmt(c.iva)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Estados */}
        {tab === 'estados' && (
          estados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-gray-400 text-sm">Sin estados de cuenta. Sube uno desde la app móvil.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {estados.map(e => (
                <div key={e.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EEF2FA] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-[#1B3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#333333] text-sm">{e.banco ?? 'Sin banco'}</p>
                    <p className="text-xs text-gray-400">{e.periodo ?? '—'} · {e.created_at?.slice(0, 10)}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${e.status === 'procesado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {e.status === 'procesado' ? 'Procesado' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

      </main>
    </div>
  );
}

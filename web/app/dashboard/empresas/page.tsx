'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Empresa = {
  id: string;
  nombre: string;
  rfc: string;
  giro: string | null;
  activa: boolean;
};

type CFDI = {
  id: string;
  uuid_sat: string | null;
  tipo: string | null;
  total: number | null;
  iva: number | null;
  fecha_emision: string | null;
  status: string;
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

function EmpresaDetalleContent() {
  const params = useSearchParams();
  const empresaId = params.get('id');

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [cfdis, setCfdis] = useState<CFDI[]>([]);
  const [estados, setEstados] = useState<EstadoCuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'cfdis' | 'estados'>('cfdis');
  const [accionando, setAccionando] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    async function cargar() {
      const [empRes, cfdiRes, estadoRes] = await Promise.all([
        supabase.from('empresas_clientes').select('*').eq('id', empresaId).single(),
        supabase.from('cfdis').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
        supabase.from('estados_cuenta').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
      ]);
      setEmpresa(empRes.data);
      setCfdis(cfdiRes.data ?? []);
      setEstados(estadoRes.data ?? []);
      setLoading(false);
    }
    cargar();
  }, [empresaId]);

  const cambiarStatus = async (cfdiId: string, nuevoStatus: 'aprobado' | 'rechazado') => {
    setAccionando(cfdiId);
    const { error } = await supabase.from('cfdis').update({ status: nuevoStatus }).eq('id', cfdiId);
    if (!error) {
      setCfdis(prev => prev.map(c => c.id === cfdiId ? { ...c, status: nuevoStatus } : c));
    }
    setAccionando(null);
  };

  const totales = cfdis.reduce((acc, c) => {
    acc.total += Number(c.total ?? 0);
    acc.iva += Number(c.iva ?? 0);
    if (c.status === 'pendiente') acc.pendiente++;
    if (c.status === 'aprobado') acc.aprobado++;
    return acc;
  }, { total: 0, iva: 0, pendiente: 0, aprobado: 0 });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
      </div>
    );
  }

  if (!empresaId || !empresa) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
        <header className="bg-[#1B3A6B] text-white px-6 py-4 flex items-center gap-3">
          <a href="/dashboard" className="text-white/70 hover:text-white text-sm transition">← Dashboard</a>
          <span className="text-white/30">|</span>
          <span className="font-semibold">Empresa</span>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Empresa no encontrada.</p>
            <a href="/dashboard" className="text-[#1B3A6B] text-sm font-semibold mt-2 block">← Volver al dashboard</a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="bg-[#1B3A6B] text-white px-6 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-white/70 hover:text-white text-sm transition">← Dashboard</a>
        <span className="text-white/30">|</span>
        <span className="font-semibold truncate">{empresa.nombre}</span>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">

        {/* Info empresa */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#333333]">{empresa.nombre}</h1>
              <p className="text-sm text-gray-400 mt-0.5 font-mono">{empresa.rfc}</p>
              {empresa.giro && <p className="text-sm text-gray-500 mt-1">{empresa.giro}</p>}
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${empresa.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {empresa.activa ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total acumulado', val: fmt(totales.total), color: 'text-[#1B3A6B]' },
            { label: 'IVA total',       val: fmt(totales.iva),   color: 'text-gray-700'   },
            { label: 'Pendientes',      val: String(totales.pendiente), color: 'text-yellow-600' },
            { label: 'Aprobados',       val: String(totales.aprobado),  color: 'text-green-600'  },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
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
              {t === 'cfdis' ? `CFDIs (${cfdis.length})` : `Estados de cuenta (${estados.length})`}
            </button>
          ))}
        </div>

        {/* Tab CFDIs */}
        {tab === 'cfdis' && (
          cfdis.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
              Esta empresa no tiene CFDIs registrados
            </div>
          ) : (
            <div className="space-y-2">
              {cfdis.map(c => {
                const cfg = STATUS_CFDI[c.status] ?? STATUS_CFDI.pendiente;
                return (
                  <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400 uppercase font-medium">{c.tipo}</span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono truncate">{c.uuid_sat ?? 'Sin UUID'}</p>
                      <p className="text-xs text-gray-400">{c.fecha_emision ?? '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-[#1B3A6B]">{fmt(c.total)}</div>
                      <div className="text-xs text-gray-400">IVA: {fmt(c.iva)}</div>
                    </div>
                    {c.status === 'pendiente' && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => cambiarStatus(c.id, 'aprobado')}
                          disabled={accionando === c.id}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                          {accionando === c.id ? '...' : 'Aprobar'}
                        </button>
                        <button
                          onClick={() => cambiarStatus(c.id, 'rechazado')}
                          disabled={accionando === c.id}
                          className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                          {accionando === c.id ? '...' : 'Rechazar'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Tab estados de cuenta */}
        {tab === 'estados' && (
          estados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
              Esta empresa no tiene estados de cuenta registrados
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
                  <div className="flex-1 min-w-0">
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

export default function EmpresaDetallePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
      </div>
    }>
      <EmpresaDetalleContent />
    </Suspense>
  );
}

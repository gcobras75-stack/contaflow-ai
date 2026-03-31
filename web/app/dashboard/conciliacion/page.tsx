'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type CFDI = {
  id: string;
  uuid_sat: string | null;
  tipo: string | null;
  subtotal: number | null;
  iva: number | null;
  total: number | null;
  fecha_emision: string | null;
  status: string;
  empresa_id: string | null;
};

type Empresa = { id: string; nombre: string; rfc: string };

const fmt = (n: number | null) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const STATUS = {
  pendiente: { label: 'Pendiente',  bg: 'bg-yellow-50',  text: 'text-yellow-700', badge: 'bg-yellow-100' },
  aprobado:  { label: 'Aprobado',   bg: 'bg-green-50',   text: 'text-green-700',  badge: 'bg-green-100' },
  rechazado: { label: 'Rechazado',  bg: 'bg-red-50',     text: 'text-red-700',    badge: 'bg-red-100' },
};

export default function ConciliacionPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSel, setEmpresaSel] = useState<string>('');
  const [cfdis, setCfdis] = useState<CFDI[]>([]);
  const [loading, setLoading] = useState(false);
  const [accionando, setAccionando] = useState<string | null>(null);

  useEffect(() => {
    async function loadEmpresas() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: usuario } = await supabase
        .from('usuarios').select('despacho_id').eq('id', user.id).single();
      if (!usuario?.despacho_id) return;
      const { data } = await supabase
        .from('empresas_clientes')
        .select('id, nombre, rfc')
        .eq('despacho_id', usuario.despacho_id)
        .eq('activa', true);
      setEmpresas(data ?? []);
    }
    loadEmpresas();
  }, []);

  useEffect(() => {
    if (!empresaSel) return;
    setLoading(true);
    supabase
      .from('cfdis')
      .select('*')
      .eq('empresa_id', empresaSel)
      .order('fecha_emision', { ascending: false })
      .then(({ data }) => { setCfdis(data ?? []); setLoading(false); });
  }, [empresaSel]);

  const cambiarStatus = async (cfdiId: string, nuevoStatus: 'aprobado' | 'rechazado') => {
    setAccionando(cfdiId);
    const { error } = await supabase
      .from('cfdis')
      .update({ status: nuevoStatus })
      .eq('id', cfdiId);
    if (!error) {
      setCfdis(prev => prev.map(c => c.id === cfdiId ? { ...c, status: nuevoStatus } : c));
    }
    setAccionando(null);
  };

  const exportarContpaq = () => {
    const aprobados = cfdis.filter(c => c.status === 'aprobado');
    if (aprobados.length === 0) { alert('No hay CFDIs aprobados para exportar.'); return; }

    const lineas = aprobados.map(c => {
      const fecha = c.fecha_emision?.replace(/-/g, '') ?? '00000000';
      const concepto = `CFDI ${c.tipo?.toUpperCase() ?? 'ING'} ${c.uuid_sat?.slice(0, 8) ?? ''}`;
      const cargo  = c.tipo === 'egreso'   ? (c.total ?? 0).toFixed(2) : '0.00';
      const abono  = c.tipo === 'ingreso'  ? (c.total ?? 0).toFixed(2) : '0.00';
      return `${fecha}|${concepto}|${cargo}|${abono}|${(c.iva ?? 0).toFixed(2)}`;
    });

    const contenido = [
      'POLIZA|ContaFlow AI|Exportado ' + new Date().toLocaleDateString('es-MX'),
      'FECHA|CONCEPTO|CARGO|ABONO|IVA',
      ...lineas,
    ].join('\n');

    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contpaq_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totales = cfdis.reduce((acc, c) => {
    acc.total += Number(c.total ?? 0);
    acc.iva   += Number(c.iva ?? 0);
    if (c.status === 'pendiente') acc.pendiente++;
    if (c.status === 'aprobado')  acc.aprobado++;
    if (c.status === 'rechazado') acc.rechazado++;
    return acc;
  }, { total: 0, iva: 0, pendiente: 0, aprobado: 0, rechazado: 0 });

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="bg-[#1B3A6B] text-white px-6 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-white/70 hover:text-white text-sm transition">← Dashboard</a>
        <span className="text-white/30">|</span>
        <span className="font-semibold">Conciliación</span>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-xl font-bold text-[#333333]">Conciliación de CFDIs</h1>
          <button onClick={exportarContpaq}
            className="bg-[#1B3A6B] hover:bg-[#152d55] text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar CONTPAQi
          </button>
        </div>

        {/* Selector empresa */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
          <label className="block text-sm font-semibold text-gray-600 mb-2">Empresa cliente</label>
          <select
            value={empresaSel}
            onChange={e => setEmpresaSel(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
          >
            <option value="">— Selecciona una empresa —</option>
            {empresas.map(e => (
              <option key={e.id} value={e.id}>{e.nombre} · {e.rfc}</option>
            ))}
          </select>
        </div>

        {/* Resumen */}
        {empresaSel && !loading && cfdis.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total acumulado', val: fmt(totales.total), color: 'text-[#1B3A6B]' },
              { label: 'IVA total',       val: fmt(totales.iva),   color: 'text-gray-700' },
              { label: 'Pendientes',      val: String(totales.pendiente), color: 'text-yellow-600' },
              { label: 'Aprobados',       val: String(totales.aprobado),  color: 'text-green-600' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <div className={`text-xl font-bold ${stat.color}`}>{stat.val}</div>
                <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Lista CFDIs */}
        {!empresaSel ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
            <p className="text-sm">Selecciona una empresa para ver sus CFDIs</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
          </div>
        ) : cfdis.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
            <p className="text-sm">Esta empresa no tiene CFDIs registrados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cfdis.map(c => {
              const cfg = STATUS[c.status as keyof typeof STATUS] ?? STATUS.pendiente;
              const isActuando = accionando === c.id;
              return (
                <div key={c.id} className={`bg-white rounded-xl border border-gray-100 p-4 ${cfg.bg}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
                          disabled={!!isActuando}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                          {isActuando ? '...' : 'Aprobar'}
                        </button>
                        <button
                          onClick={() => cambiarStatus(c.id, 'rechazado')}
                          disabled={!!isActuando}
                          className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                          {isActuando ? '...' : 'Rechazar'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

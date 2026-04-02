'use client';

import { useEffect, useState } from 'react';
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
  empresa_id: string | null;
  empresa_nombre?: string;
};

type Empresa = { id: string; nombre: string; rfc: string };

const fmt = (n: number | null) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const STATUS_CFG: Record<string, { label: string; badge: string; text: string; dot: string }> = {
  pendiente: { label: 'Pendiente', badge: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  aprobado:  { label: 'Aprobado',  badge: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
  rechazado: { label: 'Rechazado', badge: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-400'    },
};

const TIPOS = ['Todos', 'ingreso', 'egreso', 'nomina', 'traslado'];

export default function CFDIsPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cfdis, setCfdis] = useState<CFDI[]>([]);
  const [loading, setLoading] = useState(true);
  const [accionando, setAccionando] = useState<string | null>(null);

  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroTipo, setFiltroTipo] = useState('Todos');

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios').select('despacho_id').eq('id', user.id).single();
      if (!usuario?.despacho_id) { setLoading(false); return; }

      const { data: emps } = await supabase
        .from('empresas_clientes')
        .select('id, nombre, rfc')
        .eq('despacho_id', usuario.despacho_id)
        .eq('activa', true);

      setEmpresas(emps ?? []);

      if (!emps || emps.length === 0) { setLoading(false); return; }

      const empresaIds = emps.map(e => e.id);
      const { data: cfdiData } = await supabase
        .from('cfdis')
        .select('*')
        .in('empresa_id', empresaIds)
        .order('created_at', { ascending: false });

      const empMap = Object.fromEntries((emps ?? []).map(e => [e.id, e.nombre]));
      setCfdis((cfdiData ?? []).map(c => ({ ...c, empresa_nombre: empMap[c.empresa_id ?? ''] ?? '—' })));
      setLoading(false);
    }
    cargar();
  }, []);

  const cambiarStatus = async (cfdiId: string, nuevoStatus: 'aprobado' | 'rechazado') => {
    setAccionando(cfdiId);
    const { error } = await supabase.from('cfdis').update({ status: nuevoStatus }).eq('id', cfdiId);
    if (!error) {
      setCfdis(prev => prev.map(c => c.id === cfdiId ? { ...c, status: nuevoStatus } : c));
    }
    setAccionando(null);
  };

  const cfdisFiltrados = cfdis.filter(c => {
    if (filtroEmpresa && c.empresa_id !== filtroEmpresa) return false;
    if (filtroStatus !== 'Todos' && c.status !== filtroStatus) return false;
    if (filtroTipo !== 'Todos' && c.tipo !== filtroTipo) return false;
    return true;
  });

  const totalesFiltrados = cfdisFiltrados.reduce((acc, c) => {
    acc.total += Number(c.total ?? 0);
    acc.iva += Number(c.iva ?? 0);
    acc.pendiente += c.status === 'pendiente' ? 1 : 0;
    return acc;
  }, { total: 0, iva: 0, pendiente: 0 });

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="bg-[#1B3A6B] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-end gap-1">
          <span className="text-2xl font-extrabold tracking-tight">ContaFlow</span>
          <span className="text-lg font-bold text-[#00A651] mb-0.5">AI</span>
        </div>
        <nav className="hidden sm:flex items-center gap-1">
          {[
            { href: '/dashboard', label: 'Empresas' },
            { href: '/dashboard/cfdis', label: 'CFDIs', active: true },
            { href: '/dashboard/conciliacion', label: 'Conciliación' },
            { href: '/dashboard/exportar', label: 'Exportar' },
            { href: '/dashboard/configuracion', label: 'Configuración' },
          ].map(item => (
            <a key={item.href} href={item.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${item.active ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      {/* Nav móvil */}
      <nav className="bg-white border-b border-gray-100 px-6 flex gap-1 overflow-x-auto sm:hidden">
        {[
          { href: '/dashboard', label: 'Empresas' },
          { href: '/dashboard/cfdis', label: 'CFDIs', active: true },
          { href: '/dashboard/conciliacion', label: 'Conciliación' },
          { href: '/dashboard/exportar', label: 'Exportar' },
          { href: '/dashboard/configuracion', label: 'Config' },
        ].map(item => (
          <a key={item.href} href={item.href}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${item.active ? 'border-[#1B3A6B] text-[#1B3A6B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {item.label}
          </a>
        ))}
      </nav>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <h1 className="text-xl font-bold text-[#333333] mb-5">CFDIs del despacho</h1>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-col sm:flex-row gap-3">
          <select
            value={filtroEmpresa}
            onChange={e => setFiltroEmpresa(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] flex-1"
          >
            <option value="">Todas las empresas</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
          >
            {['Todos', 'pendiente', 'aprobado', 'rechazado'].map(s => (
              <option key={s} value={s}>{s === 'Todos' ? 'Todos los estados' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
          >
            {TIPOS.map(t => (
              <option key={t} value={t}>{t === 'Todos' ? 'Todos los tipos' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Resumen filtrado */}
        {!loading && cfdisFiltrados.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total acumulado', val: fmt(totalesFiltrados.total), color: 'text-[#1B3A6B]' },
              { label: 'IVA total',       val: fmt(totalesFiltrados.iva),   color: 'text-gray-700'  },
              { label: 'Pendientes',      val: String(totalesFiltrados.pendiente), color: 'text-yellow-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
          </div>
        ) : cfdisFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400 text-sm">
              {cfdis.length === 0 ? 'No hay CFDIs registrados en el despacho' : 'Sin resultados para los filtros seleccionados'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {cfdisFiltrados.map(c => {
              const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.pendiente;
              return (
                <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs font-medium text-gray-500 uppercase">{c.tipo}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-[#1B3A6B] font-medium truncate">{c.empresa_nombre}</span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono truncate">{c.uuid_sat ?? 'Sin UUID'}</p>
                    <p className="text-xs text-gray-400">{c.fecha_emision ?? '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-[#1B3A6B]">{fmt(c.total)}</div>
                    <div className="text-xs text-gray-400">IVA {fmt(c.iva)}</div>
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
        )}
      </main>
    </div>
  );
}

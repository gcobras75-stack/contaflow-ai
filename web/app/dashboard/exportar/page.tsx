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
};

type Empresa = { id: string; nombre: string; rfc: string };

const fmt = (n: number | null) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export default function ExportarPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSel, setEmpresaSel] = useState('');
  const [cfdis, setCfdis] = useState<CFDI[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('aprobado');
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: usuario } = await supabase.from('usuarios').select('despacho_id').eq('id', user.id).single();
      if (!usuario?.despacho_id) { setLoadingEmpresas(false); return; }
      const { data } = await supabase
        .from('empresas_clientes').select('id, nombre, rfc')
        .eq('despacho_id', usuario.despacho_id).eq('activa', true);
      setEmpresas(data ?? []);
      setLoadingEmpresas(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!empresaSel) { setCfdis([]); return; }
    setLoading(true);
    let q = supabase.from('cfdis').select('*').eq('empresa_id', empresaSel).order('fecha_emision', { ascending: false });
    if (filtroStatus !== 'todos') q = q.eq('status', filtroStatus);
    q.then(({ data }) => { setCfdis(data ?? []); setLoading(false); });
  }, [empresaSel, filtroStatus]);

  const mostrarToast = (msg: string, tipo: 'ok' | 'err') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  const exportarCSV = () => {
    if (cfdis.length === 0) { mostrarToast('No hay CFDIs para exportar', 'err'); return; }
    const empresa = empresas.find(e => e.id === empresaSel);
    const cabecera = 'UUID,Tipo,Fecha,Subtotal,IVA,Total,Status';
    const lineas = cfdis.map(c =>
      [c.uuid_sat ?? '', c.tipo ?? '', c.fecha_emision ?? '', c.subtotal ?? 0, c.iva ?? 0, c.total ?? 0, c.status].join(',')
    );
    const contenido = [cabecera, ...lineas].join('\n');
    descargar(contenido, `contaflow_${empresa?.rfc ?? 'cfdi'}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
    mostrarToast(`${cfdis.length} CFDIs exportados como CSV`, 'ok');
  };

  const exportarContpaq = () => {
    if (cfdis.length === 0) { mostrarToast('No hay CFDIs para exportar', 'err'); return; }
    const empresa = empresas.find(e => e.id === empresaSel);
    const lineas = cfdis.map(c => {
      const fecha = c.fecha_emision?.replace(/-/g, '') ?? '00000000';
      const concepto = `CFDI ${c.tipo?.toUpperCase() ?? 'ING'} ${c.uuid_sat?.slice(0, 8) ?? ''}`;
      const cargo  = c.tipo === 'egreso'  ? (c.total ?? 0).toFixed(2) : '0.00';
      const abono  = c.tipo === 'ingreso' ? (c.total ?? 0).toFixed(2) : '0.00';
      return `${fecha}|${concepto}|${cargo}|${abono}|${(c.iva ?? 0).toFixed(2)}`;
    });
    const contenido = [
      `POLIZA|ContaFlow AI|${empresa?.nombre ?? ''}|Exportado ${new Date().toLocaleDateString('es-MX')}`,
      'FECHA|CONCEPTO|CARGO|ABONO|IVA',
      ...lineas,
    ].join('\n');
    descargar(contenido, `contpaq_${empresa?.rfc ?? 'cfdi'}_${new Date().toISOString().slice(0, 10)}.txt`, 'text/plain;charset=utf-8');
    mostrarToast(`${cfdis.length} CFDIs exportados para CONTPAQi`, 'ok');
  };

  const exportarXLSX = () => {
    if (cfdis.length === 0) { mostrarToast('No hay CFDIs para exportar', 'err'); return; }
    const empresa = empresas.find(e => e.id === empresaSel);
    // Formato TSV que Excel abre directamente
    const cabecera = 'UUID\tTipo\tFecha\tSubtotal\tIVA\tTotal\tStatus';
    const lineas = cfdis.map(c =>
      [c.uuid_sat ?? '', c.tipo ?? '', c.fecha_emision ?? '', c.subtotal ?? 0, c.iva ?? 0, c.total ?? 0, c.status].join('\t')
    );
    const contenido = [cabecera, ...lineas].join('\n');
    descargar(contenido, `contaflow_${empresa?.rfc ?? 'cfdi'}_${new Date().toISOString().slice(0, 10)}.xls`, 'application/vnd.ms-excel');
    mostrarToast(`${cfdis.length} CFDIs exportados para Excel`, 'ok');
  };

  function descargar(contenido: string, nombre: string, tipo: string) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre; a.click();
    URL.revokeObjectURL(url);
  }

  const totales = cfdis.reduce((acc, c) => {
    acc.total += Number(c.total ?? 0);
    acc.iva += Number(c.iva ?? 0);
    return acc;
  }, { total: 0, iva: 0 });

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="bg-[#1B3A6B] text-white px-6 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-white/70 hover:text-white text-sm transition">← Dashboard</a>
        <span className="text-white/30">|</span>
        <span className="font-semibold">Exportar</span>
      </header>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.tipo === 'ok' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-xl font-bold text-[#333333] mb-6">Exportar CFDIs</h1>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Empresa cliente</label>
            <select
              value={empresaSel}
              onChange={e => setEmpresaSel(e.target.value)}
              disabled={loadingEmpresas}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
            >
              <option value="">— Selecciona una empresa —</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre} · {e.rfc}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Estado de CFDIs</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { val: 'aprobado', label: 'Solo aprobados' },
                { val: 'pendiente', label: 'Solo pendientes' },
                { val: 'todos', label: 'Todos' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setFiltroStatus(opt.val)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${filtroStatus === opt.val ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B3A6B]'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resumen */}
        {empresaSel && !loading && cfdis.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'CFDIs a exportar', val: String(cfdis.length), color: 'text-[#1B3A6B]' },
              { label: 'Total acumulado',  val: fmt(totales.total),   color: 'text-[#1B3A6B]' },
              { label: 'IVA total',        val: fmt(totales.iva),     color: 'text-gray-700'   },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Botones de exportación */}
        {empresaSel && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
            <h2 className="text-sm font-bold text-gray-600 mb-4">Formato de exportación</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ExportBtn
                icon="📊"
                titulo="Excel / CSV"
                desc="Abrir en Excel, Google Sheets o cualquier hoja de cálculo"
                onClick={exportarCSV}
                disabled={cfdis.length === 0}
              />
              <ExportBtn
                icon="📋"
                titulo="CONTPAQi"
                desc="Importar pólizas directamente a CONTPAQi o Aspel"
                onClick={exportarContpaq}
                disabled={cfdis.length === 0}
              />
              <ExportBtn
                icon="📁"
                titulo="Excel (.xls)"
                desc="Formato nativo de Microsoft Excel"
                onClick={exportarXLSX}
                disabled={cfdis.length === 0}
              />
            </div>
          </div>
        )}

        {/* Lista preview */}
        {!empresaSel ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
            Selecciona una empresa para previsualizar los CFDIs
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
          </div>
        ) : cfdis.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
            No hay CFDIs con el estado seleccionado
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Vista previa — {cfdis.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3 text-left font-semibold">UUID</th>
                    <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 text-right font-semibold">IVA</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cfdis.slice(0, 20).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-[140px] truncate">{c.uuid_sat ?? '—'}</td>
                      <td className="px-4 py-3 uppercase text-xs font-medium text-gray-600">{c.tipo}</td>
                      <td className="px-4 py-3 text-gray-500">{c.fecha_emision ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1B3A6B]">{fmt(c.total)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{fmt(c.iva)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.status === 'aprobado' ? 'bg-green-100 text-green-700' : c.status === 'rechazado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {cfdis.length > 20 && (
                <p className="text-xs text-gray-400 text-center py-3 border-t border-gray-50">
                  Mostrando 20 de {cfdis.length} registros — la exportación incluye todos
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ExportBtn({ icon, titulo, desc, onClick, disabled }: {
  icon: string; titulo: string; desc: string; onClick: () => void; disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 p-4 border-2 border-gray-100 hover:border-[#1B3A6B] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition text-center group"
    >
      <span className="text-3xl">{icon}</span>
      <span className="font-bold text-sm text-[#333333] group-hover:text-[#1B3A6B] transition">{titulo}</span>
      <span className="text-xs text-gray-400 leading-relaxed">{desc}</span>
    </button>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type SusRow = {
  id:            string;
  empresa_id:    string;
  status:        string;
  monto:         number | null;
  periodo_inicio: string | null;
  periodo_fin:   string | null;
  created_at:    string;
  empresa_nombre?: string;
  despacho_nombre?: string;
};

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function IngresosPage() {
  const [rows,    setRows]    = useState<SusRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sus } = await adminClient
        .from('suscripciones')
        .select('id, empresa_id, status, monto, periodo_inicio, periodo_fin, created_at')
        .order('created_at', { ascending: false });

      if (!sus || sus.length === 0) { setLoading(false); return; }

      // Fetch nombres de empresas y despachos
      const empIds = [...new Set(sus.map(s => s.empresa_id))];
      const { data: emps } = await adminClient
        .from('empresas_clientes')
        .select('id, nombre, despacho_id')
        .in('id', empIds);

      const despIds = [...new Set((emps ?? []).map(e => e.despacho_id).filter(Boolean))];
      const { data: desps } = await adminClient
        .from('despachos')
        .select('id, nombre')
        .in('id', despIds);

      const enriched = sus.map(s => {
        const emp  = emps?.find(e => e.id === s.empresa_id);
        const desp = desps?.find(d => d.id === emp?.despacho_id);
        return { ...s, empresa_nombre: emp?.nombre, despacho_nombre: desp?.nombre };
      });

      setRows(enriched);
      setLoading(false);
    })();
  }, []);

  // Agrupar ingresos por mes (solo status=activa)
  const porMes: Record<string, number> = {};
  rows.filter(r => r.status === 'activa' && r.periodo_inicio).forEach(r => {
    const d = new Date(r.periodo_inicio!);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    porMes[key] = (porMes[key] ?? 0) + Number(r.monto ?? 99);
  });

  const mesesOrdenados = Object.keys(porMes).sort();
  const maxVal = Math.max(...Object.values(porMes), 1);

  const totalMRR = rows
    .filter(r => r.status === 'activa')
    .reduce((acc, r) => acc + Number(r.monto ?? 99), 0);

  const exportCSV = () => {
    const headers = 'ID,Empresa,Despacho,Status,Monto,Periodo Inicio,Periodo Fin,Creada\n';
    const body = rows.map(r =>
      [r.id, r.empresa_nombre ?? r.empresa_id, r.despacho_nombre ?? '',
       r.status, r.monto ?? 99,
       r.periodo_inicio ?? '', r.periodo_fin ?? '', r.created_at]
      .join(',')
    ).join('\n');
    const blob = new Blob([headers + body], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ingresos-contaflow-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={{ color: '#64748B', textAlign: 'center', paddingTop: 80 }}>Cargando…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F1F5F9', margin: 0 }}>Ingresos</h1>
          <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: 4 }}>
            Historial de suscripciones y pagos.
          </p>
        </div>
        <button
          onClick={exportCSV}
          style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #334155',
            background: '#1E293B', color: '#94A3B8', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 600,
          }}
        >
          Exportar CSV
        </button>
      </div>

      {/* MRR actual */}
      <div style={{ background: '#1E293B', borderRadius: 12, padding: 24, border: '1px solid #334155' }}>
        <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          MRR actual (suscripciones activas)
        </div>
        <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#FCD34D', marginTop: 8 }}>
          {fmt(totalMRR)}
        </div>
        <div style={{ color: '#64748B', fontSize: '0.8125rem', marginTop: 4 }}>
          {rows.filter(r => r.status === 'activa').length} suscripciones activas · $99 MXN/empresa/mes
        </div>
      </div>

      {/* Gráfica de barras por mes */}
      {mesesOrdenados.length > 0 && (
        <div style={{ background: '#1E293B', borderRadius: 12, padding: 24, border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F1F5F9', margin: '0 0 20px' }}>
            Revenue por mes
          </h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
            {mesesOrdenados.slice(-12).map(key => {
              const [año, mes] = key.split('-');
              const val     = porMes[key];
              const altura  = Math.max(4, (val / maxVal) * 120);
              return (
                <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: '0.625rem', color: '#64748B' }}>{fmt(val)}</div>
                  <div style={{
                    width: '100%', height: altura,
                    background: 'linear-gradient(180deg, #FBBF24, #F59E0B)',
                    borderRadius: '4px 4px 0 0',
                  }} />
                  <div style={{ fontSize: '0.6875rem', color: '#64748B' }}>
                    {MESES[parseInt(mes) - 1]} {año.slice(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabla detalle */}
      <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #334155' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F1F5F9', margin: 0 }}>
            Detalle suscripciones
          </h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0F172A' }}>
                {['Empresa', 'Despacho', 'Status', 'Monto', 'Periodo', 'Creada'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontSize: '0.75rem', color: '#64748B', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((r, i) => {
                const sc = (() => {
                  switch (r.status) {
                    case 'activa':         return { bg: '#14532d20', text: '#4ADE80' };
                    case 'trial':          return { bg: '#1e3a8a20', text: '#60A5FA' };
                    case 'pago_pendiente': return { bg: '#78350f20', text: '#FCD34D' };
                    case 'suspendida':     return { bg: '#7f1d1d20', text: '#F87171' };
                    default:               return { bg: '#1e293b',   text: '#94A3B8' };
                  }
                })();
                return (
                  <tr key={r.id} style={{ borderTop: i > 0 ? '1px solid #0F172A' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: '#CBD5E1', fontSize: '0.875rem' }}>
                      {r.empresa_nombre ?? r.empresa_id.slice(0, 8) + '…'}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#64748B', fontSize: '0.8125rem' }}>
                      {r.despacho_nombre ?? '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                        fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                        background: sc.bg, color: sc.text,
                      }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#FCD34D', fontWeight: 600, fontSize: '0.875rem' }}>
                      {fmt(Number(r.monto ?? 99))}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#64748B', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {r.periodo_inicio
                        ? `${new Date(r.periodo_inicio).toLocaleDateString('es-MX')} – ${r.periodo_fin ? new Date(r.periodo_fin).toLocaleDateString('es-MX') : '…'}`
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#64748B', fontSize: '0.75rem' }}>
                      {new Date(r.created_at).toLocaleDateString('es-MX')}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#475569' }}>
                    Sin suscripciones aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

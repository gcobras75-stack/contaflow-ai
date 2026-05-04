'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type DespachoRow = {
  id:         string;
  nombre:     string;
  rfc:        string;
  tipo_persona: string | null;
  created_at: string;
  empresas:   number;
  activas:    number;
  revenue:    number;
};

type Stats = {
  totalDespachos: number;
  totalEmpresas:  number;
  totalActivas:   number;
  revenueTotal:   number;
};

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

export default function AdminPage() {
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [despachos, setDespachos] = useState<DespachoRow[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      const [despRes, empRes, susRes] = await Promise.all([
        adminClient.from('despachos').select('id, nombre, rfc, tipo_persona, created_at'),
        adminClient.from('empresas_clientes').select('id, despacho_id, activa'),
        adminClient.from('suscripciones').select('empresa_id, status, monto'),
      ]);

      const despachosList = despRes.data ?? [];
      const empresasList  = empRes.data  ?? [];
      const susList       = susRes.data  ?? [];

      const rows: DespachoRow[] = despachosList.map(d => {
        const emps   = empresasList.filter(e => e.despacho_id === d.id);
        const activas = emps.filter(e => e.activa).length;
        const revenue = susList
          .filter(s => emps.some(e => e.id === s.empresa_id) && s.status === 'activa')
          .reduce((acc, s) => acc + Number(s.monto ?? 99), 0);
        return {
          id: d.id, nombre: d.nombre, rfc: d.rfc,
          tipo_persona: d.tipo_persona, created_at: d.created_at,
          empresas: emps.length, activas, revenue,
        };
      });

      rows.sort((a, b) => b.activas - a.activas);

      const totalActivas = empresasList.filter(e => e.activa).length;
      const revenueTotal = susList
        .filter(s => s.status === 'activa')
        .reduce((acc, s) => acc + Number(s.monto ?? 99), 0);

      setStats({
        totalDespachos: despachosList.length,
        totalEmpresas:  empresasList.length,
        totalActivas,
        revenueTotal,
      });
      setDespachos(rows);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div style={{ color: '#64748B', textAlign: 'center', paddingTop: 80 }}>Cargando…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F1F5F9', margin: 0 }}>
          Panel Administrador
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: 4 }}>
          Visión general de contadores, empresas e ingresos.
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {[
          { label: 'Contadores',       value: stats!.totalDespachos, color: '#3B82F6' },
          { label: 'Empresas totales', value: stats!.totalEmpresas,  color: '#8B5CF6' },
          { label: 'Empresas activas', value: stats!.totalActivas,   color: '#22C55E' },
          { label: 'MRR',              value: fmt(stats!.revenueTotal), color: '#F59E0B', money: true },
        ].map(k => (
          <div key={k.label} style={{
            background: '#1E293B', borderRadius: 12, padding: '20px 24px',
            border: '1px solid #334155',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              {k.label}
            </div>
            <div style={{ fontSize: k.money ? '1.375rem' : '2rem', fontWeight: 700, color: k.color, marginTop: 8 }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Despachos table */}
      <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #334155' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F1F5F9', margin: 0 }}>
            Contadores registrados
          </h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0F172A' }}>
                {['Nombre / RFC', 'Tipo', 'Empresas', 'Activas', 'Revenue', 'Registro', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontSize: '0.75rem', color: '#64748B', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {despachos.map((d, i) => (
                <tr key={d.id} style={{ borderTop: i > 0 ? '1px solid #1E293B' : 'none', background: '#1E293B' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9' }}>{d.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>{d.rfc}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                      fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase',
                      background: d.tipo_persona === 'moral' ? '#1D4ED820' : '#15803D20',
                      color: d.tipo_persona === 'moral' ? '#60A5FA' : '#4ADE80',
                    }}>
                      {d.tipo_persona === 'moral' ? 'Moral' : 'Física'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#CBD5E1', fontSize: '0.875rem', textAlign: 'center' }}>
                    {d.empresas}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#4ADE80', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>
                    {d.activas}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#FCD34D', fontWeight: 600, fontSize: '0.875rem' }}>
                    {fmt(d.revenue)}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '0.75rem' }}>
                    {new Date(d.created_at).toLocaleDateString('es-MX')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <a
                      href={`/admin/despacho/${d.id}`}
                      style={{
                        fontSize: '0.75rem', color: '#60A5FA', textDecoration: 'none',
                        padding: '4px 10px', border: '1px solid #1D4ED8',
                        borderRadius: 6, whiteSpace: 'nowrap',
                      }}
                    >
                      Ver detalle
                    </a>
                  </td>
                </tr>
              ))}
              {despachos.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#475569' }}>
                    Sin contadores registrados aún.
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

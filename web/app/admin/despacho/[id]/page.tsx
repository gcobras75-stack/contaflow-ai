'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Empresa = {
  id:         string;
  nombre:     string;
  rfc:        string;
  activa:     boolean;
  created_at: string;
  suscripcion?: { status: string; periodo_fin: string | null; monto: number | null; pago_pendiente_desde: string | null };
};

type Despacho = {
  id:                string;
  nombre:            string;
  rfc:               string;
  tipo_persona:      string | null;
  razon_social:      string | null;
  representante_legal: string | null;
  email:             string | null;
  telefono:          string | null;
  created_at:        string;
};

const statusColor = (s: string) => {
  switch (s) {
    case 'activa':          return { bg: '#14532d20', text: '#4ADE80' };
    case 'trial':           return { bg: '#1e3a8a20', text: '#60A5FA' };
    case 'pago_pendiente':  return { bg: '#78350f20', text: '#FCD34D' };
    case 'suspendida':      return { bg: '#7f1d1d20', text: '#F87171' };
    default:                return { bg: '#1e293b',   text: '#94A3B8' };
  }
};

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

export default function DespachoDetalle() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const [despacho, setDespacho] = useState<Despacho | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [accion,   setAccion]   = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    const [despRes, empRes, susRes] = await Promise.all([
      adminClient.from('despachos').select('*').eq('id', id).single(),
      adminClient.from('empresas_clientes').select('id, nombre, rfc, activa, created_at').eq('despacho_id', id).order('created_at'),
      adminClient.from('suscripciones').select('empresa_id, status, periodo_fin, monto, pago_pendiente_desde').in(
        'empresa_id',
        // placeholder — se rellena después
        ['00000000-0000-0000-0000-000000000000'],
      ),
    ]);

    const emps = empRes.data ?? [];

    // Re-fetch suscripciones con los IDs reales
    let sus: typeof susRes.data = [];
    if (emps.length > 0) {
      const { data } = await adminClient
        .from('suscripciones')
        .select('empresa_id, status, periodo_fin, monto, pago_pendiente_desde')
        .in('empresa_id', emps.map(e => e.id));
      sus = data ?? [];
    }

    const empresasConSus: Empresa[] = emps.map(e => ({
      ...e,
      suscripcion: sus?.find(s => s.empresa_id === e.id),
    }));

    setDespacho(despRes.data ?? null);
    setEmpresas(empresasConSus);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [id]);

  const cambiarStatusEmpresa = async (empresaId: string, activar: boolean) => {
    setAccion(empresaId);
    await adminClient
      .from('empresas_clientes')
      .update({ activa: activar })
      .eq('id', empresaId);

    // Actualizar suscripcion también
    const nuevoStatus = activar ? 'activa' : 'suspendida';
    await adminClient
      .from('suscripciones')
      .update({ status: nuevoStatus, updated_at: new Date().toISOString() })
      .eq('empresa_id', empresaId);

    setAccion(null);
    cargar();
  };

  if (loading) {
    return <div style={{ color: '#64748B', textAlign: 'center', paddingTop: 80 }}>Cargando…</div>;
  }

  if (!despacho) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <p style={{ color: '#F87171' }}>Despacho no encontrado.</p>
        <button onClick={() => router.back()} style={{ color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer' }}>
          Volver
        </button>
      </div>
    );
  }

  const revenueDespacho = empresas.reduce((acc, e) =>
    e.suscripcion?.status === 'activa' ? acc + Number(e.suscripcion.monto ?? 99) : acc, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <a href="/admin" style={{ color: '#60A5FA', textDecoration: 'none', fontSize: '0.875rem' }}>Admin</a>
        <span style={{ color: '#475569' }}>/</span>
        <span style={{ color: '#94A3B8', fontSize: '0.875rem' }}>{despacho.nombre}</span>
      </div>

      {/* Header despacho */}
      <div style={{ background: '#1E293B', borderRadius: 12, padding: 24, border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F1F5F9', margin: 0 }}>
              {despacho.nombre}
            </h1>
            <div style={{ color: '#64748B', fontSize: '0.875rem', marginTop: 4 }}>
              RFC: {despacho.rfc}
              {despacho.tipo_persona && (
                <span style={{ marginLeft: 12, color: '#94A3B8' }}>
                  · Persona {despacho.tipo_persona === 'moral' ? 'Moral' : 'Física'}
                </span>
              )}
            </div>
            {despacho.razon_social && (
              <div style={{ color: '#94A3B8', fontSize: '0.8125rem', marginTop: 2 }}>{despacho.razon_social}</div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Revenue mensual
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FCD34D', marginTop: 4 }}>
              {fmt(revenueDespacho)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total empresas',  value: empresas.length },
            { label: 'Activas',         value: empresas.filter(e => e.activa).length },
            { label: 'Pago pendiente',  value: empresas.filter(e => e.suscripcion?.status === 'pago_pendiente').length },
            { label: 'Suspendidas',     value: empresas.filter(e => e.suscripcion?.status === 'suspendida').length },
            { label: 'Registro',        value: new Date(despacho.created_at).toLocaleDateString('es-MX') },
          ].map(k => (
            <div key={k.label}>
              <div style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {k.label}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#CBD5E1', marginTop: 2 }}>
                {k.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empresas */}
      <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #334155' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F1F5F9', margin: 0 }}>
            Empresas cliente
          </h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0F172A' }}>
              {['Empresa / RFC', 'Suscripción', 'Vence', 'Pago pendiente desde', 'Acciones'].map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left',
                  fontSize: '0.75rem', color: '#64748B', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empresas.map((e, i) => {
              const sc = statusColor(e.suscripcion?.status ?? 'sin suscripción');
              return (
                <tr key={e.id} style={{ borderTop: i > 0 ? '1px solid #0F172A' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '0.875rem' }}>{e.nombre}</div>
                    <div style={{ color: '#64748B', fontSize: '0.75rem' }}>{e.rfc}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                      fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                      background: sc.bg, color: sc.text,
                    }}>
                      {e.suscripcion?.status ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: '0.8125rem' }}>
                    {e.suscripcion?.periodo_fin
                      ? new Date(e.suscripcion.periodo_fin).toLocaleDateString('es-MX')
                      : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#FCD34D', fontSize: '0.8125rem' }}>
                    {e.suscripcion?.pago_pendiente_desde
                      ? new Date(e.suscripcion.pago_pendiente_desde).toLocaleDateString('es-MX')
                      : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!e.activa ? (
                        <button
                          onClick={() => cambiarStatusEmpresa(e.id, true)}
                          disabled={accion === e.id}
                          style={{
                            padding: '4px 12px', borderRadius: 6, border: '1px solid #15803D',
                            background: 'transparent', color: '#4ADE80', cursor: 'pointer',
                            fontSize: '0.75rem', fontWeight: 600,
                          }}
                        >
                          {accion === e.id ? '…' : 'Reactivar'}
                        </button>
                      ) : (
                        <button
                          onClick={() => cambiarStatusEmpresa(e.id, false)}
                          disabled={accion === e.id}
                          style={{
                            padding: '4px 12px', borderRadius: 6, border: '1px solid #7F1D1D',
                            background: 'transparent', color: '#F87171', cursor: 'pointer',
                            fontSize: '0.75rem', fontWeight: 600,
                          }}
                        >
                          {accion === e.id ? '…' : 'Suspender'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#475569' }}>
                  Sin empresas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

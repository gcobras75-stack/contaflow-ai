'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/* ============================================================
   ContaFlow AI — Facturación
   Gestión de suscripciones por empresa ($99 MXN/mes)
   ============================================================ */

type Suscripcion = {
  id:            string;
  empresa_id:    string;
  status:        'trial' | 'activa' | 'vencida' | 'cancelada';
  trial_ends_at: string | null;
  periodo_fin:   string | null;
  mp_payment_id: string | null;
};

type Empresa = {
  id:     string;
  nombre: string;
  rfc:    string;
  activa: boolean;
  giro:   string | null;
  suscripcion: Suscripcion | null;
};

const STATUS_CONFIG = {
  trial:    { label: 'Prueba gratis',  bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  activa:   { label: 'Activa',         bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
  vencida:  { label: 'Vencida',        bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
  cancelada:{ label: 'Cancelada',      bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400'   },
};

function diasRestantes(fechaStr: string | null): number {
  if (!fechaStr) return 0;
  return Math.max(0, Math.ceil((new Date(fechaStr).getTime() - Date.now()) / 86400000));
}

function Badge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.vencida;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function BillingPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading]  = useState(true);
  const [pagando, setPagando]  = useState<string | null>(null);
  const [toast, setToast]      = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null);

  // Mensaje de retorno desde MP
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const pago = p.get('pago');
    const emp  = p.get('empresa');
    if (pago === 'ok') {
      showToast('ok', 'Pago procesado correctamente. La suscripción quedará activa en unos minutos.');
      // Limpiar query params
      window.history.replaceState({}, '', '/dashboard/billing');
    } else if (pago === 'error') {
      showToast('err', 'El pago no pudo procesarse. Por favor intenta de nuevo.');
      window.history.replaceState({}, '', '/dashboard/billing');
    }
    void emp; // usada en URL para contexto, no para lógica aquí
  }, []);

  useEffect(() => { cargar(); }, []);

  const showToast = (tipo: 'ok' | 'err', msg: string) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 6000);
  };

  const cargar = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('despacho_id')
      .eq('id', user.id)
      .single();
    if (!usuario?.despacho_id) { setLoading(false); return; }

    const { data: emps } = await supabase
      .from('empresas_clientes')
      .select('id, nombre, rfc, activa, giro')
      .eq('despacho_id', usuario.despacho_id)
      .order('nombre');

    if (!emps?.length) { setLoading(false); return; }

    const { data: subs } = await supabase
      .from('suscripciones')
      .select('*')
      .in('empresa_id', emps.map(e => e.id));

    const subMap = Object.fromEntries((subs ?? []).map(s => [s.empresa_id, s]));

    setEmpresas(emps.map(e => ({
      ...e,
      suscripcion: subMap[e.id] ?? null,
    })));
    setLoading(false);
  };

  const pagar = async (empresa: Empresa) => {
    setPagando(empresa.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/crear-preferencia-mp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ empresa_id: empresa.id }),
      });
      const json = await res.json() as { init_point?: string; sandbox_init_point?: string; error?: string };
      if (!res.ok || json.error) {
        showToast('err', json.error ?? 'Error al crear preferencia de pago');
        return;
      }
      // Redirigir a Mercado Pago (sandbox en dev, real en prod)
      const url = process.env.NODE_ENV === 'production'
        ? json.init_point
        : (json.sandbox_init_point ?? json.init_point);
      if (url) window.location.href = url;
    } catch {
      showToast('err', 'Error de conexión');
    } finally {
      setPagando(null);
    }
  };

  // ── Totales ────────────────────────────────────────────────
  const totales = empresas.reduce((acc, e) => {
    const s = e.suscripcion?.status ?? 'vencida';
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mesActual = empresas.filter(e => e.suscripcion?.status === 'activa').length * 99;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl text-sm font-medium transition-all
          ${toast.tipo === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.tipo === 'ok'
            ? <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            : <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona las suscripciones de tus empresas clientes</p>
      </div>

      {/* Resumen */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total empresas</div>
            <div className="text-2xl font-bold text-gray-900">{empresas.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">En prueba</div>
            <div className="text-2xl font-bold text-blue-600">{totales.trial ?? 0}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Activas</div>
            <div className="text-2xl font-bold text-green-600">{totales.activa ?? 0}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ingresos / mes</div>
            <div className="text-2xl font-bold" style={{ color: '#1B3A6B' }}>
              ${mesActual.toLocaleString('es-MX')}
            </div>
            <div className="text-xs text-gray-400">MXN estimado</div>
          </div>
        </div>
      )}

      {/* Tabla de empresas */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Empresas y suscripciones</h2>
          <span className="text-xs text-gray-400">$99 MXN / empresa / mes</span>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin"
              style={{ borderTopColor: '#1B3A6B' }} />
          </div>
        ) : empresas.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 text-sm">No tienes empresas clientes registradas.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {empresas.map(empresa => {
              const sus       = empresa.suscripcion;
              const status    = sus?.status ?? 'vencida';
              const esTrial   = status === 'trial';
              const esVencida = status === 'vencida' || status === 'cancelada';
              const dias      = esTrial
                ? diasRestantes(sus?.trial_ends_at ?? null)
                : diasRestantes(sus?.periodo_fin ?? null);
              const isPagando = pagando === empresa.id;

              return (
                <div key={empresa.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Info empresa */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm truncate">{empresa.nombre}</span>
                      <Badge status={status as keyof typeof STATUS_CONFIG} />
                      {!empresa.activa && (
                        <span className="text-xs text-red-500 font-medium">· inactiva</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{empresa.rfc}</div>
                    {empresa.giro && (
                      <div className="text-xs text-gray-400 truncate max-w-sm">{empresa.giro}</div>
                    )}
                  </div>

                  {/* Días restantes */}
                  <div className="text-right text-xs flex-shrink-0">
                    {esTrial && (
                      <div className={dias <= 5 ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                        {dias > 0 ? `${dias} días de prueba` : 'Prueba vencida'}
                      </div>
                    )}
                    {status === 'activa' && sus?.periodo_fin && (
                      <div className="text-gray-400">
                        Vence {new Date(sus.periodo_fin).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                      </div>
                    )}
                    {esVencida && (
                      <div className="text-red-400 font-medium">Sin suscripción</div>
                    )}
                  </div>

                  {/* Botón de pago */}
                  <div className="flex-shrink-0">
                    {esVencida || esTrial ? (
                      <button
                        onClick={() => pagar(empresa)}
                        disabled={isPagando}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
                        style={{ backgroundColor: '#00A651' }}
                      >
                        {isPagando ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 animate-spin"
                              style={{ borderTopColor: 'white' }} />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            {esVencida ? 'Reactivar — $99' : 'Contratar — $99'}
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">$99 MXN/mes</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 flex gap-3">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-blue-700 leading-relaxed">
          <strong>Pagos seguros con Mercado Pago.</strong> Al hacer clic en &ldquo;Contratar&rdquo; serás redirigido al checkout de Mercado Pago.
          El pago activa la suscripción automáticamente por 30 días. Puedes cancelar en cualquier momento.
        </div>
      </div>
    </div>
  );
}

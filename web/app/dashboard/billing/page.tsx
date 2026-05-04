'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/* ============================================================
   ContaFlow AI — Facturación
   Gestión de suscripciones por empresa ($99 MXN/mes)
   ============================================================ */

type StatusSus =
  | 'trial' | 'activa' | 'pago_pendiente'
  | 'suspendida' | 'vencida' | 'cancelada';

type Suscripcion = {
  id:                  string;
  empresa_id:          string;
  status:              StatusSus;
  status_previo:       string | null;
  trial_ends_at:       string | null;
  periodo_fin:         string | null;
  mp_payment_id:       string | null;
  fecha_cancelacion:   string | null;
  motivo_cancelacion:  string | null;
};

const MOTIVOS_OPCIONES = [
  { value: '',                             label: '(opcional)' },
  { value: 'precio_alto',                  label: 'El precio es muy alto' },
  { value: 'no_uso_suficiente',            label: 'No estoy usando suficiente la plataforma' },
  { value: 'cambio_software',              label: 'Cambié a otro software contable' },
  { value: 'cliente_ya_no_trabaja_conmigo',label: 'Ya no trabajo con este cliente' },
  { value: 'problema_tecnico',             label: 'Problemas técnicos' },
  { value: 'otro',                         label: 'Otro motivo' },
];

type Empresa = {
  id:     string;
  nombre: string;
  rfc:    string;
  activa: boolean;
  giro:   string | null;
  suscripcion: Suscripcion | null;
};

const STATUS_CONFIG: Record<StatusSus, { label: string; bg: string; text: string; dot: string }> = {
  trial:         { label: 'Prueba gratis',  bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  activa:        { label: 'Activa',         bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
  pago_pendiente:{ label: 'Pago pendiente', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  suspendida:    { label: 'Suspendida',     bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
  vencida:       { label: 'Vencida',        bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
  cancelada:     { label: 'Cancelada',      bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400'   },
};

/**
 * Calcula hasta cuándo tiene acceso una empresa post-cancelación.
 * Replica la lógica del backend para mostrarla en UI sin round-trip.
 */
function fechaAccesoFinal(sus: Suscripcion): string | null {
  const prev = sus.status_previo ?? sus.status;
  if (prev === 'activa' && sus.periodo_fin) {
    return new Date(sus.periodo_fin).getTime() > Date.now() ? sus.periodo_fin : null;
  }
  if (prev === 'trial' && sus.trial_ends_at) {
    return new Date(sus.trial_ends_at).getTime() > Date.now() ? sus.trial_ends_at : null;
  }
  return null;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

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

  // Modal de cancelación
  const [modalCancel, setModalCancel] = useState<{
    empresa: Empresa | null;
    all: boolean;
  }>({ empresa: null, all: false });
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [reactivando, setReactivando] = useState<string | null>(null);

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

  const abrirModalCancel = (empresa: Empresa | null, all: boolean) => {
    setModalCancel({ empresa, all });
    setMotivoSeleccionado('');
  };

  const cerrarModal = () => {
    setModalCancel({ empresa: null, all: false });
    setMotivoSeleccionado('');
  };

  const confirmarCancelacion = async () => {
    setCancelando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const body: Record<string, unknown> = {
        motivo: motivoSeleccionado || null,
      };
      if (modalCancel.all) {
        body.all = true;
      } else if (modalCancel.empresa) {
        body.empresa_id = modalCancel.empresa.id;
      }

      const res = await fetch('/api/cancelar-suscripcion', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { mensaje?: string; error?: string; canceladas?: number };
      if (!res.ok || json.error) {
        showToast('err', json.error ?? 'No se pudo cancelar');
      } else {
        showToast('ok', json.mensaje ?? 'Suscripción cancelada');
        cerrarModal();
        await cargar();
      }
    } catch {
      showToast('err', 'Error de conexión');
    } finally {
      setCancelando(false);
    }
  };

  const reactivar = async (empresa: Empresa) => {
    setReactivando(empresa.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/cancelar-suscripcion', {
        method: 'PATCH',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ empresa_id: empresa.id }),
      });
      const json = await res.json() as {
        mensaje?: string;
        error?: string;
        reactivadas?: unknown[];
        requieren_pago?: unknown[];
      };
      if (!res.ok || json.error) {
        showToast('err', json.error ?? 'No se pudo reactivar');
      } else if ((json.requieren_pago ?? []).length > 0) {
        showToast('err', 'El periodo de gracia expiró. Debes pagar para reactivar.');
        await cargar();
      } else {
        showToast('ok', json.mensaje ?? 'Reactivada');
        await cargar();
      }
    } catch {
      showToast('err', 'Error de conexión');
    } finally {
      setReactivando(null);
    }
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
              const esActiva  = status === 'activa';
              const esCancelada = status === 'cancelada';
              const esVencida = status === 'vencida';
              const dias      = esTrial
                ? diasRestantes(sus?.trial_ends_at ?? null)
                : diasRestantes(sus?.periodo_fin ?? null);
              const isPagando = pagando === empresa.id;
              const isReact   = reactivando === empresa.id;

              // Cuando está cancelada, calcular hasta cuándo tiene acceso
              const fechaAcceso = esCancelada && sus ? fechaAccesoFinal(sus) : null;
              const puedeReactivarGratis = esCancelada && fechaAcceso != null;

              return (
                <div key={empresa.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Info empresa */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm truncate">{empresa.nombre}</span>
                      <Badge status={status} />
                      {!empresa.activa && (
                        <span className="text-xs text-red-500 font-medium">· inactiva</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{empresa.rfc}</div>
                    {empresa.giro && (
                      <div className="text-xs text-gray-400 truncate max-w-sm">{empresa.giro}</div>
                    )}
                    {esCancelada && sus?.fecha_cancelacion && (
                      <div className="text-xs text-gray-500 mt-1">
                        Cancelada el {formatFecha(sus.fecha_cancelacion)}
                        {fechaAcceso && (
                          <> · acceso hasta <strong>{formatFecha(fechaAcceso)}</strong></>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Días restantes */}
                  <div className="text-right text-xs flex-shrink-0">
                    {esTrial && (
                      <div className={dias <= 5 ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                        {dias > 0 ? `${dias} días de prueba` : 'Prueba vencida'}
                      </div>
                    )}
                    {esActiva && sus?.periodo_fin && (
                      <div className="text-gray-400">
                        Próximo cobro {new Date(sus.periodo_fin).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                      </div>
                    )}
                    {(esVencida || (esCancelada && !fechaAcceso)) && (
                      <div className="text-red-400 font-medium">Sin acceso</div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {/* Cancelar: solo visible si está trial o activa */}
                    {(esTrial || esActiva) && (
                      <button
                        onClick={() => abrirModalCancel(empresa, false)}
                        className="text-xs font-semibold text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg border border-gray-200 hover:border-red-300 transition"
                      >
                        Cancelar
                      </button>
                    )}

                    {/* Reactivar gratis dentro de gracia */}
                    {puedeReactivarGratis && (
                      <button
                        onClick={() => reactivar(empresa)}
                        disabled={isReact}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
                        style={{ backgroundColor: '#1B3A6B' }}
                      >
                        {isReact ? '...' : 'Reactivar'}
                      </button>
                    )}

                    {/* Pagar: vencida, cancelada sin gracia, o trial activo que quiere contratar */}
                    {(esVencida || (esCancelada && !puedeReactivarGratis) || esTrial) && (
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
                            {esVencida || esCancelada ? 'Contratar — $99' : esTrial ? 'Activar — $99' : ''}
                          </>
                        )}
                      </button>
                    )}

                    {esActiva && (
                      <span className="text-xs text-gray-400 font-medium">$99/mes</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botón cancelar toda la cuenta */}
      {!loading && empresas.some(e => e.suscripcion?.status === 'activa' || e.suscripcion?.status === 'trial') && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-800">Cancelar toda la cuenta</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Cancela todas las suscripciones activas de tu despacho en un solo paso.
              Tu acceso continuará hasta el final del periodo pagado o del trial de cada empresa.
            </div>
          </div>
          <button
            onClick={() => abrirModalCancel(null, true)}
            className="text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 px-3 py-2 rounded-lg whitespace-nowrap"
          >
            Cancelar toda la cuenta
          </button>
        </div>
      )}

      {/* Nota informativa */}
      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 flex gap-3">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-blue-700 leading-relaxed">
          <strong>Pagos seguros con Mercado Pago.</strong> Al hacer clic en &ldquo;Contratar&rdquo; serás redirigido al checkout de Mercado Pago.
          El pago activa la suscripción automáticamente por 30 días. Puedes cancelar en cualquier momento y reactivar dentro de los 30 días siguientes sin volver a pagar.
        </div>
      </div>

      {/* ── Modal de cancelación ────────────────────────────── */}
      {(modalCancel.empresa || modalCancel.all) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
             onClick={cancelando ? undefined : cerrarModal}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
               onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {modalCancel.all ? '¿Cancelar toda tu cuenta?' : '¿Cancelar esta suscripción?'}
            </h2>

            {modalCancel.empresa && (() => {
              const sus = modalCancel.empresa.suscripcion;
              // Simulamos la cancelación para calcular la fecha de acceso
              const snapshot: Suscripcion | null = sus ? { ...sus, status_previo: sus.status } : null;
              const fin = snapshot ? fechaAccesoFinal(snapshot) : null;
              return (
                <div className="text-sm text-gray-600 leading-relaxed space-y-2 mb-5">
                  <p>
                    Vas a cancelar la suscripción de <strong>{modalCancel.empresa?.nombre}</strong>.
                  </p>
                  {fin ? (
                    <p>Tu acceso continuará hasta el <strong>{formatFecha(fin)}</strong>.</p>
                  ) : (
                    <p className="text-red-600">El acceso terminará inmediatamente (no hay periodo pagado ni trial vigente).</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Puedes reactivar gratis dentro de los próximos 30 días mientras tu periodo siga vigente.
                  </p>
                </div>
              );
            })()}

            {modalCancel.all && (
              <div className="text-sm text-gray-600 leading-relaxed space-y-2 mb-5">
                <p>Vas a cancelar <strong>todas</strong> las suscripciones de tu despacho.</p>
                <p className="text-xs text-gray-500">
                  Cada empresa conservará su acceso hasta el final de su periodo pagado o trial.
                  Puedes reactivarlas gratis dentro de 30 días.
                </p>
              </div>
            )}

            {/* Motivo */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Motivo de cancelación
              </label>
              <select
                value={motivoSeleccionado}
                onChange={e => setMotivoSeleccionado(e.target.value)}
                disabled={cancelando}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
              >
                {MOTIVOS_OPCIONES.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={cerrarModal}
                disabled={cancelando}
                className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                No, mantener
              </button>
              <button
                onClick={confirmarCancelacion}
                disabled={cancelando}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
              >
                {cancelando ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  'Sí, cancelar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

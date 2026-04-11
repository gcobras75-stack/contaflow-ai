'use client';

/**
 * /dashboard/red-comercial — dashboard para miembros de la red comercial.
 *
 * El usuario debe tener una fila en red_comercial con su user_id. Si no,
 * se muestra un mensaje explicando que no es miembro.
 *
 * Funcionalidades:
 *   - Muestra el código de referido del usuario con botón "Copiar"
 *   - Link completo /ref/CODIGO copiable para compartir por WhatsApp
 *   - Lista de contadores referidos (vía tabla referidos)
 *   - Resumen de comisiones del mes (ganadas, pendientes CFDI, cobradas)
 *   - Por cada comisión pendiente de CFDI: botón "Subir CFDI"
 *   - Modal de upload que llama a /api/validar-cfdi-comision
 *
 * Middleware: esta ruta está en RUTAS_EXCENTAS_SUSPENSION para que los
 * vendedores puedan ver su dashboard sin tener empresas clientes propias.
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type MiembroRed = {
  id:              string;
  rol:             'coordinador' | 'vendedor';
  codigo_referido: string;
  nombre:          string;
  tiene_rfc:       boolean;
  rfc:             string | null;
};

type Referido = {
  id:              string;
  contador_id:     string;
  codigo_usado:    string;
  created_at:      string;
  // Joined fields
  contador_nombre: string | null;
  contador_email:  string | null;
};

type Comision = {
  id:                  string;
  periodo:             string;
  beneficiario_tipo:   string;
  monto_comision:      number;
  monto_a_pagar:       number;
  retencion_isr:       number;
  tiene_rfc:           boolean;
  cfdi_status:         'pendiente' | 'recibido' | 'validado' | 'rechazado';
  cfdi_motivo_rechazo: string | null;
  pago_status:         'pendiente' | 'liberado' | 'pagado';
  fecha_pago:          string | null;
  created_at:          string;
};

const fmt = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const CFDI_BADGE: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  recibido:  'bg-blue-100 text-blue-700 border-blue-200',
  validado:  'bg-green-100 text-green-700 border-green-200',
  rechazado: 'bg-red-100 text-red-600 border-red-200',
};

const PAGO_BADGE: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-600',
  liberado:  'bg-blue-100 text-blue-700',
  pagado:    'bg-green-100 text-green-700',
};

export default function DashboardRedComercialPage() {
  const [loading, setLoading] = useState(true);
  const [miembro, setMiembro] = useState<MiembroRed | null>(null);
  const [referidos, setReferidos] = useState<Referido[]>([]);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [uploadingComision, setUploadingComision] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null);

  const mostrarToast = (tipo: 'ok' | 'err', msg: string) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const cargar = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // 1. Miembro de la red
    const { data: m } = await supabase
      .from('red_comercial')
      .select('id, rol, codigo_referido, nombre, tiene_rfc, rfc')
      .eq('user_id', user.id)
      .eq('activo', true)
      .maybeSingle();

    if (!m) {
      setMiembro(null);
      setLoading(false);
      return;
    }
    setMiembro(m as MiembroRed);

    // 2. Referidos (contadores que usaron mi código)
    // RLS policy vendedor_sus_referidos + coordinador_referidos_equipo
    // filtran automáticamente. Unimos con usuarios para mostrar nombre/email.
    const { data: refs } = await supabase
      .from('referidos')
      .select(`
        id, contador_id, codigo_usado, created_at,
        usuarios:contador_id ( nombre, email )
      `)
      .order('created_at', { ascending: false });

    const referidosFmt: Referido[] = (refs ?? []).map((r) => {
      const usuariosRaw = (r as { usuarios?: unknown }).usuarios;
      const usuarios = Array.isArray(usuariosRaw)
        ? (usuariosRaw[0] as { nombre?: string; email?: string } | undefined)
        : (usuariosRaw as { nombre?: string; email?: string } | undefined);
      return {
        id:              r.id,
        contador_id:     r.contador_id,
        codigo_usado:    r.codigo_usado,
        created_at:      r.created_at,
        contador_nombre: usuarios?.nombre ?? null,
        contador_email:  usuarios?.email  ?? null,
      };
    });
    setReferidos(referidosFmt);

    // 3. Comisiones (RLS filtra automáticamente por beneficiario_id)
    const { data: coms } = await supabase
      .from('comisiones')
      .select('id, periodo, beneficiario_tipo, monto_comision, monto_a_pagar, retencion_isr, tiene_rfc, cfdi_status, cfdi_motivo_rechazo, pago_status, fecha_pago, created_at')
      .eq('beneficiario_id', m.id)
      .order('created_at', { ascending: false });

    setComisiones((coms ?? []) as Comision[]);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const stats = useMemo(() => {
    const mesActual = new Date().toISOString().slice(0, 7);
    let ganadasMes = 0;
    let pendientesCFDI = 0;
    let cobradasMes = 0;

    for (const c of comisiones) {
      if (c.periodo === mesActual) {
        ganadasMes += Number(c.monto_a_pagar ?? 0);
      }
      if ((c.cfdi_status === 'pendiente' || c.cfdi_status === 'rechazado') && c.tiene_rfc) {
        pendientesCFDI += Number(c.monto_a_pagar ?? 0);
      }
      if (c.pago_status === 'pagado' && c.fecha_pago?.slice(0, 7) === mesActual) {
        cobradasMes += Number(c.monto_a_pagar ?? 0);
      }
    }
    return { ganadasMes, pendientesCFDI, cobradasMes };
  }, [comisiones]);

  const copiarTexto = (texto: string, label: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(texto);
      mostrarToast('ok', `${label} copiado`);
    }
  };

  const subirCFDI = async (comisionId: string, archivo: File) => {
    setUploadingComision(comisionId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const form = new FormData();
      form.set('comision_id', comisionId);
      form.set('xml', archivo);

      const res = await fetch('/api/validar-cfdi-comision', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: form,
      });
      const json = await res.json();

      if (!res.ok) {
        mostrarToast('err', json.error ?? 'Error al subir CFDI');
      } else if (json.cfdi_status === 'rechazado') {
        mostrarToast('err', `CFDI rechazado: ${json.motivo}`);
      } else {
        mostrarToast('ok', 'CFDI validado — comisión liberada');
      }
      await cargar();
    } catch {
      mostrarToast('err', 'Error de conexión');
    } finally {
      setUploadingComision(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 animate-spin" style={{ borderTopColor: '#1B3A6B' }} />
      </div>
    );
  }

  if (!miembro) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <div className="text-4xl mb-3">🤝</div>
          <h1 className="text-lg font-bold text-gray-800 mb-2">No eres miembro de la red comercial</h1>
          <p className="text-sm text-gray-500 mb-4">
            Este dashboard es para coordinadores y vendedores de ContaFlow AI.
            Si crees que deberías tener acceso, contacta a soporte.
          </p>
          <a href="/dashboard" className="inline-block text-sm font-semibold text-[#1B3A6B] hover:text-[#152d55]">
            ← Volver al dashboard
          </a>
        </div>
      </div>
    );
  }

  const linkCompleto = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/ref/${miembro.codigo_referido}`;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-md ${toast.tipo === 'ok' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
          {miembro.rol === 'coordinador' ? 'Coordinador Regional' : 'Vendedor'}
        </p>
        <h1 className="text-2xl font-bold text-gray-900">{miembro.nombre}</h1>
      </div>

      {/* Código de referido */}
      <div className="bg-gradient-to-br from-[#1B3A6B] to-[#152d55] text-white rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60 font-semibold mb-2">
              Tu código de referido
            </p>
            <div className="font-mono text-4xl font-bold tracking-wider">{miembro.codigo_referido}</div>
          </div>
          <button
            onClick={() => copiarTexto(miembro.codigo_referido, 'Código')}
            className="text-xs font-semibold bg-white/15 hover:bg-white/25 px-4 py-2 rounded-lg"
          >
            📋 Copiar código
          </button>
        </div>

        <div className="mt-5 pt-5 border-t border-white/10">
          <p className="text-xs uppercase tracking-wide text-white/60 font-semibold mb-2">
            Link para compartir por WhatsApp
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-white/90 font-mono bg-black/20 px-3 py-2 rounded-lg overflow-x-auto">
              {linkCompleto}
            </code>
            <button
              onClick={() => copiarTexto(linkCompleto, 'Link')}
              className="text-xs font-semibold bg-[#00A651] hover:bg-[#008F45] px-4 py-2 rounded-lg whitespace-nowrap"
            >
              🔗 Copiar
            </button>
          </div>
        </div>
      </div>

      {/* Stats del mes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ganadas este mes</div>
          <div className="text-2xl font-bold text-[#1B3A6B]">{fmt(stats.ganadasMes)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pendientes de CFDI</div>
          <div className="text-2xl font-bold text-yellow-600">{fmt(stats.pendientesCFDI)}</div>
          <div className="text-xs text-gray-400 mt-1">Sube tu CFDI para liberar pago</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cobradas este mes</div>
          <div className="text-2xl font-bold text-green-600">{fmt(stats.cobradasMes)}</div>
        </div>
      </div>

      {/* Contadores referidos */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">
          Contadores referidos ({referidos.length})
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {referidos.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Aún no tienes contadores referidos. Comparte tu link para empezar.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {referidos.map(r => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">
                      {r.contador_nombre ?? 'Sin nombre'}
                    </div>
                    <div className="text-xs text-gray-500">{r.contador_email ?? '—'}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Registrado {new Date(r.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historial de comisiones */}
      <div>
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">
          Historial de comisiones
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {comisiones.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Sin comisiones todavía. Se generarán cuando tus referidos paguen su suscripción.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {comisiones.map(c => {
                const necesitaCFDI = c.tiene_rfc && (c.cfdi_status === 'pendiente' || c.cfdi_status === 'rechazado');
                return (
                  <div key={c.id} className="px-5 py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-gray-500">{c.periodo}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${CFDI_BADGE[c.cfdi_status]}`}>
                            CFDI: {c.cfdi_status}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PAGO_BADGE[c.pago_status]}`}>
                            Pago: {c.pago_status}
                          </span>
                        </div>
                        <div className="mt-1">
                          <span className="text-lg font-bold text-[#1B3A6B]">{fmt(c.monto_a_pagar)}</span>
                          {Number(c.retencion_isr) > 0 && (
                            <span className="text-xs text-red-500 ml-2">(comisión {fmt(c.monto_comision)} − ISR {fmt(c.retencion_isr)})</span>
                          )}
                        </div>
                        {c.cfdi_motivo_rechazo && (
                          <div className="text-xs text-red-500 mt-1">⚠️ {c.cfdi_motivo_rechazo}</div>
                        )}
                      </div>

                      {necesitaCFDI && (
                        <label className={`text-xs font-semibold text-white bg-[#00A651] hover:bg-[#008F45] px-3 py-2 rounded-lg cursor-pointer ${uploadingComision === c.id ? 'opacity-50' : ''}`}>
                          {uploadingComision === c.id ? 'Subiendo...' : '📤 Subir CFDI'}
                          <input
                            type="file"
                            accept=".xml,application/xml,text/xml"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) subirCFDI(c.id, f);
                              e.target.value = '';
                            }}
                            disabled={uploadingComision === c.id}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

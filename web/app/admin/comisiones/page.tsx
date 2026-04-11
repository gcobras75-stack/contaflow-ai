'use client';

/**
 * /admin/comisiones — panel de gestión de comisiones de la red comercial.
 *
 * Vista para staff ContaFlow (rol=superadmin):
 *   - Lista todas las comisiones con filtros (status CFDI, status pago, periodo)
 *   - Muestra beneficiario, monto, status, fecha
 *   - Botón "Marcar como pagada" por fila (pago_status → pagado, fecha_pago=NOW)
 *   - Summary: pendientes de CFDI, listas para pagar, pagadas este mes
 *   - Export CSV con todas las filas visibles
 *
 * RLS permite al admin ver/editar todas las filas vía policy `admin_all`.
 */
import { createClient } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Comision = {
  id:                  string;
  mp_payment_id:       string;
  periodo:             string;
  beneficiario_id:     string;
  beneficiario_tipo:   'coordinador' | 'vendedor' | 'contador' | 'admin';
  beneficiario_nombre: string | null;
  beneficiario_rfc:    string | null;
  monto_base:          number;
  porcentaje:          number;
  monto_comision:      number;
  retencion_isr:       number;
  monto_a_pagar:       number;
  tiene_rfc:           boolean;
  cfdi_uuid:           string | null;
  cfdi_status:         'pendiente' | 'recibido' | 'validado' | 'rechazado';
  cfdi_motivo_rechazo: string | null;
  pago_status:         'pendiente' | 'liberado' | 'pagado';
  puede_pagar:         boolean;
  fecha_pago:          string | null;
  created_at:          string;
};

type Filtro = 'todas' | 'pendientes_cfdi' | 'listas_pagar' | 'pagadas';

const fmt = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const BADGE_TIPO: Record<string, string> = {
  coordinador: 'bg-purple-100 text-purple-700',
  vendedor:    'bg-blue-100 text-blue-700',
  contador:    'bg-green-100 text-green-700',
  admin:       'bg-gray-100 text-gray-700',
};

const BADGE_CFDI: Record<string, string> = {
  pendiente:  'bg-yellow-100 text-yellow-700',
  recibido:   'bg-blue-100 text-blue-700',
  validado:   'bg-green-100 text-green-700',
  rechazado:  'bg-red-100 text-red-600',
};

const BADGE_PAGO: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-600',
  liberado:  'bg-blue-100 text-blue-700',
  pagado:    'bg-green-100 text-green-700',
};

export default function AdminComisionesPage() {
  const [loading, setLoading] = useState(true);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('');
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null);

  const mostrarToast = (tipo: 'ok' | 'err', msg: string) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const cargar = async () => {
    setLoading(true);
    let query = supabase
      .from('comisiones')
      .select('*')
      .order('created_at', { ascending: false });

    if (periodoFiltro) query = query.eq('periodo', periodoFiltro);

    const { data, error } = await query;
    if (error) {
      mostrarToast('err', `Error: ${error.message}`);
    } else {
      setComisiones((data ?? []) as Comision[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoFiltro]);

  const filtradas = useMemo(() => {
    switch (filtro) {
      case 'pendientes_cfdi':
        return comisiones.filter(c =>
          (c.cfdi_status === 'pendiente' || c.cfdi_status === 'rechazado') && c.tiene_rfc);
      case 'listas_pagar':
        return comisiones.filter(c =>
          c.puede_pagar && c.pago_status !== 'pagado');
      case 'pagadas':
        return comisiones.filter(c => c.pago_status === 'pagado');
      default:
        return comisiones;
    }
  }, [comisiones, filtro]);

  const stats = useMemo(() => {
    let pendientesCFDI = 0;
    let listasPagar = 0;
    let pagadasMes = 0;
    const mesActual = new Date().toISOString().slice(0, 7);

    for (const c of comisiones) {
      if ((c.cfdi_status === 'pendiente' || c.cfdi_status === 'rechazado') && c.tiene_rfc) {
        pendientesCFDI += Number(c.monto_a_pagar ?? 0);
      }
      if (c.puede_pagar && c.pago_status !== 'pagado') {
        listasPagar += Number(c.monto_a_pagar ?? 0);
      }
      if (c.pago_status === 'pagado' && c.fecha_pago?.slice(0, 7) === mesActual) {
        pagadasMes += Number(c.monto_a_pagar ?? 0);
      }
    }
    return { pendientesCFDI, listasPagar, pagadasMes };
  }, [comisiones]);

  const marcarPagada = async (c: Comision) => {
    if (!c.puede_pagar) {
      mostrarToast('err', 'Esta comisión aún no está lista para pago (CFDI pendiente)');
      return;
    }
    setActualizando(c.id);
    const { error } = await supabase
      .from('comisiones')
      .update({
        pago_status: 'pagado',
        fecha_pago:  new Date().toISOString(),
      })
      .eq('id', c.id);

    if (error) {
      mostrarToast('err', error.message);
    } else {
      mostrarToast('ok', `Comisión de ${c.beneficiario_nombre ?? 'beneficiario'} marcada como pagada`);
      await cargar();
    }
    setActualizando(null);
  };

  const exportarCSV = () => {
    const header = [
      'id','periodo','mp_payment_id','beneficiario','tipo','rfc',
      'monto_base','porcentaje','monto_comision','retencion_isr','monto_a_pagar',
      'cfdi_uuid','cfdi_status','pago_status','fecha_pago','created_at',
    ];
    const rows = filtradas.map(c => [
      c.id, c.periodo, c.mp_payment_id,
      (c.beneficiario_nombre ?? '').replace(/"/g, '""'),
      c.beneficiario_tipo, c.beneficiario_rfc ?? '',
      c.monto_base, c.porcentaje, c.monto_comision, c.retencion_isr, c.monto_a_pagar,
      c.cfdi_uuid ?? '', c.cfdi_status, c.pago_status,
      c.fecha_pago ?? '', c.created_at,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = '\uFEFF' + [header.join(','), ...rows].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comisiones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Periodos disponibles para el dropdown
  const periodosDisponibles = useMemo(() => {
    const set = new Set(comisiones.map(c => c.periodo));
    return Array.from(set).sort().reverse();
  }, [comisiones]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.tipo === 'ok' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comisiones</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de comisiones de la red comercial</p>
        </div>
        <div className="flex gap-2">
          <a href="/admin/red-comercial" className="text-sm font-semibold text-[#1B3A6B] hover:text-[#152d55] px-4 py-2 border border-gray-200 rounded-lg">
            Red comercial
          </a>
          <button
            onClick={exportarCSV}
            className="text-sm font-semibold text-white bg-[#1B3A6B] hover:bg-[#152d55] px-4 py-2 rounded-lg"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pendientes de CFDI</div>
          <div className="text-2xl font-bold text-yellow-600">{fmt(stats.pendientesCFDI)}</div>
          <div className="text-xs text-gray-400 mt-1">Esperando que el beneficiario suba CFDI válido</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Listas para pagar</div>
          <div className="text-2xl font-bold text-blue-600">{fmt(stats.listasPagar)}</div>
          <div className="text-xs text-gray-400 mt-1">CFDI validado o no requerido</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pagadas este mes</div>
          <div className="text-2xl font-bold text-green-600">{fmt(stats.pagadasMes)}</div>
          <div className="text-xs text-gray-400 mt-1">Registrado como pagado</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {([
            { v: 'todas',           l: 'Todas' },
            { v: 'pendientes_cfdi', l: 'Pendientes CFDI' },
            { v: 'listas_pagar',    l: 'Listas para pagar' },
            { v: 'pagadas',         l: 'Pagadas' },
          ] as { v: Filtro; l: string }[]).map(opt => (
            <button
              key={opt.v}
              onClick={() => setFiltro(opt.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filtro === opt.v
                  ? 'bg-[#1B3A6B] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
        <select
          value={periodoFiltro}
          onChange={e => setPeriodoFiltro(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Todos los periodos</option>
          {periodosDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="ml-auto text-xs text-gray-400">
          {filtradas.length} {filtradas.length === 1 ? 'comisión' : 'comisiones'}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin" style={{ borderTopColor: '#1B3A6B' }} />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">💰</div>
            <p className="text-sm text-gray-500">Sin comisiones con este filtro</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Periodo</th>
                  <th className="px-4 py-3 text-left">Beneficiario</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-right">A pagar</th>
                  <th className="px-4 py-3 text-left">CFDI</th>
                  <th className="px-4 py-3 text-left">Pago</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtradas.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{c.periodo}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{c.beneficiario_nombre ?? '—'}</div>
                      {c.beneficiario_rfc && (
                        <div className="text-xs text-gray-400 font-mono">{c.beneficiario_rfc}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_TIPO[c.beneficiario_tipo]}`}>
                        {c.beneficiario_tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {fmt(c.monto_comision)}
                      {Number(c.retencion_isr) > 0 && (
                        <div className="text-xs text-red-500">−{fmt(c.retencion_isr)} ISR</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#1B3A6B]">{fmt(c.monto_a_pagar)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_CFDI[c.cfdi_status]}`}>
                        {c.cfdi_status}
                      </span>
                      {c.cfdi_motivo_rechazo && (
                        <div className="text-xs text-red-500 mt-1 max-w-[200px]">{c.cfdi_motivo_rechazo}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_PAGO[c.pago_status]}`}>
                        {c.pago_status}
                      </span>
                      {c.fecha_pago && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(c.fecha_pago).toLocaleDateString('es-MX')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.pago_status !== 'pagado' && c.puede_pagar ? (
                        <button
                          onClick={() => marcarPagada(c)}
                          disabled={actualizando === c.id}
                          className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1.5 rounded-lg"
                        >
                          {actualizando === c.id ? '...' : 'Marcar pagada'}
                        </button>
                      ) : c.pago_status === 'pagado' ? (
                        <span className="text-xs text-gray-400">✓ pagada</span>
                      ) : (
                        <span className="text-xs text-gray-400">bloqueada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

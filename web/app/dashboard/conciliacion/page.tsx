'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ── Tipos ────────────────────────────────────────────────────────────────────

type Empresa = { id: string; nombre: string; rfc: string };

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

type Movimiento = {
  fecha: string | null;
  concepto: string;
  referencia: string | null;
  cargo: number;
  abono: number;
};

type EstadoAnalizado = {
  banco: string | null;
  periodo: string | null;
  cuenta: string | null;
  saldo_inicial: number | null;
  saldo_final: number | null;
  movimientos: Movimiento[];
};

type ItemPagado  = { cfdi_uuid: string; movimiento_concepto: string; monto: number; fecha: string };
type ItemPendiente = { cfdi_uuid: string; total: number; fecha_emision: string; motivo: string };
type ItemSinCFDI = { concepto: string; monto: number; fecha: string; sugerencia: string };

type Conciliacion = {
  pagados: ItemPagado[];
  pendientes: ItemPendiente[];
  sin_cfdi: ItemSinCFDI[];
  resumen: {
    total_conciliado: number;
    total_pendiente: number;
    total_sin_cfdi: number;
    porcentaje_conciliacion: number;
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const STATUS = {
  pendiente: { label: 'Pendiente', bg: 'bg-yellow-50',  text: 'text-yellow-700', badge: 'bg-yellow-100' },
  aprobado:  { label: 'Aprobado',  bg: 'bg-green-50',   text: 'text-green-700',  badge: 'bg-green-100'  },
  rechazado: { label: 'Rechazado', bg: 'bg-red-50',     text: 'text-red-700',    badge: 'bg-red-100'    },
};

// ── Componente principal ─────────────────────────────────────────────────────

export default function ConciliacionPage() {
  const [empresas, setEmpresas]       = useState<Empresa[]>([]);
  const [empresaSel, setEmpresaSel]   = useState('');
  const [cfdis, setCfdis]             = useState<CFDI[]>([]);
  const [loading, setLoading]         = useState(false);
  const [accionando, setAccionando]   = useState<string | null>(null);
  const [tab, setTab]                 = useState<'revision' | 'ia'>('revision');

  // IA conciliación
  const [textoBanco, setTextoBanco]         = useState('');
  const [analizando, setAnalizando]         = useState(false);
  const [pasoIA, setPasoIA]                 = useState('');
  const [estadoAnalizado, setEstadoAnalizado] = useState<EstadoAnalizado | null>(null);
  const [conciliacion, setConciliacion]       = useState<Conciliacion | null>(null);
  const [errorIA, setErrorIA]               = useState('');

  // ── Cargar empresas ──────────────────────────────────────────────────────
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

  // ── Cargar CFDIs al seleccionar empresa ──────────────────────────────────
  useEffect(() => {
    if (!empresaSel) { setCfdis([]); return; }
    setLoading(true);
    supabase
      .from('cfdis')
      .select('*')
      .eq('empresa_id', empresaSel)
      .order('fecha_emision', { ascending: false })
      .then(({ data }) => { setCfdis(data ?? []); setLoading(false); });
  }, [empresaSel]);

  // ── Aprobar / Rechazar CFDI ──────────────────────────────────────────────
  const cambiarStatus = async (cfdiId: string, nuevoStatus: 'aprobado' | 'rechazado') => {
    setAccionando(cfdiId);
    const { error } = await supabase
      .from('cfdis').update({ status: nuevoStatus }).eq('id', cfdiId);
    if (!error) {
      setCfdis(prev => prev.map(c => c.id === cfdiId ? { ...c, status: nuevoStatus } : c));
    }
    setAccionando(null);
  };

  // ── Exportar CONTPAQi ─────────────────────────────────────────────────────
  const exportarContpaq = () => {
    const aprobados = cfdis.filter(c => c.status === 'aprobado');
    if (aprobados.length === 0) { alert('No hay CFDIs aprobados para exportar.'); return; }

    const lineas = aprobados.map(c => {
      const fecha    = c.fecha_emision?.replace(/-/g, '') ?? '00000000';
      const concepto = `CFDI ${c.tipo?.toUpperCase() ?? 'ING'} ${c.uuid_sat?.slice(0, 8) ?? ''}`;
      const cargo    = c.tipo === 'egreso'  ? (c.total ?? 0).toFixed(2) : '0.00';
      const abono    = c.tipo === 'ingreso' ? (c.total ?? 0).toFixed(2) : '0.00';
      return `${fecha}|${concepto}|${cargo}|${abono}|${(c.iva ?? 0).toFixed(2)}`;
    });

    const contenido = [
      'POLIZA|ContaFlow AI|Exportado ' + new Date().toLocaleDateString('es-MX'),
      'FECHA|CONCEPTO|CARGO|ABONO|IVA',
      ...lineas,
    ].join('\n');

    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `contpaq_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Conciliar con IA ─────────────────────────────────────────────────────
  const conciliarConIA = async () => {
    if (!textoBanco.trim()) { setErrorIA('Pega el texto del estado de cuenta primero.'); return; }
    setAnalizando(true);
    setErrorIA('');
    setEstadoAnalizado(null);
    setConciliacion(null);

    try {
      setPasoIA('Analizando estado de cuenta con Claude...');
      const res = await fetch('/api/conciliar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contenido: textoBanco,
          cfdis: empresaSel ? cfdis : [],
        }),
      });

      const data = await res.json() as {
        error?: string;
        estadoAnalizado?: EstadoAnalizado;
        conciliacion?: Conciliacion;
      };

      if (!res.ok) {
        setErrorIA(data.error ?? 'Error al conectar con la IA.');
        return;
      }

      setPasoIA('Procesando resultados...');
      if (data.estadoAnalizado) setEstadoAnalizado(data.estadoAnalizado);
      if (data.conciliacion)    setConciliacion(data.conciliacion);
    } catch {
      setErrorIA('Error de red al contactar la IA.');
    } finally {
      setAnalizando(false);
      setPasoIA('');
    }
  };

  // ── Totales pestaña revisión ──────────────────────────────────────────────
  const totales = cfdis.reduce((acc, c) => {
    acc.total    += Number(c.total ?? 0);
    acc.iva      += Number(c.iva   ?? 0);
    if (c.status === 'pendiente') acc.pendiente++;
    if (c.status === 'aprobado')  acc.aprobado++;
    if (c.status === 'rechazado') acc.rechazado++;
    return acc;
  }, { total: 0, iva: 0, pendiente: 0, aprobado: 0, rechazado: 0 });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full">

        {/* Selector empresa */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h1 className="text-xl font-bold text-[#333333]">Conciliación contable</h1>
          <button
            onClick={exportarContpaq}
            className="bg-[#1B3A6B] hover:bg-[#152d55] text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar CONTPAQi
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
          <label className="block text-sm font-semibold text-gray-600 mb-2">Empresa cliente</label>
          <select
            value={empresaSel}
            onChange={e => { setEmpresaSel(e.target.value); setEstadoAnalizado(null); setConciliacion(null); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
          >
            <option value="">— Selecciona una empresa —</option>
            {empresas.map(e => (
              <option key={e.id} value={e.id}>{e.nombre} · {e.rfc}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-5 w-fit">
          {([
            { key: 'revision', label: 'Revisión de CFDIs' },
            { key: 'ia',       label: '✦ Conciliación con IA' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === t.key ? 'bg-[#1B3A6B] text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Revisión de CFDIs ── */}
        {tab === 'revision' && (
          <>
            {/* Resumen */}
            {empresaSel && !loading && cfdis.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Total acumulado', val: fmt(totales.total),    color: 'text-[#1B3A6B]'    },
                  { label: 'IVA total',        val: fmt(totales.iva),      color: 'text-gray-700'     },
                  { label: 'Pendientes',       val: String(totales.pendiente), color: 'text-yellow-600' },
                  { label: 'Aprobados',        val: String(totales.aprobado),  color: 'text-green-600'  },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
                    <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Lista */}
            {!empresaSel ? (
              <EmptyState msg="Selecciona una empresa para ver sus CFDIs" />
            ) : loading ? (
              <Spinner />
            ) : cfdis.length === 0 ? (
              <EmptyState msg="Esta empresa no tiene CFDIs registrados" />
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
          </>
        )}

        {/* ── Tab: Conciliación con IA ── */}
        {tab === 'ia' && (
          <div className="space-y-5">

            {/* Instrucciones */}
            <div className="bg-[#EEF2FA] border border-[#1B3A6B]/15 rounded-xl p-4 flex gap-3">
              <div className="text-2xl shrink-0">✦</div>
              <div>
                <p className="text-sm font-semibold text-[#1B3A6B]">Cómo funciona la conciliación con IA</p>
                <ol className="text-xs text-[#1B3A6B]/80 mt-1 space-y-0.5 list-decimal list-inside">
                  <li>Selecciona la empresa arriba</li>
                  <li>Pega el texto de su estado de cuenta bancario</li>
                  <li>Claude extrae los movimientos y los cruza contra sus CFDIs</li>
                  <li>Obtienes: pagados, pendientes y gastos sin factura</li>
                </ol>
              </div>
            </div>

            {/* Textarea */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Estado de cuenta (texto)
              </label>
              <textarea
                value={textoBanco}
                onChange={e => setTextoBanco(e.target.value)}
                rows={10}
                placeholder={`Pega aquí el texto del estado de cuenta bancario.

Ejemplo:
BANCO BANAMEX
Cuenta: ****1234
Periodo: Marzo 2026

Fecha       Concepto                        Cargo      Abono
01/03/2026  PAGO PROVEEDOR ABC              15,000.00
05/03/2026  DEPOSITO CLIENTE XYZ                       50,000.00
...`}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none"
              />
              <div className="flex items-center justify-between mt-3 gap-3">
                <p className="text-xs text-gray-400">
                  {empresaSel
                    ? `Se cruzará contra ${cfdis.length} CFDI${cfdis.length !== 1 ? 's' : ''} de la empresa seleccionada`
                    : 'Selecciona una empresa arriba para cruzar contra sus CFDIs'
                  }
                </p>
                <button
                  onClick={conciliarConIA}
                  disabled={analizando || !textoBanco.trim()}
                  className="bg-[#1B3A6B] hover:bg-[#152d55] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-2.5 rounded-lg transition flex items-center gap-2 shrink-0"
                >
                  {analizando ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {pasoIA || 'Analizando...'}
                    </>
                  ) : (
                    <>✦ Analizar con Claude AI</>
                  )}
                </button>
              </div>
            </div>

            {/* Error IA */}
            {errorIA && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                <strong>Error:</strong> {errorIA}
              </div>
            )}

            {/* Resultado: estado de cuenta analizado */}
            {estadoAnalizado && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-[#333333]">
                      {estadoAnalizado.banco ?? 'Estado de cuenta'} · {estadoAnalizado.periodo ?? ''}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {estadoAnalizado.movimientos.length} movimientos extraídos
                      {estadoAnalizado.cuenta ? ` · Cuenta ****${estadoAnalizado.cuenta}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500 space-y-0.5">
                    {estadoAnalizado.saldo_inicial != null && (
                      <p>Saldo inicial: <span className="font-semibold">{fmt(estadoAnalizado.saldo_inicial)}</span></p>
                    )}
                    {estadoAnalizado.saldo_final != null && (
                      <p>Saldo final: <span className="font-semibold">{fmt(estadoAnalizado.saldo_final)}</span></p>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                        <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                        <th className="px-4 py-3 text-left font-semibold">Concepto</th>
                        <th className="px-4 py-3 text-left font-semibold">Referencia</th>
                        <th className="px-4 py-3 text-right font-semibold">Cargo</th>
                        <th className="px-4 py-3 text-right font-semibold">Abono</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {estadoAnalizado.movimientos.map((m, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{m.fecha ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{m.concepto}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs font-mono">{m.referencia ?? '—'}</td>
                          <td className="px-4 py-3 text-right text-red-600 font-medium">
                            {m.cargo > 0 ? fmt(m.cargo) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">
                            {m.abono > 0 ? fmt(m.abono) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Resultado: conciliación */}
            {conciliacion && (
              <div className="space-y-4">
                {/* Resumen porcentaje */}
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h2 className="font-bold text-[#333333] mb-4">Resultado de la conciliación</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Conciliado',    val: fmt(conciliacion.resumen.total_conciliado),  color: 'text-green-600' },
                      { label: 'Pendiente',     val: fmt(conciliacion.resumen.total_pendiente),   color: 'text-yellow-600' },
                      { label: 'Sin CFDI',      val: fmt(conciliacion.resumen.total_sin_cfdi),    color: 'text-red-500'   },
                      { label: '% Conciliado',  val: `${conciliacion.resumen.porcentaje_conciliacion}%`, color: 'text-[#1B3A6B]' },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                        <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
                        <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Barra de progreso */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Conciliación</span>
                      <span>{conciliacion.resumen.porcentaje_conciliacion}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-green-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, conciliacion.resumen.porcentaje_conciliacion)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Pagados */}
                {conciliacion.pagados.length > 0 && (
                  <ResultadoSeccion
                    titulo={`✓ CFDIs pagados (${conciliacion.pagados.length})`}
                    color="border-green-200 bg-green-50"
                    headerColor="text-green-700"
                  >
                    {conciliacion.pagados.map((p, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-green-100 last:border-0">
                        <div>
                          <p className="text-xs font-mono text-gray-500">{p.cfdi_uuid?.slice(0, 16)}...</p>
                          <p className="text-xs text-gray-600 mt-0.5">{p.movimiento_concepto}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-green-600">{fmt(p.monto)}</p>
                          <p className="text-xs text-gray-400">{p.fecha}</p>
                        </div>
                      </div>
                    ))}
                  </ResultadoSeccion>
                )}

                {/* Pendientes */}
                {conciliacion.pendientes.length > 0 && (
                  <ResultadoSeccion
                    titulo={`⚠ CFDIs pendientes de pago (${conciliacion.pendientes.length})`}
                    color="border-yellow-200 bg-yellow-50"
                    headerColor="text-yellow-700"
                  >
                    {conciliacion.pendientes.map((p, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-yellow-100 last:border-0">
                        <div>
                          <p className="text-xs font-mono text-gray-500">{p.cfdi_uuid?.slice(0, 16)}...</p>
                          <p className="text-xs text-gray-500 mt-0.5">{p.motivo}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-yellow-700">{fmt(p.total)}</p>
                          <p className="text-xs text-gray-400">{p.fecha_emision}</p>
                        </div>
                      </div>
                    ))}
                  </ResultadoSeccion>
                )}

                {/* Sin CFDI */}
                {conciliacion.sin_cfdi.length > 0 && (
                  <ResultadoSeccion
                    titulo={`✕ Gastos sin CFDI (${conciliacion.sin_cfdi.length})`}
                    color="border-red-200 bg-red-50"
                    headerColor="text-red-700"
                  >
                    {conciliacion.sin_cfdi.map((s, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-red-100 last:border-0">
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{s.concepto}</p>
                          <p className="text-xs text-gray-400 mt-0.5 italic">{s.sugerencia}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-red-600">{fmt(s.monto)}</p>
                          <p className="text-xs text-gray-400">{s.fecha}</p>
                        </div>
                      </div>
                    ))}
                  </ResultadoSeccion>
                )}
              </div>
            )}

          </div>
        )}

    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
      {msg}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
    </div>
  );
}

function ResultadoSeccion({
  titulo, color, headerColor, children,
}: {
  titulo: string;
  color: string;
  headerColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <h3 className={`text-sm font-bold mb-3 ${headerColor}`}>{titulo}</h3>
      {children}
    </div>
  );
}

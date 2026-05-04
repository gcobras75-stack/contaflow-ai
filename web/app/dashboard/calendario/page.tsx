'use client';

/**
 * Calendario fiscal — lee de la tabla calendario_obligaciones (migración 005).
 *
 * - RLS filtra automáticamente al despacho del contador autenticado
 * - Art. 12 CFF ya está aplicado en fecha_limite (calculada en SQL)
 * - Marcar presentado actualiza status + fecha_presentacion + presentado_por
 * - Filtros: mes/año, empresa, status
 * - El cron cron-calendario-vencidos convierte pendiente → vencido
 *   al pasar la fecha, y cron-notificar-obligaciones envía recordatorios
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Empresa = { id: string; nombre: string; rfc: string };

type Obligacion = {
  id:                 string;
  empresa_id:         string;
  tipo:               string;
  obligacion:         string;
  periodo:            string;
  fecha_limite_base:  string;
  fecha_limite:       string;
  fecha_presentacion: string | null;
  status:             'pendiente' | 'presentado' | 'vencido';
  notas:              string | null;
};

type FiltroStatus = 'todos' | 'pendiente' | 'presentado' | 'vencido';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const TIPO_LABEL: Record<string, { label: string; color: string }> = {
  iva:             { label: 'IVA',             color: 'bg-blue-100 text-blue-700' },
  isr_mensual:     { label: 'ISR RESICO',      color: 'bg-purple-100 text-purple-700' },
  isr_provisional: { label: 'ISR provisional', color: 'bg-indigo-100 text-indigo-700' },
  diot:            { label: 'DIOT',            color: 'bg-orange-100 text-orange-700' },
  anual_pm:        { label: 'Anual PM',        color: 'bg-pink-100 text-pink-700' },
  anual_pf:        { label: 'Anual PF',        color: 'bg-pink-100 text-pink-700' },
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pendiente:  { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  presentado: { label: 'Presentado', color: 'bg-green-100 text-green-700 border-green-200' },
  vencido:    { label: 'Vencido',    color: 'bg-red-100 text-red-600 border-red-200' },
};

export default function CalendarioFiscalPage() {
  const hoy = new Date();
  const [empresas,      setEmpresas]      = useState<Empresa[]>([]);
  const [obligaciones,  setObligaciones]  = useState<Obligacion[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [mes,           setMes]           = useState(hoy.getMonth());   // 0-11
  const [anio,          setAnio]          = useState(hoy.getFullYear());
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('todas');
  const [filtroStatus,  setFiltroStatus]  = useState<FiltroStatus>('todos');
  const [toast,         setToast]         = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null);
  const [actualizando,  setActualizando]  = useState<string | null>(null);

  const mostrarToast = (msg: string, tipo: 'ok' | 'err') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  // Cargar empresas una sola vez
  useEffect(() => {
    async function cargarEmpresas() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('empresas_clientes')
        .select('id, nombre, rfc')
        .eq('activa', true)
        .order('nombre');
      setEmpresas(data ?? []);
    }
    cargarEmpresas();
  }, []);

  // Cargar obligaciones del mes seleccionado
  useEffect(() => {
    async function cargarObligaciones() {
      setLoading(true);
      // Rango: primer día del mes anterior al siguiente día del mes siguiente
      // (así captamos obligaciones del mes actual cuyo vencimiento cae en el siguiente).
      const inicio = new Date(anio, mes, 1).toISOString().slice(0, 10);
      const finObj = new Date(anio, mes + 2, 0);  // último día del mes siguiente
      const fin    = finObj.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('calendario_obligaciones')
        .select('id, empresa_id, tipo, obligacion, periodo, fecha_limite_base, fecha_limite, fecha_presentacion, status, notas')
        .gte('fecha_limite', inicio)
        .lte('fecha_limite', fin)
        .order('fecha_limite', { ascending: true });

      if (error) {
        mostrarToast(`Error cargando obligaciones: ${error.message}`, 'err');
        setObligaciones([]);
      } else {
        setObligaciones((data ?? []) as Obligacion[]);
      }
      setLoading(false);
    }
    cargarObligaciones();
  }, [mes, anio]);

  const empresaMap = useMemo(
    () => new Map(empresas.map(e => [e.id, e])),
    [empresas],
  );

  const filtradas = useMemo(() => {
    return obligaciones.filter(o => {
      if (filtroEmpresa !== 'todas' && o.empresa_id !== filtroEmpresa) return false;
      if (filtroStatus !== 'todos' && o.status !== filtroStatus) return false;
      return true;
    });
  }, [obligaciones, filtroEmpresa, filtroStatus]);

  const stats = useMemo(() => {
    const c = { pendientes: 0, presentadas: 0, vencidas: 0 };
    for (const o of filtradas) {
      if (o.status === 'pendiente')  c.pendientes++;
      if (o.status === 'presentado') c.presentadas++;
      if (o.status === 'vencido')    c.vencidas++;
    }
    return c;
  }, [filtradas]);

  // Agrupar por fecha_limite para renderizar timeline
  const grupos = useMemo(() => {
    const map = new Map<string, Obligacion[]>();
    for (const o of filtradas) {
      const key = o.fecha_limite;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtradas]);

  const navegarMes = (delta: number) => {
    const nuevo = new Date(anio, mes + delta, 1);
    setMes(nuevo.getMonth());
    setAnio(nuevo.getFullYear());
  };

  const marcarPresentado = async (obligacion: Obligacion) => {
    if (obligacion.status === 'presentado') return;
    setActualizando(obligacion.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setActualizando(null); return; }

    const { error } = await supabase
      .from('calendario_obligaciones')
      .update({
        status:             'presentado',
        fecha_presentacion: new Date().toISOString().slice(0, 10),
        presentado_por:     user.id,
      })
      .eq('id', obligacion.id);

    if (error) {
      mostrarToast(`No se pudo marcar: ${error.message}`, 'err');
    } else {
      setObligaciones(prev => prev.map(o =>
        o.id === obligacion.id
          ? { ...o, status: 'presentado', fecha_presentacion: new Date().toISOString().slice(0, 10) }
          : o
      ));
      mostrarToast('Marcada como presentada', 'ok');
    }
    setActualizando(null);
  };

  const formatoFecha = (iso: string): string => {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-MX', {
      weekday: 'short', day: '2-digit', month: 'short',
    });
  };

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.tipo === 'ok' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <h1 className="text-xl font-bold text-[#333333] mb-1">Calendario fiscal</h1>
      <p className="text-sm text-gray-400 mb-6">
        Vencimientos ajustados por Art. 12 CFF — si el día límite cae en inhábil, se recorre al siguiente hábil
      </p>

      {/* Controles: navegación mes + filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navegarMes(-1)}
              className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500"
              aria-label="Mes anterior"
            >
              ←
            </button>
            <div className="text-lg font-bold text-[#1B3A6B] min-w-[140px] text-center">
              {MESES[mes]} {anio}
            </div>
            <button
              onClick={() => navegarMes(1)}
              className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500"
              aria-label="Mes siguiente"
            >
              →
            </button>
            <button
              onClick={() => { setMes(hoy.getMonth()); setAnio(hoy.getFullYear()); }}
              className="ml-2 text-xs font-semibold text-[#1B3A6B] hover:text-[#00A651] px-2 py-1"
            >
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filtroEmpresa}
              onChange={e => setFiltroEmpresa(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
            >
              <option value="todas">Todas las empresas</option>
              {empresas.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value as FiltroStatus)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="presentado">Presentadas</option>
              <option value="vencido">Vencidas</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <StatCard label="Pendientes" value={stats.pendientes} color="text-yellow-600"  />
          <StatCard label="Presentadas" value={stats.presentadas} color="text-green-600"  />
          <StatCard label="Vencidas"   value={stats.vencidas}   color="text-red-500"    />
        </div>
      </div>

      {/* Timeline de obligaciones */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
        </div>
      ) : grupos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-3xl mb-3">📅</div>
          <p className="text-sm text-gray-400">
            Sin obligaciones en {MESES[mes]} {anio}
            {filtroEmpresa !== 'todas' && ' para esta empresa'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map(([fecha, items]) => (
            <div key={fecha} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-bold text-[#1B3A6B]">
                  {formatoFecha(fecha)}
                </span>
                <span className="text-xs text-gray-400">
                  {items.length} {items.length === 1 ? 'obligación' : 'obligaciones'}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map(o => {
                  const empresa = empresaMap.get(o.empresa_id);
                  const tipoInfo = TIPO_LABEL[o.tipo] ?? { label: o.tipo, color: 'bg-gray-100 text-gray-600' };
                  const statusInfo = STATUS_BADGE[o.status];
                  const recorrida = o.fecha_limite !== o.fecha_limite_base;

                  return (
                    <div key={o.id} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tipoInfo.color}`}>
                            {tipoInfo.label}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {recorrida && (
                            <span className="text-xs text-gray-400" title={`Fecha original: ${o.fecha_limite_base}`}>
                              · Art. 12 CFF aplicado
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-[#333333]">{o.obligacion}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {empresa?.nombre ?? 'Empresa desconocida'}
                          {empresa && <span className="font-mono ml-2">{empresa.rfc}</span>}
                          {o.fecha_presentacion && (
                            <span className="text-green-600 ml-2">
                              · presentada el {o.fecha_presentacion}
                            </span>
                          )}
                        </div>
                      </div>

                      {o.status !== 'presentado' && (
                        <button
                          onClick={() => marcarPresentado(o)}
                          disabled={actualizando === o.id}
                          className="bg-[#00A651] hover:bg-[#008F45] disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap"
                        >
                          {actualizando === o.id ? '...' : 'Marcar presentada'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

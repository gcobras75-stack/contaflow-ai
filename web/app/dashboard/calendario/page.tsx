'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Empresa = { id: string; nombre: string; rfc: string; giro: string | null };

type Obligacion = {
  titulo:       string;
  descripcion:  string;
  fechaLimite:  Date;
  color:        string;
  icono:        string;
  empresas:     string[];
};

const MESES = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic',
];

function calcularObligaciones(empresas: Empresa[], anio: number, mes: number): Obligacion[] {
  if (empresas.length === 0) return [];
  const nombreEmpresas = empresas.map(e => e.nombre);

  // Día 17 del siguiente mes (si el 17 cae sábado o domingo, se recorre al lunes)
  const ajustarDia17 = (a: number, m: number): Date => {
    const d = new Date(a, m, 17); // m ya es 0-indexed para next month
    const dow = d.getDay();
    if (dow === 6) d.setDate(19);       // sábado → lunes
    else if (dow === 0) d.setDate(18);  // domingo → lunes
    return d;
  };

  // Mes actual (0-indexed para Date)
  const mesActual = mes - 1;
  const diaLimite = ajustarDia17(mesActual === 11 ? anio + 1 : anio, mesActual === 11 ? 0 : mesActual + 1);

  const obligaciones: Obligacion[] = [
    {
      titulo:      'Declaración mensual IVA',
      descripcion: `IVA de ${MESES[mesActual]} ${anio} — presentar a más tardar el día 17`,
      fechaLimite: diaLimite,
      color:       '#1B3A6B',
      icono:       '📊',
      empresas:    nombreEmpresas,
    },
    {
      titulo:      'DIOT',
      descripcion: `Declaración Informativa de Operaciones con Terceros — operaciones de ${MESES[mesActual]}`,
      fechaLimite: diaLimite,
      color:       '#7C3AED',
      icono:       '📋',
      empresas:    nombreEmpresas,
    },
    {
      titulo:      'Declaración mensual ISR',
      descripcion: `Pagos provisionales ISR — ${MESES[mesActual]} ${anio}`,
      fechaLimite: diaLimite,
      color:       '#059669',
      icono:       '📈',
      empresas:    nombreEmpresas,
    },
  ];

  // Declaración anual — solo en enero/febrero/marzo/abril
  if (mes >= 1 && mes <= 4) {
    const limiteAnual = new Date(anio, 3, 30); // 30 de abril
    obligaciones.push({
      titulo:      `Declaración anual ISR ${anio - 1}`,
      descripcion: `Declaración anual del ejercicio ${anio - 1} — personas morales al 31 de marzo, físicas al 30 de abril`,
      fechaLimite: limiteAnual,
      color:       '#DC2626',
      icono:       '📅',
      empresas:    nombreEmpresas,
    });
  }

  // IMSS/INFONAVIT — bimestral (meses pares)
  if (mes % 2 === 0) {
    const limiteBim = new Date(anio, mesActual + 1, 17);
    obligaciones.push({
      titulo:      'Cuotas IMSS / INFONAVIT',
      descripcion: `Pago bimestral de cuotas obrero-patronales — bimestre ${Math.ceil(mes/2)}`,
      fechaLimite: limiteBim,
      color:       '#D97706',
      icono:       '🏥',
      empresas:    nombreEmpresas,
    });
  }

  return obligaciones.sort((a, b) => a.fechaLimite.getTime() - b.fechaLimite.getTime());
}

function diasRestantes(fecha: Date): number {
  return Math.ceil((fecha.getTime() - Date.now()) / 86400000);
}

function semaforo(dias: number): { bg: string; text: string; label: string } {
  if (dias < 0)  return { bg: '#FFF1F2', text: '#DC2626', label: 'Vencida' };
  if (dias <= 3) return { bg: '#FFF1F2', text: '#DC2626', label: `${dias}d` };
  if (dias <= 7) return { bg: '#FFFBEB', text: '#D97706', label: `${dias}d` };
  return          { bg: '#F0FDF4', text: '#16A34A', label: `${dias}d` };
}

export default function CalendarioPage() {
  const hoy = new Date();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading]   = useState(true);
  const [mes, setMes]           = useState(hoy.getMonth() + 1);
  const [anio, setAnio]         = useState(hoy.getFullYear());

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: usr } = await supabase.from('usuarios').select('despacho_id').eq('id', user.id).single();
      if (!usr?.despacho_id) { setLoading(false); return; }
      const { data } = await supabase
        .from('empresas_clientes').select('id, nombre, rfc, giro')
        .eq('despacho_id', usr.despacho_id).eq('activa', true);
      setEmpresas(data ?? []);
      setLoading(false);
    }
    init();
  }, []);

  const obligaciones = calcularObligaciones(empresas, anio, mes);
  const anios = [hoy.getFullYear(), hoy.getFullYear() - 1];

  const vencidas   = obligaciones.filter(o => diasRestantes(o.fechaLimite) < 0).length;
  const urgentes   = obligaciones.filter(o => { const d = diasRestantes(o.fechaLimite); return d >= 0 && d <= 7; }).length;
  const alCorriente = obligaciones.filter(o => diasRestantes(o.fechaLimite) > 7).length;

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-[#333333]">Calendario Fiscal</h1>
        <div className="flex gap-2">
          <select
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
          >
            {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select
            value={anio}
            onChange={e => setAnio(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
          >
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-5">
        Obligaciones fiscales para tus {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} cliente
      </p>

      {/* Resumen */}
      {!loading && obligaciones.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Vencidas',    n: vencidas,    bg: '#FFF1F2', text: '#DC2626' },
            { label: 'Esta semana', n: urgentes,    bg: '#FFFBEB', text: '#D97706' },
            { label: 'Al corriente',n: alCorriente, bg: '#F0FDF4', text: '#16A34A' },
          ].map(s => (
            <div key={s.label} style={{ backgroundColor: s.bg }} className="rounded-xl border border-gray-100 p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: s.text }}>{s.n}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
        </div>
      ) : empresas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-3xl mb-3">📅</div>
          <p className="text-sm text-gray-400">Sin empresas cliente — agrega una para ver su calendario fiscal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {obligaciones.map((o, i) => {
            const dias = diasRestantes(o.fechaLimite);
            const sem  = semaforo(dias);
            return (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4 hover:shadow-sm transition">
                <div className="text-2xl mt-0.5">{o.icono}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[#333333]">{o.titulo}</h3>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: sem.bg, color: sem.text }}
                    >
                      {dias < 0 ? 'Vencida' : dias === 0 ? 'Hoy' : `${dias} días`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{o.descripcion}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Límite:</span>
                    <span className="text-xs font-semibold" style={{ color: sem.text }}>
                      {o.fechaLimite.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {o.empresas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {o.empresas.slice(0, 5).map((emp, j) => (
                        <span key={j} className="text-xs bg-[#EEF2FA] text-[#1B3A6B] px-2 py-0.5 rounded-full font-medium">
                          {emp}
                        </span>
                      ))}
                      {o.empresas.length > 5 && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          +{o.empresas.length - 5} más
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <div
                    className="w-3 h-3 rounded-full mt-1"
                    style={{ backgroundColor: sem.text }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-300 text-center mt-6">
        Fechas calculadas conforme al artículo 12 del CFF — si el día 17 cae en sábado o domingo, el límite se recorre al lunes siguiente.
      </p>
    </div>
  );
}

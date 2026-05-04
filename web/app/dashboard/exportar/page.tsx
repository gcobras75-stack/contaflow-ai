'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ── Tipos ────────────────────────────────────────────────────────────────────
type CFDI = {
  id: string;
  uuid_sat: string | null;
  tipo: string | null;
  subtotal: number | null;
  iva: number | null;
  total: number | null;
  fecha_emision: string | null;
  status: string;
  rfc_emisor: string | null;
  rfc_receptor: string | null;
  fuente: string | null;
};

type Empresa = { id: string; nombre: string; rfc: string };

const fmt = (n: number | null) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

// ── Catálogo de cuentas SAT simplificado ─────────────────────────────────────
const CTA = {
  clientes:       { num: '105.01', desc: 'Clientes nacionales' },
  proveedores:    { num: '201.01', desc: 'Proveedores nacionales' },
  nominaPagar:    { num: '201.02', desc: 'Nómina por pagar' },
  bancos:         { num: '102.01', desc: 'Bancos' },
  ventas:         { num: '401.01', desc: 'Ventas y/o servicios' },
  gastosAdmin:    { num: '601.01', desc: 'Gastos de administración' },
  sueldos:        { num: '602.01', desc: 'Sueldos y salarios' },
  ivaTrasladado:  { num: '208.01', desc: 'IVA trasladado cobrado' },
  ivaAcreditable: { num: '119.01', desc: 'IVA acreditable pagado' },
};

// ── Generador XML Pólizas SAT (Contabilidad Electrónica 1.3) ─────────────────
// Formato oficial que importa CONTPAQi, Aspel COI y la herramienta SAT.
function generarPolizasXML(cfdis: CFDI[], empresa: Empresa, mes: number, anio: number): string {
  const mesStr  = String(mes).padStart(2, '0');
  const anioStr = String(anio);

  const polizas = cfdis.map((c, idx) => {
    const fecha    = c.fecha_emision ?? `${anioStr}-${mesStr}-01`;
    const uuid     = c.uuid_sat ?? '';
    const subtotal = Number(c.subtotal ?? 0).toFixed(2);
    const iva      = Number(c.iva ?? 0).toFixed(2);
    const total    = Number(c.total ?? 0).toFixed(2);
    const rfcContra = c.tipo === 'ingreso' ? (c.rfc_receptor ?? 'XAXX010101000')
                    : c.tipo === 'egreso'  ? (c.rfc_emisor   ?? 'XAXX010101000')
                    : 'XAXX010101000';
    const concepto = `${(c.tipo ?? 'cfdi').toUpperCase()} ${uuid.slice(0, 8).toUpperCase()}`;
    const numPol   = String(idx + 1).padStart(4, '0');

    let transacciones = '';

    if (c.tipo === 'ingreso') {
      transacciones = `
      <PLZ:Transaccion NumCta="${CTA.clientes.num}" DesCta="${CTA.clientes.desc}" Concepto="${concepto}" Debe="${total}" Haber="0.00">
        <PLZ:ComprNal UUID_CFDI="${uuid}" MontoTotal="${total}" RFC="${rfcContra}" MetPago="PUE" Moneda="MXN" />
      </PLZ:Transaccion>
      <PLZ:Transaccion NumCta="${CTA.ventas.num}" DesCta="${CTA.ventas.desc}" Concepto="${concepto}" Debe="0.00" Haber="${subtotal}" />
      <PLZ:Transaccion NumCta="${CTA.ivaTrasladado.num}" DesCta="${CTA.ivaTrasladado.desc}" Concepto="${concepto}" Debe="0.00" Haber="${iva}" />`;
    } else if (c.tipo === 'egreso') {
      transacciones = `
      <PLZ:Transaccion NumCta="${CTA.gastosAdmin.num}" DesCta="${CTA.gastosAdmin.desc}" Concepto="${concepto}" Debe="${subtotal}" Haber="0.00">
        <PLZ:ComprNal UUID_CFDI="${uuid}" MontoTotal="${total}" RFC="${rfcContra}" MetPago="PUE" Moneda="MXN" />
      </PLZ:Transaccion>
      <PLZ:Transaccion NumCta="${CTA.ivaAcreditable.num}" DesCta="${CTA.ivaAcreditable.desc}" Concepto="${concepto}" Debe="${iva}" Haber="0.00" />
      <PLZ:Transaccion NumCta="${CTA.proveedores.num}" DesCta="${CTA.proveedores.desc}" Concepto="${concepto}" Debe="0.00" Haber="${total}" />`;
    } else if (c.tipo === 'nomina') {
      transacciones = `
      <PLZ:Transaccion NumCta="${CTA.sueldos.num}" DesCta="${CTA.sueldos.desc}" Concepto="${concepto}" Debe="${total}" Haber="0.00" />
      <PLZ:Transaccion NumCta="${CTA.nominaPagar.num}" DesCta="${CTA.nominaPagar.desc}" Concepto="${concepto}" Debe="0.00" Haber="${total}" />`;
    } else {
      // pago / traslado
      transacciones = `
      <PLZ:Transaccion NumCta="${CTA.proveedores.num}" DesCta="${CTA.proveedores.desc}" Concepto="${concepto}" Debe="${total}" Haber="0.00">
        <PLZ:ComprNal UUID_CFDI="${uuid}" MontoTotal="${total}" RFC="${rfcContra}" MetPago="PUE" Moneda="MXN" />
      </PLZ:Transaccion>
      <PLZ:Transaccion NumCta="${CTA.bancos.num}" DesCta="${CTA.bancos.desc}" Concepto="${concepto}" Debe="0.00" Haber="${total}" />`;
    }

    return `  <PLZ:Poliza NumUnIdenPol="${numPol}" Fecha="${fecha}" Concepto="${concepto}">${transacciones}
  </PLZ:Poliza>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<PLZ:Polizas
  xmlns:PLZ="http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/PolizasPeriodo"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/PolizasPeriodo http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/PolizasPeriodo/PolizasPeriodo.xsd"
  Version="1.3"
  RFC="${empresa.rfc.toUpperCase()}"
  Mes="${mesStr}"
  Anio="${anioStr}"
  TipoSolicitud="AF"
  NumOrden=""
  NumTramite=""
  Sello=""
  NoCertificado=""
  Certificado=""
>
${polizas.join('\n')}
</PLZ:Polizas>`;
}

// ── Generador DIOT (.txt) ────────────────────────────────────────────────────
// Formato SAT para la Declaración Informativa de Operaciones con Terceros.
// Un registro por proveedor único por mes.
function generarDIOT(cfdis: CFDI[], empresa: Empresa): string {
  // Solo egresos (compras donde pagamos IVA)
  const egresos = cfdis.filter(c => c.tipo === 'egreso' && c.rfc_emisor);

  // Agrupar por RFC del proveedor
  const porRfc = new Map<string, { subtotal: number; iva: number; total: number }>();
  for (const c of egresos) {
    const rfc = c.rfc_emisor!;
    const prev = porRfc.get(rfc) ?? { subtotal: 0, iva: 0, total: 0 };
    porRfc.set(rfc, {
      subtotal: prev.subtotal + Number(c.subtotal ?? 0),
      iva:      prev.iva      + Number(c.iva ?? 0),
      total:    prev.total    + Number(c.total ?? 0),
    });
  }

  const lineas: string[] = [];

  // Encabezado informativo (no parte del formato SAT, solo referencia)
  lineas.push(`# DIOT — ${empresa.nombre} (${empresa.rfc}) — Generado por ContaFlow AI`);
  lineas.push(`# Formato: TipoTercero|RFC|IVA_16%|Valor_Actos_16%|IVA_0%|Valor_Actos_0%|Exentos|ImportacionGravada16|IVA_Import16|ImportGravada0|IVA_Import0|ImpNoDeducible`);
  lineas.push('');

  for (const [rfc, montos] of porRfc.entries()) {
    const tipoTercero = rfc.length === 12 ? '04' : '05'; // 12 chars = PM, <12 = PF
    const iva16     = montos.iva.toFixed(2);
    const base16    = montos.subtotal.toFixed(2);

    // Campos del formato DIOT (campos vacíos = 0 o en blanco según SAT)
    const campos = [
      tipoTercero, // Tipo de tercero (04=PM, 05=PF)
      rfc,         // RFC
      '',          // Nombre (opcional en archivo, lo llena el contador)
      'MEX',       // País
      '',          // Nationalidad extranjero
      '',          // RFC extranjero
      iva16,       // IVA pagado al 16%
      base16,      // Valor actos gravados 16%
      '0',         // IVA pagado al 0%
      '0',         // Valor actos 0%
      '0',         // Actos exentos
      '0',         // Import gravada 16%
      '0',         // IVA importación 16%
      '0',         // Import gravada 0%
      '0',         // IVA importación 0%
      '0',         // Importación exenta
      '0',         // No deducible
    ];
    lineas.push(campos.join('|'));
  }

  return lineas.join('\n');
}

// ── Generador CSV ─────────────────────────────────────────────────────────────
function generarCSV(cfdis: CFDI[]): string {
  const cab = 'UUID,Tipo,Fecha,Subtotal,IVA,Total,RFC_Emisor,RFC_Receptor,Fuente,Status';
  const rows = cfdis.map(c =>
    [
      c.uuid_sat ?? '',
      c.tipo ?? '',
      c.fecha_emision ?? '',
      c.subtotal ?? 0,
      c.iva ?? 0,
      c.total ?? 0,
      c.rfc_emisor ?? '',
      c.rfc_receptor ?? '',
      c.fuente ?? '',
      c.status,
    ].join(',')
  );
  return [cab, ...rows].join('\n');
}

// ── Descargador ───────────────────────────────────────────────────────────────
function descargar(contenido: string, nombre: string, tipo: string) {
  const blob = new Blob([contenido], { type: tipo });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function ExportarPage() {
  const hoy  = new Date();
  const [empresas, setEmpresas]           = useState<Empresa[]>([]);
  const [empresaSel, setEmpresaSel]       = useState('');
  const [cfdis, setCfdis]                 = useState<CFDI[]>([]);
  const [loading, setLoading]             = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [mes, setMes]                     = useState(hoy.getMonth() + 1);
  const [anio, setAnio]                   = useState(hoy.getFullYear());
  const [toast, setToast]                 = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: usr } = await supabase.from('usuarios').select('despacho_id').eq('id', user.id).single();
      if (!usr?.despacho_id) { setLoadingEmpresas(false); return; }
      const { data } = await supabase
        .from('empresas_clientes').select('id, nombre, rfc')
        .eq('despacho_id', usr.despacho_id).eq('activa', true);
      setEmpresas(data ?? []);
      setLoadingEmpresas(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!empresaSel) { setCfdis([]); return; }
    setLoading(true);
    const inicioMes = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const finMes    = new Date(anio, mes, 0).toISOString().slice(0, 10); // último día
    supabase
      .from('cfdis')
      .select('*')
      .eq('empresa_id', empresaSel)
      .gte('fecha_emision', inicioMes)
      .lte('fecha_emision', finMes)
      .eq('status', 'aprobado')
      .order('fecha_emision', { ascending: true })
      .then(({ data }) => { setCfdis(data ?? []); setLoading(false); });
  }, [empresaSel, mes, anio]);

  const mostrarToast = (msg: string, tipo: 'ok' | 'err') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  const empresa = empresas.find(e => e.id === empresaSel);

  const totales = cfdis.reduce(
    (acc, c) => ({
      ingresos: acc.ingresos + (c.tipo === 'ingreso' ? Number(c.total ?? 0) : 0),
      egresos:  acc.egresos  + (c.tipo === 'egreso'  ? Number(c.total ?? 0) : 0),
      iva:      acc.iva      + Number(c.iva ?? 0),
      count:    acc.count + 1,
    }),
    { ingresos: 0, egresos: 0, iva: 0, count: 0 }
  );

  const handlePolizas = () => {
    if (!empresa || cfdis.length === 0) { mostrarToast('Sin CFDIs para este período', 'err'); return; }
    const xml = generarPolizasXML(cfdis, empresa, mes, anio);
    descargar(xml, `polizas_${empresa.rfc}_${anio}${String(mes).padStart(2,'0')}.xml`, 'application/xml;charset=utf-8');
    mostrarToast(`${cfdis.length} pólizas generadas — listo para importar en CONTPAQi`, 'ok');
  };

  const handleDIOT = () => {
    if (!empresa) { mostrarToast('Selecciona una empresa', 'err'); return; }
    const egresos = cfdis.filter(c => c.tipo === 'egreso');
    if (egresos.length === 0) { mostrarToast('Sin facturas de egreso en este período', 'err'); return; }
    const txt = generarDIOT(cfdis, empresa);
    descargar(txt, `DIOT_${empresa.rfc}_${anio}${String(mes).padStart(2,'0')}.txt`, 'text/plain;charset=utf-8');
    mostrarToast(`DIOT generada con ${egresos.length} proveedores`, 'ok');
  };

  const handleCSV = () => {
    if (!empresa || cfdis.length === 0) { mostrarToast('Sin CFDIs para este período', 'err'); return; }
    const csv = generarCSV(cfdis);
    descargar(csv, `contaflow_${empresa.rfc}_${anio}${String(mes).padStart(2,'0')}.csv`, 'text/csv;charset=utf-8');
    mostrarToast(`${cfdis.length} CFDIs exportados como CSV`, 'ok');
  };

  // Años disponibles: año actual y 3 años atrás
  const aniosDisponibles = [hoy.getFullYear(), hoy.getFullYear()-1, hoy.getFullYear()-2, hoy.getFullYear()-3];

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.tipo === 'ok' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <h1 className="text-xl font-bold text-[#333333] mb-1">Exportar</h1>
      <p className="text-sm text-gray-400 mb-6">Genera pólizas contables, DIOT y reportes para CONTPAQi o Aspel</p>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Empresa</label>
            <select
              value={empresaSel}
              onChange={e => setEmpresaSel(e.target.value)}
              disabled={loadingEmpresas}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
            >
              <option value="">— Selecciona —</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mes</label>
            <select
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
            >
              {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Año</label>
            <select
              value={anio}
              onChange={e => setAnio(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
            >
              {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {empresa && (
          <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
            <span className="font-semibold text-gray-500">{empresa.nombre}</span>
            <span>·</span>
            <span className="font-mono">{empresa.rfc}</span>
            <span>·</span>
            <span>{MESES[mes-1]} {anio}</span>
          </div>
        )}
      </div>

      {/* Resumen del período */}
      {empresaSel && !loading && cfdis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'CFDIs aprobados', val: String(totales.count),         color: 'text-[#1B3A6B]' },
            { label: 'Ingresos',        val: fmt(totales.ingresos),         color: 'text-green-600'  },
            { label: 'Egresos',         val: fmt(totales.egresos),          color: 'text-red-500'    },
            { label: 'IVA neto',        val: fmt(totales.iva),              color: 'text-gray-600'   },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className={`text-lg font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Botones de exportación */}
      {empresaSel && (
        <div className="space-y-3 mb-5">

          {/* Sección CONTPAQi */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wide text-[#1B3A6B]">Software contable</span>
              <span className="text-xs bg-[#EEF2FA] text-[#1B3A6B] px-2 py-0.5 rounded-full font-semibold">CONTPAQi · Aspel COI</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Formatos oficiales listos para importar directamente en el software del contador</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ExportBtn
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                titulo="Pólizas contables XML"
                desc={`Formato SAT Contabilidad Electrónica 1.3 — ${cfdis.length} pólizas con soporte CFDI`}
                badge="Recomendado"
                badgeColor="bg-green-100 text-green-700"
                onClick={handlePolizas}
                disabled={cfdis.length === 0}
              />
              <ExportBtn
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                titulo="DIOT"
                desc={`Declaración Informativa de Operaciones con Terceros — ${cfdis.filter(c=>c.tipo==='egreso').length} proveedores`}
                badge=".txt SAT"
                badgeColor="bg-blue-100 text-blue-700"
                onClick={handleDIOT}
                disabled={cfdis.filter(c => c.tipo === 'egreso').length === 0}
              />
            </div>
          </div>

          {/* Sección reportes */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Reportes generales</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Para análisis, respaldo o compartir con el cliente</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ExportBtn
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                }
                titulo="CSV completo"
                desc="Todos los campos del CFDI — abre en Excel, Google Sheets, Power BI"
                onClick={handleCSV}
                disabled={cfdis.length === 0}
              />
            </div>
          </div>
        </div>
      )}

      {/* Lista preview */}
      {!empresaSel ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-3xl mb-3">📂</div>
          <p className="text-sm text-gray-400">Selecciona una empresa y período para previsualizar los CFDIs</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
        </div>
      ) : cfdis.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-3xl mb-3">📭</div>
          <p className="text-sm text-gray-400">Sin CFDIs aprobados en {MESES[mes-1]} {anio}</p>
          <p className="text-xs text-gray-300 mt-1">Solo se exportan CFDIs con estado "aprobado"</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">Vista previa — {cfdis.length} registros</span>
            <span className="text-xs text-gray-400">{MESES[mes-1]} {anio}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left font-semibold">UUID</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold">RFC Contraparte</th>
                  <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
                  <th className="px-4 py-3 text-right font-semibold">IVA</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cfdis.slice(0, 25).map(c => {
                  const contraparte = c.tipo === 'ingreso' ? c.rfc_receptor : c.rfc_emisor;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{(c.uuid_sat ?? '—').slice(0,16)}…</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          c.tipo === 'ingreso' ? 'bg-green-100 text-green-700' :
                          c.tipo === 'egreso'  ? 'bg-red-100 text-red-600' :
                          c.tipo === 'nomina'  ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{c.tipo}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{c.fecha_emision ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{contraparte ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600 text-xs">{fmt(c.subtotal)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{fmt(c.iva)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-[#1B3A6B] text-xs">{fmt(c.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {cfdis.length > 25 && (
              <p className="text-xs text-gray-400 text-center py-3 border-t border-gray-50">
                Mostrando 25 de {cfdis.length} — la exportación incluye todos
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Botón de exportación ──────────────────────────────────────────────────────
function ExportBtn({ icon, titulo, desc, badge, badgeColor, onClick, disabled }: {
  icon: React.ReactNode;
  titulo: string;
  desc: string;
  badge?: string;
  badgeColor?: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-start gap-3 p-4 border-2 border-gray-100 hover:border-[#1B3A6B] hover:bg-[#F8FAFF] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition text-left group w-full"
    >
      <div className="w-10 h-10 rounded-lg bg-[#EEF2FA] group-hover:bg-[#1B3A6B] flex items-center justify-center shrink-0 transition text-[#1B3A6B] group-hover:text-white">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-sm text-[#333333] group-hover:text-[#1B3A6B] transition">{titulo}</span>
          {badge && <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${badgeColor}`}>{badge}</span>}
        </div>
        <span className="text-xs text-gray-400 leading-relaxed">{desc}</span>
      </div>
      <svg className="w-4 h-4 text-gray-300 group-hover:text-[#1B3A6B] shrink-0 mt-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </button>
  );
}

'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Empresa = {
  id: string;
  nombre: string;
  rfc: string;
  giro: string | null;
  activa: boolean;
  fiel_disponible: boolean;
  sat_ultima_sync: string | null;
  sat_auto_sync: boolean;
};

type CFDI = {
  id: string;
  uuid_sat: string | null;
  tipo: string | null;
  total: number | null;
  iva: number | null;
  fecha_emision: string | null;
  status: string;
  fuente: string | null;
  rfc_emisor: string | null;
  rfc_receptor: string | null;
};

type EstadoCuenta = {
  id: string;
  banco: string | null;
  periodo: string | null;
  status: string;
  created_at: string;
};

const fmt = (n: number | null) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const STATUS_CFDI: Record<string, { label: string; badge: string; text: string }> = {
  pendiente: { label: 'Pendiente', badge: 'bg-yellow-100', text: 'text-yellow-700' },
  aprobado:  { label: 'Aprobado',  badge: 'bg-green-100',  text: 'text-green-700'  },
  rechazado: { label: 'Rechazado', badge: 'bg-red-100',    text: 'text-red-700'    },
};

const FUENTE_LABEL: Record<string, string> = {
  manual:         'Manual',
  xml:            'XML',
  sat_emitidos:   'SAT ↑',
  sat_recibidos:  'SAT ↓',
};

// ── Parsear XML CFDI en el cliente ──────────────────────────────────────────
function attr(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`(?:^|\\s)${name}="([^"]+)"`, 'i'));
  return m ? m[1] : null;
}

function parseCfdiXmlClient(xml: string) {
  const TIPO_MAP: Record<string, string> = {
    I: 'ingreso', E: 'egreso', N: 'nomina', T: 'traslado', P: 'pago',
  };
  const uuid       = attr(xml, 'UUID')?.toLowerCase() ?? null;
  const tipoRaw    = attr(xml, 'TipoDeComprobante');
  const tipo       = tipoRaw ? (TIPO_MAP[tipoRaw.toUpperCase()] ?? null) : null;
  const subtotal   = parseFloat(attr(xml, 'SubTotal') ?? '0') || 0;
  const total      = parseFloat(attr(xml, 'Total') ?? '0') || 0;
  const ivaRaw     = attr(xml, 'TotalImpuestosTrasladados');
  const iva        = ivaRaw ? parseFloat(ivaRaw) : 0;
  const fechaRaw   = attr(xml, 'Fecha');
  const fecha      = fechaRaw ? fechaRaw.slice(0, 10) : null;
  const emisorM    = xml.match(/(?:cfdi:)?Emisor[^>]*\s+Rfc="([^"]+)"/i);
  const receptorM  = xml.match(/(?:cfdi:)?Receptor[^>]*\s+Rfc="([^"]+)"/i);
  return {
    uuid, tipo, subtotal, iva, total, fecha,
    rfc_emisor:   emisorM?.[1]?.toUpperCase() ?? null,
    rfc_receptor: receptorM?.[1]?.toUpperCase() ?? null,
  };
}

// ── Componente principal ─────────────────────────────────────────────────────
function EmpresaDetalleContent() {
  const params    = useSearchParams();
  const empresaId = params.get('id');

  const [empresa, setEmpresa]   = useState<Empresa | null>(null);
  const [cfdis, setCfdis]       = useState<CFDI[]>([]);
  const [estados, setEstados]   = useState<EstadoCuenta[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'cfdis' | 'estados' | 'sat'>('cfdis');
  const [accionando, setAccionando] = useState<string | null>(null);

  // ── FIEL upload ───────────────────────────────────────────────────────────
  const [fielCert, setFielCert] = useState<File | null>(null);
  const [fielKey,  setFielKey]  = useState<File | null>(null);
  const [fielPwd,  setFielPwd]  = useState('');
  const [subiendoFiel, setSubiendoFiel] = useState(false);
  const [fielMsg, setFielMsg]   = useState<{ ok: boolean; text: string } | null>(null);
  const certRef = useRef<HTMLInputElement>(null);
  const keyRef  = useRef<HTMLInputElement>(null);

  // ── SAT sync ──────────────────────────────────────────────────────────────
  const hoy   = new Date().toISOString().slice(0, 10);
  const hace3 = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const [satInicio, setSatInicio]   = useState(hace3);
  const [satFin,    setSatFin]      = useState(hoy);
  const [satTipo,   setSatTipo]     = useState<'emitidos' | 'recibidos' | 'ambos'>('ambos');
  const [sincronizando, setSincronizando] = useState(false);
  const [satPaso, setSatPaso]       = useState('');
  const [satResult, setSatResult]   = useState<{ importados: number; duplicados: number; errores: string[] } | null>(null);

  // ── XML upload ────────────────────────────────────────────────────────────
  const xmlRef = useRef<HTMLInputElement>(null);
  const [subiendoXml, setSubiendoXml] = useState(false);
  const [xmlMsg, setXmlMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Invitación ────────────────────────────────────────────────────────────
  const [invCodigo, setInvCodigo]       = useState<string | null>(null);
  const [generandoInv, setGenerandoInv] = useState(false);
  const [invCopiado, setInvCopiado]     = useState(false);

  // ── Auto-sync toggle ──────────────────────────────────────────────────────
  const [guardandoSync, setGuardandoSync] = useState(false);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    async function cargar() {
      const [empRes, cfdiRes, estadoRes] = await Promise.all([
        supabase.from('empresas_clientes').select('*').eq('id', empresaId).single(),
        supabase.from('cfdis').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
        supabase.from('estados_cuenta').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
      ]);
      setEmpresa(empRes.data);
      setCfdis(cfdiRes.data ?? []);
      setEstados(estadoRes.data ?? []);
      setLoading(false);
    }
    cargar();
  }, [empresaId]);

  // ── Aprobar / Rechazar CFDI ───────────────────────────────────────────────
  const cambiarStatus = async (cfdiId: string, nuevoStatus: 'aprobado' | 'rechazado') => {
    setAccionando(cfdiId);
    const { error } = await supabase.from('cfdis').update({ status: nuevoStatus }).eq('id', cfdiId);
    if (!error) setCfdis(prev => prev.map(c => c.id === cfdiId ? { ...c, status: nuevoStatus } : c));
    setAccionando(null);
  };

  // ── Subir FIEL ────────────────────────────────────────────────────────────
  const subirFiel = async () => {
    if (!fielCert || !fielKey || !fielPwd.trim() || !empresaId) return;
    setSubiendoFiel(true);
    setFielMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append('empresa_id', empresaId);
      fd.append('cert', fielCert);
      fd.append('key', fielKey);
      fd.append('password', fielPwd);
      const res = await fetch('/api/subir-fiel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: fd,
      });
      const json = await res.json() as { ok?: boolean; rfc?: string; error?: string };
      if (!res.ok || json.error) {
        setFielMsg({ ok: false, text: json.error ?? 'Error al subir FIEL' });
      } else {
        setFielMsg({ ok: true, text: `FIEL configurada correctamente para RFC ${json.rfc}` });
        setEmpresa(prev => prev ? { ...prev, fiel_disponible: true } : prev);
        setFielCert(null); setFielKey(null); setFielPwd('');
        if (certRef.current) certRef.current.value = '';
        if (keyRef.current)  keyRef.current.value  = '';
      }
    } catch (e) {
      setFielMsg({ ok: false, text: e instanceof Error ? e.message : 'Error de red' });
    }
    setSubiendoFiel(false);
  };

  // ── Sincronizar SAT ───────────────────────────────────────────────────────
  const sincronizarSAT = async () => {
    if (!empresaId) return;
    setSincronizando(true);
    setSatResult(null);
    setSatPaso('Autenticando con el SAT...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSatPaso('Solicitando descarga al SAT (puede tardar 1–2 minutos)...');
      const res = await fetch('/api/descargar-sat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ empresa_id: empresaId, fecha_inicio: satInicio, fecha_fin: satFin, tipo: satTipo }),
      });
      const json = await res.json() as { importados?: number; duplicados?: number; errores?: string[]; error?: string };
      if (!res.ok || json.error) {
        setSatResult({ importados: 0, duplicados: 0, errores: [json.error ?? 'Error desconocido'] });
      } else {
        setSatResult({ importados: json.importados ?? 0, duplicados: json.duplicados ?? 0, errores: json.errores ?? [] });
        // Recargar CFDIs
        const { data } = await supabase.from('cfdis').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false });
        setCfdis(data ?? []);
        setEmpresa(prev => prev ? { ...prev, sat_ultima_sync: new Date().toISOString() } : prev);
      }
    } catch (e) {
      setSatResult({ importados: 0, duplicados: 0, errores: [e instanceof Error ? e.message : 'Error de red'] });
    }
    setSatPaso('');
    setSincronizando(false);
  };

  // ── Generar invitación ────────────────────────────────────────────────────
  const generarInvitacion = async () => {
    if (!empresaId) return;
    setGenerandoInv(true);
    setInvCodigo(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/generar-invitacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ empresa_id: empresaId }),
      });
      const json = await res.json() as { codigo?: string; error?: string };
      if (json.codigo) setInvCodigo(json.codigo);
    } catch { /* silencioso */ }
    setGenerandoInv(false);
  };

  const copiarCodigo = async () => {
    if (!invCodigo) return;
    await navigator.clipboard.writeText(invCodigo);
    setInvCopiado(true);
    setTimeout(() => setInvCopiado(false), 2000);
  };

  // ── Toggle auto-sync ──────────────────────────────────────────────────────
  const toggleAutoSync = async () => {
    if (!empresaId || !empresa) return;
    setGuardandoSync(true);
    const nuevoValor = !empresa.sat_auto_sync;
    const { error } = await supabase
      .from('empresas_clientes')
      .update({ sat_auto_sync: nuevoValor })
      .eq('id', empresaId);
    if (!error) setEmpresa(prev => prev ? { ...prev, sat_auto_sync: nuevoValor } : prev);
    setGuardandoSync(false);
  };

  // ── Subir XML ─────────────────────────────────────────────────────────────
  const subirXml = async (files: FileList | null) => {
    if (!files || files.length === 0 || !empresaId) return;
    setSubiendoXml(true);
    setXmlMsg(null);
    let importados = 0;
    let errores = 0;
    for (const file of Array.from(files)) {
      try {
        const xml = await file.text();
        const cfdi = parseCfdiXmlClient(xml);
        if (!cfdi.uuid) { errores++; continue; }
        const { error } = await supabase.from('cfdis').upsert({
          empresa_id:   empresaId,
          uuid_sat:     cfdi.uuid,
          tipo:         cfdi.tipo,
          subtotal:     cfdi.subtotal,
          iva:          cfdi.iva,
          total:        cfdi.total,
          fecha_emision: cfdi.fecha,
          fuente:       'xml',
          rfc_emisor:   cfdi.rfc_emisor,
          rfc_receptor: cfdi.rfc_receptor,
          status:       'pendiente',
        }, { onConflict: 'uuid_sat', ignoreDuplicates: true });
        if (error) { errores++; } else { importados++; }
      } catch { errores++; }
    }
    if (importados > 0) {
      const { data } = await supabase.from('cfdis').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false });
      setCfdis(data ?? []);
    }
    const msg = importados > 0
      ? `${importados} CFDI${importados > 1 ? 's' : ''} importado${importados > 1 ? 's' : ''} correctamente${errores > 0 ? ` (${errores} con error)` : ''}`
      : `No se importó ningún CFDI${errores > 0 ? ` (${errores} archivos con error)` : ''}`;
    setXmlMsg({ ok: importados > 0, text: msg });
    if (xmlRef.current) xmlRef.current.value = '';
    setSubiendoXml(false);
  };

  // ── Totales ───────────────────────────────────────────────────────────────
  const totales = cfdis.reduce((acc, c) => {
    acc.total += Number(c.total ?? 0);
    acc.iva   += Number(c.iva ?? 0);
    if (c.status === 'pendiente') acc.pendiente++;
    if (c.status === 'aprobado')  acc.aprobado++;
    return acc;
  }, { total: 0, iva: 0, pendiente: 0, aprobado: 0 });

  // ── States de carga / error ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
      </div>
    );
  }
  if (!empresaId || !empresa) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Empresa no encontrada.</p>
          <a href="/dashboard" className="text-[#1B3A6B] text-sm font-semibold mt-2 block">← Volver</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-sm">
        <a href="/dashboard" className="text-gray-400 hover:text-[#1B3A6B] transition">← Empresas</a>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-[#333333] truncate">{empresa.nombre}</span>
      </div>

      {/* Info empresa */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#333333]">{empresa.nombre}</h1>
            <p className="text-sm text-gray-400 mt-0.5 font-mono">{empresa.rfc}</p>
            {empresa.giro && <p className="text-sm text-gray-500 mt-1">{empresa.giro}</p>}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${empresa.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {empresa.activa ? 'Activa' : 'Inactiva'}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${empresa.fiel_disponible ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${empresa.fiel_disponible ? 'bg-blue-500' : 'bg-gray-300'}`} />
              {empresa.fiel_disponible ? 'FIEL activa' : 'Sin FIEL'}
            </span>
          </div>
        </div>
        {empresa.sat_ultima_sync && (
          <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">
            Última sincronización SAT: {new Date(empresa.sat_ultima_sync).toLocaleString('es-MX')}
          </p>
        )}

        {/* Invitación para el cliente */}
        <div className="mt-3 pt-3 border-t border-gray-50">
          {!invCodigo ? (
            <button
              onClick={generarInvitacion}
              disabled={generandoInv}
              className="flex items-center gap-2 text-xs font-semibold text-[#1B3A6B] hover:text-[#00A651] transition disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              {generandoInv ? 'Generando código...' : 'Generar código de invitación para el cliente'}
            </button>
          ) : (
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Código de invitación — válido 7 días</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold tracking-[0.25em] text-[#1B3A6B] font-mono">{invCodigo}</span>
                <button
                  onClick={copiarCodigo}
                  className="bg-white border border-gray-200 hover:border-[#1B3A6B] text-xs font-semibold px-3 py-1.5 rounded-lg transition text-gray-600 hover:text-[#1B3A6B] flex items-center gap-1.5"
                >
                  {invCopiado ? (
                    <><svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copiado</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copiar</>
                  )}
                </button>
                <button onClick={() => setInvCodigo(null)} className="text-xs text-gray-400 hover:text-gray-600 transition">
                  Cerrar
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">El cliente ingresa este código en la app ContaFlow para vincularse a {empresa.nombre}.</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total acumulado', val: fmt(totales.total),           color: 'text-[#1B3A6B]' },
          { label: 'IVA total',       val: fmt(totales.iva),             color: 'text-gray-700'   },
          { label: 'Pendientes',      val: String(totales.pendiente),    color: 'text-yellow-600' },
          { label: 'Aprobados',       val: String(totales.aprobado),     color: 'text-green-600'  },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-4 w-fit">
        {(['cfdis', 'estados', 'sat'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${tab === t ? 'bg-[#1B3A6B] text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'cfdis'   ? `CFDIs (${cfdis.length})`            :
             t === 'estados' ? `Estados (${estados.length})` :
             '⬇ SAT'}
          </button>
        ))}
      </div>

      {/* ── Tab CFDIs ──────────────────────────────────────────────────── */}
      {tab === 'cfdis' && (
        <div>
          {/* Subir XML */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500">CFDIs registrados</h2>
            <div className="flex items-center gap-2">
              {xmlMsg && (
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${xmlMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {xmlMsg.text}
                </span>
              )}
              <label className={`cursor-pointer bg-white border border-gray-200 hover:border-[#1B3A6B] text-gray-600 hover:text-[#1B3A6B] text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${subiendoXml ? 'opacity-50 pointer-events-none' : ''}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {subiendoXml ? 'Importando...' : 'Subir XML'}
                <input ref={xmlRef} type="file" accept=".xml" multiple className="hidden"
                  onChange={e => subirXml(e.target.files)} />
              </label>
            </div>
          </div>

          {cfdis.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
              Esta empresa no tiene CFDIs registrados
            </div>
          ) : (
            <div className="space-y-2">
              {cfdis.map(c => {
                const cfg = STATUS_CFDI[c.status] ?? STATUS_CFDI.pendiente;
                return (
                  <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge} ${cfg.text}`}>{cfg.label}</span>
                        <span className="text-xs text-gray-400 uppercase font-medium">{c.tipo}</span>
                        {c.fuente && c.fuente !== 'manual' && (
                          <span className="text-xs text-blue-500 font-medium">{FUENTE_LABEL[c.fuente] ?? c.fuente}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 font-mono truncate">{c.uuid_sat ?? 'Sin UUID'}</p>
                      <p className="text-xs text-gray-400">{c.fecha_emision ?? '—'}{c.rfc_emisor ? ` · ${c.rfc_emisor}` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-[#1B3A6B]">{fmt(c.total)}</div>
                      <div className="text-xs text-gray-400">IVA: {fmt(c.iva)}</div>
                    </div>
                    {c.status === 'pendiente' && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => cambiarStatus(c.id, 'aprobado')} disabled={accionando === c.id}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
                          {accionando === c.id ? '...' : 'Aprobar'}
                        </button>
                        <button onClick={() => cambiarStatus(c.id, 'rechazado')} disabled={accionando === c.id}
                          className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
                          {accionando === c.id ? '...' : 'Rechazar'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Estados de cuenta ──────────────────────────────────────── */}
      {tab === 'estados' && (
        estados.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
            Esta empresa no tiene estados de cuenta registrados
          </div>
        ) : (
          <div className="space-y-2">
            {estados.map(e => (
              <div key={e.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#EEF2FA] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[#1B3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#333333] text-sm">{e.banco ?? 'Sin banco'}</p>
                  <p className="text-xs text-gray-400">{e.periodo ?? '—'} · {e.created_at?.slice(0, 10)}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${e.status === 'procesado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {e.status === 'procesado' ? 'Procesado' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Tab SAT ────────────────────────────────────────────────────── */}
      {tab === 'sat' && (
        <div className="space-y-4">

          {/* FIEL status / upload */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-[#333333] text-sm">e.firma (FIEL)</h2>
                <p className="text-xs text-gray-400 mt-0.5">Necesaria para descargar CFDIs del portal SAT</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${empresa.fiel_disponible ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'}`}>
                {empresa.fiel_disponible ? 'Configurada ✓' : 'No configurada'}
              </span>
            </div>

            {!empresa.fiel_disponible && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Certificado (.cer)</label>
                    <input ref={certRef} type="file" accept=".cer"
                      onChange={e => setFielCert(e.target.files?.[0] ?? null)}
                      className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#EEF2FA] file:text-[#1B3A6B] file:font-semibold file:text-xs hover:file:bg-[#D5E0F0] cursor-pointer border border-gray-200 rounded-lg px-2 py-1.5" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Llave privada (.key)</label>
                    <input ref={keyRef} type="file" accept=".key"
                      onChange={e => setFielKey(e.target.files?.[0] ?? null)}
                      className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#EEF2FA] file:text-[#1B3A6B] file:font-semibold file:text-xs hover:file:bg-[#D5E0F0] cursor-pointer border border-gray-200 rounded-lg px-2 py-1.5" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Contraseña de la e.firma</label>
                  <input type="password" value={fielPwd} onChange={e => setFielPwd(e.target.value)}
                    placeholder="Contraseña de la FIEL"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                </div>
                {fielMsg && (
                  <div className={`text-xs font-medium px-3 py-2 rounded-lg ${fielMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {fielMsg.text}
                  </div>
                )}
                <button onClick={subirFiel}
                  disabled={subiendoFiel || !fielCert || !fielKey || !fielPwd.trim()}
                  className="bg-[#1B3A6B] hover:bg-[#152d55] disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
                  {subiendoFiel ? 'Validando FIEL...' : 'Guardar FIEL'}
                </button>
              </div>
            )}

            {empresa.fiel_disponible && fielMsg && (
              <div className={`text-xs font-medium px-3 py-2 rounded-lg ${fielMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {fielMsg.text}
              </div>
            )}
          </div>

          {/* Sincronización SAT */}
          {empresa.fiel_disponible && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-semibold text-[#333333] text-sm mb-4">Descargar CFDIs del SAT</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fecha inicio</label>
                  <input type="date" value={satInicio} onChange={e => setSatInicio(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fecha fin</label>
                  <input type="date" value={satFin} onChange={e => setSatFin(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tipo</label>
                  <select value={satTipo} onChange={e => setSatTipo(e.target.value as typeof satTipo)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                    <option value="ambos">Emitidos y recibidos</option>
                    <option value="emitidos">Solo emitidos</option>
                    <option value="recibidos">Solo recibidos</option>
                  </select>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 text-xs text-yellow-700 mb-4">
                El SAT puede tardar entre 30 segundos y 2 minutos en preparar los paquetes. No cierres esta ventana.
              </div>

              <button onClick={sincronizarSAT} disabled={sincronizando}
                className="bg-[#00A651] hover:bg-[#008F45] disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition flex items-center gap-2">
                {sincronizando ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {satPaso || 'Descargando...'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Sincronizar con SAT
                  </>
                )}
              </button>

              {satResult && (
                <div className={`mt-4 rounded-lg p-4 ${satResult.errores.length > 0 && satResult.importados === 0 ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Resultado de sincronización</p>
                  <p className="text-sm text-gray-600">
                    {satResult.importados} CFDIs importados
                    {satResult.duplicados > 0 ? `, ${satResult.duplicados} ya existían` : ''}.
                  </p>
                  {satResult.errores.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {satResult.errores.map((e, i) => (
                        <li key={i} className="text-xs text-red-600">⚠ {e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Auto-sync mensual */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#333333]">Sincronización automática mensual</p>
                  <p className="text-xs text-gray-400 mt-0.5">Descarga automática el día 2 de cada mes — requiere FIEL activa</p>
                </div>
                <button
                  onClick={toggleAutoSync}
                  disabled={guardandoSync}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${empresa.sat_auto_sync ? 'bg-[#00A651]' : 'bg-gray-200'}`}
                  role="switch"
                  aria-checked={empresa.sat_auto_sync}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${empresa.sat_auto_sync ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

export default function EmpresaDetallePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
      </div>
    }>
      <EmpresaDetalleContent />
    </Suspense>
  );
}

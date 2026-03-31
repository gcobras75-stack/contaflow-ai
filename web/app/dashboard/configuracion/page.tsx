'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Despacho = {
  id: string;
  nombre: string;
  rfc: string;
  email: string;
  telefono: string | null;
  plan: string;
  activo: boolean;
};

type EmpresaCliente = {
  id: string;
  nombre: string;
  rfc: string;
  giro: string | null;
  activa: boolean;
};

const PLANES = {
  basico:       { label: 'Básico',       empresas: 3,  precio: 0,   color: '#6B7280' },
  profesional:  { label: 'Profesional',  empresas: 10, precio: 499, color: '#1B3A6B' },
  empresarial:  { label: 'Empresarial',  empresas: 999,precio: 999, color: '#7C3AED' },
};

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? 'PLACEHOLDER';
const MP_HABILITADO = MP_PUBLIC_KEY !== 'PLACEHOLDER' && !MP_PUBLIC_KEY.includes('PLACEHOLDER');

export default function ConfiguracionPage() {
  const [despacho, setDespacho] = useState<Despacho | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null);

  // Formulario nueva empresa
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState({ nombre: '', rfc: '', giro: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios').select('despacho_id').eq('id', user.id).single();

      if (!usuario?.despacho_id) { setLoading(false); return; }

      const [{ data: desp }, { data: emps }] = await Promise.all([
        supabase.from('despachos').select('*').eq('id', usuario.despacho_id).single(),
        supabase.from('empresas_clientes').select('*').eq('despacho_id', usuario.despacho_id),
      ]);

      setDespacho(desp);
      setEmpresas(emps ?? []);
      setLoading(false);
    }
    init();
  }, []);

  const mostrarToast = (msg: string, tipo: 'ok' | 'err') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  const iniciarPagoMP = async () => {
    if (!MP_HABILITADO) {
      mostrarToast('Mercado Pago no configurado. Agrega NEXT_PUBLIC_MP_PUBLIC_KEY en .env.local', 'err');
      return;
    }
    setPagando(true);
    // En producción: llamar a tu API route /api/mp/create-preference
    // que crea la preferencia con el SDK de MP y devuelve init_point
    try {
      const res = await fetch('/api/mp/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concepto: 'Empresa cliente ContaFlow AI', monto: 99, despacho_id: despacho?.id }),
      });
      const data = await res.json();
      if (data.init_point) window.open(data.init_point, '_blank');
      else mostrarToast('Error al crear preferencia de pago', 'err');
    } catch {
      mostrarToast('Error al conectar con Mercado Pago', 'err');
    } finally {
      setPagando(false);
    }
  };

  const agregarEmpresa = async () => {
    if (!form.nombre.trim() || !form.rfc.trim()) {
      mostrarToast('Nombre y RFC son requeridos', 'err');
      return;
    }
    setGuardando(true);
    const { data: usuario } = await supabase.auth.getUser();
    if (!usuario?.user) { setGuardando(false); return; }

    const { data: usr } = await supabase
      .from('usuarios').select('despacho_id').eq('id', usuario.user.id).single();

    const { data, error } = await supabase.from('empresas_clientes').insert({
      nombre: form.nombre.trim(),
      rfc: form.rfc.trim().toUpperCase(),
      giro: form.giro.trim() || null,
      despacho_id: usr?.despacho_id ?? null,
      activa: true,
    }).select().single();

    if (error) {
      mostrarToast(error.code === '23505' ? 'El RFC ya está registrado' : `Error: ${error.message}`, 'err');
    } else {
      setEmpresas(prev => [...prev, data]);
      setForm({ nombre: '', rfc: '', giro: '' });
      setFormVisible(false);
      mostrarToast('Empresa agregada correctamente', 'ok');
    }
    setGuardando(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
      </div>
    );
  }

  const plan = PLANES[despacho?.plan as keyof typeof PLANES] ?? PLANES.basico;
  const limite = plan.empresas;
  const usadas = empresas.length;

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="bg-[#1B3A6B] text-white px-6 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-white/70 hover:text-white text-sm transition">← Dashboard</a>
        <span className="text-white/30">|</span>
        <span className="font-semibold">Configuración</span>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.tipo === 'ok' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">

        {/* Plan actual */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-[#333333] mb-4">Plan actual</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-extrabold" style={{ color: plan.color }}>{plan.label}</span>
                {plan.precio > 0 && (
                  <span className="text-sm text-gray-400">${plan.precio} MXN/mes</span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {usadas} de {limite === 999 ? 'ilimitadas' : limite} empresas cliente usadas
              </p>
              {/* Barra de progreso */}
              {limite < 999 && (
                <div className="w-48 h-2 bg-gray-100 rounded-full mt-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (usadas / limite) * 100)}%`, backgroundColor: plan.color }}
                  />
                </div>
              )}
            </div>
            {despacho?.plan === 'basico' && (
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-2">Actualiza tu plan</p>
                <div className="flex gap-2">
                  <div className="border border-[#1B3A6B] rounded-lg px-3 py-2 text-center">
                    <div className="text-xs font-bold text-[#1B3A6B]">Profesional</div>
                    <div className="text-xs text-gray-400">$499/mes · 10 empresas</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Datos del despacho */}
        {despacho && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-[#333333] mb-4">Datos del despacho</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Nombre', val: despacho.nombre },
                { label: 'RFC', val: despacho.rfc },
                { label: 'Email', val: despacho.email },
                { label: 'Teléfono', val: despacho.telefono ?? '—' },
              ].map(row => (
                <div key={row.label}>
                  <span className="text-gray-400 text-xs">{row.label}</span>
                  <p className="font-medium text-[#333333]">{row.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empresas cliente */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#333333]">
              Empresas cliente
              <span className="ml-2 text-sm font-normal text-gray-400">({usadas}/{limite === 999 ? '∞' : limite})</span>
            </h2>
            <button
              onClick={() => setFormVisible(v => !v)}
              disabled={usadas >= limite}
              className="bg-[#00A651] hover:bg-[#008F45] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              + Agregar
            </button>
          </div>

          {/* Formulario nueva empresa */}
          {formVisible && (
            <div className="bg-[#F0F4FF] rounded-xl p-4 mb-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#1B3A6B]">Nueva empresa cliente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text" placeholder="Nombre *"
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                />
                <input
                  type="text" placeholder="RFC *"
                  value={form.rfc} onChange={e => setForm(f => ({ ...f, rfc: e.target.value.toUpperCase() }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] uppercase"
                />
                <input
                  type="text" placeholder="Giro (opcional)"
                  value={form.giro} onChange={e => setForm(f => ({ ...f, giro: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setFormVisible(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">
                  Cancelar
                </button>
                <button
                  onClick={agregarEmpresa}
                  disabled={guardando}
                  className="bg-[#1B3A6B] hover:bg-[#152d55] disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition"
                >
                  {guardando ? 'Guardando...' : 'Guardar empresa'}
                </button>
              </div>
            </div>
          )}

          {empresas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin empresas cliente registradas</p>
          ) : (
            <div className="space-y-2">
              {empresas.map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-[#333333]">{emp.nombre}</p>
                    <p className="text-xs text-gray-400">{emp.rfc} · {emp.giro ?? 'Sin giro'}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${emp.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {emp.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mercado Pago */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-[#333333] mb-1">Suscripción y pagos</h2>
          <p className="text-sm text-gray-400 mb-4">Agrega empresas cliente adicionales vía Mercado Pago</p>

          <div className="border border-[#1B3A6B]/20 rounded-xl p-5 bg-[#F0F4FF]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-bold text-[#1B3A6B] text-lg">Empresa cliente adicional</div>
                <div className="text-3xl font-extrabold text-[#1B3A6B] mt-1">$99 <span className="text-base font-normal text-gray-400">MXN/mes</span></div>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span> CFDI automático y conciliación
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span> Análisis con Claude AI
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span> Exportar a CONTPAQi
                  </li>
                </ul>
              </div>
              <button
                onClick={iniciarPagoMP}
                disabled={pagando}
                className="bg-[#009EE3] hover:bg-[#0081C9] disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition text-sm whitespace-nowrap"
              >
                {pagando ? 'Redirigiendo...' : 'Pagar con Mercado Pago'}
              </button>
            </div>
          </div>

          {!MP_HABILITADO && (
            <div className="mt-4 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <span>
                Mercado Pago no configurado. Agrega <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_MP_PUBLIC_KEY</code> y
                <code className="bg-yellow-100 px-1 rounded ml-1">MP_ACCESS_TOKEN</code> en
                <code className="bg-yellow-100 px-1 rounded ml-1">web/.env.local</code> para activar los pagos.
              </span>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

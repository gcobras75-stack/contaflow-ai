'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const PASOS = ['Bienvenida', 'Tu despacho', 'Aceptación legal', 'Primera empresa'];

// Documentos legales que el contador debe aceptar antes de activar la cuenta.
// Los codes/versions deben existir en la tabla legal_documents (seed de migración 004).
// Los PDFs deben estar en web/public/legal/ con los nombres indicados.
const DOCUMENTOS_LEGALES = [
  {
    code:    'terminos',
    version: '1.0',
    titulo:  'He leído y acepto los Términos y Condiciones',
    url:     '/legal/terminos.pdf',
  },
  {
    code:    'privacidad',
    version: '1.0',
    titulo:  'He leído y acepto el Aviso de Privacidad',
    url:     '/legal/privacidad.pdf',
  },
  {
    code:    'deslinde',
    version: '1.0',
    titulo:  'Entiendo y acepto el Deslinde de Responsabilidad Fiscal',
    url:     '/legal/deslinde.pdf',
  },
  {
    code:    'contrato_saas',
    version: '1.0',
    titulo:  'Acepto el Contrato de Prestación de Servicios SaaS',
    url:     '/legal/contrato-saas.pdf',
  },
] as const;

function validarRFC(rfc: string, tipoPersona: 'fisica' | 'moral'): string | null {
  const limpio = rfc.trim().toUpperCase();
  if (tipoPersona === 'moral'  && limpio.length !== 12) return 'El RFC de persona moral debe tener 12 caracteres.';
  if (tipoPersona === 'fisica' && limpio.length !== 13) return 'El RFC de persona física debe tener 13 caracteres.';
  return null;
}

export default function OnboardingPage() {
  const router  = useRouter();
  const [paso,  setPaso]     = useState(0);
  const [email, setEmail]    = useState('');
  const [userId, setUserId]  = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError]    = useState('');

  const [despacho, setDespacho] = useState({
    nombre:               '',
    rfc:                  '',
    telefono:             '',
    tipo_persona:         'fisica' as 'fisica' | 'moral',
    razon_social:         '',
    representante_legal:  '',
  });
  const [empresa, setEmpresa] = useState({ nombre: '', rfc: '', giro: '' });

  // Checkboxes de aceptación legal — cada código mapea a su estado
  const [aceptaciones, setAceptaciones] = useState<Record<string, boolean>>(
    Object.fromEntries(DOCUMENTOS_LEGALES.map(d => [d.code, false])),
  );
  const [enviandoLegal, setEnviandoLegal] = useState(false);

  const todosAceptados = DOCUMENTOS_LEGALES.every(d => aceptaciones[d.code]);

  /** Registra las 4 aceptaciones en el backend y avanza al siguiente paso. */
  const registrarAceptacionLegal = async () => {
    if (!todosAceptados) return;
    setEnviandoLegal(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

      const res = await fetch('/api/aceptar-legal', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          acceptances: DOCUMENTOS_LEGALES.map(d => ({ code: d.code, version: d.version })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'No se pudo registrar la aceptación.');

      setPaso(3); // avanza a "Primera empresa"
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar aceptación.');
    } finally {
      setEnviandoLegal(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      setEmail(user.email ?? '');
      setUserId(user.id);
      supabase.from('usuarios').select('despacho_id, rol').eq('id', user.id).single()
        .then(({ data }) => {
          if (data?.despacho_id) router.replace('/dashboard');
        });
    });
  }, [router]);

  const crearDespachoYEmpresa = async () => {
    const rfcErr = validarRFC(despacho.rfc, despacho.tipo_persona);
    if (rfcErr) { setError(rfcErr); return; }
    if (!despacho.nombre.trim() || !despacho.rfc.trim()) {
      setError('Nombre y RFC del despacho son obligatorios.');
      return;
    }
    if (despacho.tipo_persona === 'moral' && !despacho.razon_social.trim()) {
      setError('La razón social es obligatoria para personas morales.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const { data: desp, error: despErr } = await supabase
        .from('despachos')
        .insert({
          nombre:               despacho.nombre.trim(),
          rfc:                  despacho.rfc.trim().toUpperCase(),
          email:                email,
          telefono:             despacho.telefono.trim() || null,
          tipo_persona:         despacho.tipo_persona,
          razon_social:         despacho.tipo_persona === 'moral' ? despacho.razon_social.trim() : null,
          representante_legal:  despacho.tipo_persona === 'moral' ? despacho.representante_legal.trim() || null : null,
          plan:                 'basico',
          activo:               true,
        })
        .select('id')
        .single();

      if (despErr) throw new Error(despErr.message);

      const { error: usrErr } = await supabase
        .from('usuarios')
        .update({ despacho_id: desp.id, rol: 'contador' })
        .eq('id', userId);

      // Registro de referral: busca código en localStorage (/ref/XXX) o en URL
      try {
        let codigoRef = null;
        if (typeof window !== 'undefined') {
          codigoRef = localStorage.getItem('contaflow_ref');
          if (!codigoRef) {
            const urlRef = new URLSearchParams(window.location.search).get('ref');
            if (urlRef) codigoRef = urlRef.toUpperCase().trim();
          }
        }
        if (codigoRef) {
          // Buscar vendedor activo con ese código (case-insensitive)
          const { data: vendedor } = await supabase
            .from('red_comercial')
            .select('id, rol, coordinador_id')
            .ilike('codigo_referido', codigoRef)
            .eq('activo', true)
            .maybeSingle();

          if (vendedor) {
            // Regla de negocio: solo vendedores generan referidos con cadena
            // completa (vendedor + coordinador). Si el código es de un
            // coordinador directo (no vendedor), guardamos sin vendedor_id.
            const isVendedor = vendedor.rol === 'vendedor';
            await supabase.from('referidos').insert({
              contador_id:    userId,
              vendedor_id:    isVendedor ? vendedor.id : null,
              coordinador_id: isVendedor ? vendedor.coordinador_id : vendedor.id,
              codigo_usado:   codigoRef,
            });
          }
          // Limpiar el código tras intentar registrarlo (usado o inválido)
          if (typeof window !== 'undefined') {
            localStorage.removeItem('contaflow_ref');
          }
        }
      } catch (refErr) {
        // No bloqueamos el alta si el referral falla — el contador sigue activo
        console.warn('[onboarding] error registrando referral:', refErr);
      }

      if (usrErr) throw new Error(usrErr.message);

      if (empresa.nombre.trim() && empresa.rfc.trim()) {
        await supabase.from('empresas_clientes').insert({
          nombre:      empresa.nombre.trim(),
          rfc:         empresa.rfc.trim().toUpperCase(),
          giro:        empresa.giro.trim() || null,
          despacho_id: desp.id,
          activa:      true,
        });
      }

      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F2444] to-[#1B3A6B] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-[#1B3A6B] px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#00A651] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="5" width="10" height="2.5" rx="1.25" fill="white" opacity="0.9"/>
                <rect x="2" y="9" width="14" height="2.5" rx="1.25" fill="white"/>
                <rect x="2" y="13" width="10" height="2.5" rx="1.25" fill="white" opacity="0.9"/>
                <circle cx="17" cy="10.25" r="2.5" fill="#00A651"/>
              </svg>
            </div>
            <span className="font-bold text-lg">ContaFlow AI</span>
          </div>
          <h1 className="text-2xl font-bold">Configura tu despacho</h1>
          <p className="text-white/60 text-sm mt-1">Solo toma 2 minutos</p>
          <div className="flex items-center gap-2 mt-4">
            {PASOS.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all ${i <= paso ? 'bg-[#00A651] text-white' : 'bg-white/20 text-white/50'}`}>
                  {i < paso ? '✓' : i + 1}
                </div>
                {i < PASOS.length - 1 && (
                  <div className={`h-px w-8 transition-all ${i < paso ? 'bg-[#00A651]' : 'bg-white/20'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-8 py-6">

          {/* Paso 0: Bienvenida */}
          {paso === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#333333]">Bienvenido, {email.split('@')[0]}</h2>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                  ContaFlow AI centraliza los CFDIs de tus clientes, genera pólizas para CONTPAQi,
                  analiza estados de cuenta con IA y te da una estrategia fiscal por cada empresa.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  'Descarga automática del SAT con e.firma (FIEL)',
                  'Exportación XML de pólizas para CONTPAQi y DIOT',
                  'Chat con CPC Ricardo Morales — asesor fiscal IA',
                  'App móvil para cada cliente con info en tiempo real',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <span className="text-[#00A651] mt-0.5 shrink-0">✓</span>
                    {item}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setPaso(1)}
                className="w-full bg-[#1B3A6B] hover:bg-[#152d55] text-white font-semibold py-3 rounded-xl transition"
              >
                Comenzar configuración →
              </button>
            </div>
          )}

          {/* Paso 1: Datos del despacho */}
          {paso === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#333333]">Datos de tu despacho</h2>

              {/* Selector persona física / moral */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Tipo de persona *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { val: 'fisica', label: 'Persona Física', sub: 'RFC 13 caracteres' },
                    { val: 'moral',  label: 'Persona Moral',  sub: 'RFC 12 caracteres' },
                  ] as const).map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setDespacho(d => ({ ...d, tipo_persona: opt.val, rfc: '' }))}
                      className={`rounded-xl border-2 p-3 text-left transition ${
                        despacho.tipo_persona === opt.val
                          ? 'border-[#1B3A6B] bg-[#EEF2FA]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-semibold text-[#333333]">{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {despacho.tipo_persona === 'moral' ? 'Nombre comercial del despacho *' : 'Nombre del despacho *'}
                  </label>
                  <input
                    type="text"
                    placeholder={despacho.tipo_persona === 'moral' ? 'Ej: Contadores & Asociados' : 'Ej: Contadores Asociados García'}
                    value={despacho.nombre}
                    onChange={e => setDespacho(d => ({ ...d, nombre: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>

                {/* Razón social y representante — solo persona moral */}
                {despacho.tipo_persona === 'moral' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Razón social *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: CONTADORES Y ASOCIADOS SA DE CV"
                        value={despacho.razon_social}
                        onChange={e => setDespacho(d => ({ ...d, razon_social: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Representante legal
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: María García López"
                        value={despacho.representante_legal}
                        onChange={e => setDespacho(d => ({ ...d, representante_legal: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    RFC {despacho.tipo_persona === 'moral' ? '(12 caracteres)' : '(13 caracteres)'} *
                  </label>
                  <input
                    type="text"
                    placeholder={despacho.tipo_persona === 'moral' ? 'Ej: CAA850101XXX' : 'Ej: GACJ850101XXX'}
                    value={despacho.rfc}
                    onChange={e => setDespacho(d => ({ ...d, rfc: e.target.value.toUpperCase() }))}
                    maxLength={despacho.tipo_persona === 'moral' ? 12 : 13}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] uppercase font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {despacho.rfc.length}/{despacho.tipo_persona === 'moral' ? 12 : 13} caracteres
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Teléfono de contacto
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: 81 1234 5678"
                    value={despacho.telefono}
                    onChange={e => setDespacho(d => ({ ...d, telefono: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setPaso(0); setError(''); }} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl transition hover:border-gray-300">
                  ← Atrás
                </button>
                <button
                  onClick={() => {
                    const rfcErr = validarRFC(despacho.rfc, despacho.tipo_persona);
                    if (rfcErr) { setError(rfcErr); return; }
                    if (!despacho.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
                    if (despacho.tipo_persona === 'moral' && !despacho.razon_social.trim()) {
                      setError('La razón social es obligatoria.'); return;
                    }
                    setError('');
                    setPaso(2); // → Aceptación legal
                  }}
                  className="flex-1 bg-[#1B3A6B] hover:bg-[#152d55] text-white font-semibold py-2.5 rounded-xl transition"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* Paso 2: Aceptación legal */}
          {paso === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[#333333]">Aceptación de términos</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Antes de activar tu cuenta necesitamos que leas y aceptes los siguientes documentos.
                </p>
              </div>

              <div className="space-y-3">
                {DOCUMENTOS_LEGALES.map(doc => (
                  <label
                    key={doc.code}
                    className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 hover:border-gray-300 transition cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={aceptaciones[doc.code] ?? false}
                      onChange={e =>
                        setAceptaciones(prev => ({ ...prev, [doc.code]: e.target.checked }))
                      }
                      className="mt-0.5 w-4 h-4 shrink-0 accent-[#00A651]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#333333] leading-snug">{doc.titulo}</div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-block mt-1 text-xs font-semibold text-[#1B3A6B] hover:text-[#00A651] transition"
                      >
                        Leer documento →
                      </a>
                    </div>
                  </label>
                ))}
              </div>

              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Versión 1.0 — Al aceptar confirmas haber leído cada documento.
                <br />
                Registraremos tu aceptación con fecha, hora, IP y navegador.
              </p>

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setPaso(1); setError(''); }}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl transition hover:border-gray-300"
                >
                  ← Atrás
                </button>
                <button
                  onClick={registrarAceptacionLegal}
                  disabled={!todosAceptados || enviandoLegal}
                  className="flex-1 bg-[#1B3A6B] hover:bg-[#152d55] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {enviandoLegal ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Registrando…
                    </>
                  ) : (
                    'Continuar →'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Primera empresa */}
          {paso === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[#333333]">Primera empresa cliente</h2>
                <p className="text-gray-400 text-sm mt-1">Opcional — puedes agregarla después desde Configuración.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre de la empresa</label>
                  <input
                    type="text"
                    placeholder="Ej: Tacos El Güero SA de CV"
                    value={empresa.nombre}
                    onChange={e => setEmpresa(emp => ({ ...emp, nombre: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">RFC de la empresa</label>
                  <input
                    type="text"
                    placeholder="Ej: TEG850101XXX"
                    value={empresa.rfc}
                    onChange={e => setEmpresa(emp => ({ ...emp, rfc: e.target.value.toUpperCase() }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Giro / Actividad económica</label>
                  <input
                    type="text"
                    placeholder="Ej: Restaurante, Transporte, Comercio al por menor…"
                    value={empresa.giro}
                    onChange={e => setEmpresa(emp => ({ ...emp, giro: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setPaso(2); setError(''); }} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl transition hover:border-gray-300">
                  ← Atrás
                </button>
                <button
                  onClick={crearDespachoYEmpresa}
                  disabled={guardando}
                  className="flex-1 bg-[#00A651] hover:bg-[#008F45] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {guardando ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando...</>
                  ) : '¡Listo, entrar al panel!'}
                </button>
              </div>
              <button
                onClick={() => { setEmpresa({ nombre: '', rfc: '', giro: '' }); crearDespachoYEmpresa(); }}
                disabled={guardando}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition py-1"
              >
                Saltar — agregaré empresas después
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

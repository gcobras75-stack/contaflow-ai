import Link from 'next/link';

/* ============================================================
   ContaFlow AI — Landing Page
   Panel contable con IA para despachos mexicanos
   ============================================================ */

export const metadata = {
  title: 'ContaFlow AI — Panel Contable Inteligente',
  description: 'Sincroniza el SAT, analiza con IA y exporta a CONTPAQi. El panel contable para despachos mexicanos modernos.',
};

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="10" height="2.5" rx="1.25" fill="white" opacity="0.9" />
      <rect x="2" y="9" width="14" height="2.5" rx="1.25" fill="white" />
      <rect x="2" y="13" width="10" height="2.5" rx="1.25" fill="white" opacity="0.9" />
      <circle cx="17" cy="10.25" r="2.5" fill="#00A651" />
    </svg>
  );
}

function LogoMarkDark() {
  return (
    <svg width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="10" height="2.5" rx="1.25" fill="#1B3A6B" opacity="0.9" />
      <rect x="2" y="9" width="14" height="2.5" rx="1.25" fill="#1B3A6B" />
      <rect x="2" y="13" width="10" height="2.5" rx="1.25" fill="#1B3A6B" opacity="0.9" />
      <circle cx="17" cy="10.25" r="2.5" fill="#00A651" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
      </svg>
    ),
    titulo: 'Descarga automática del SAT',
    desc: 'Conecta la e.firma de tus clientes y descarga sus CFDIs directamente del portal del SAT. Emitidos y recibidos, sin capturas manuales.',
    badge: 'SAT Descarga Masiva',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    titulo: 'IA contable especializada',
    desc: 'Claude AI analiza estados de cuenta, detecta diferencias con CFDIs y genera estrategias fiscales personalizadas. Como tener un CPC de apoyo 24/7.',
    badge: 'Claude Sonnet',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    titulo: 'Exporta a CONTPAQi al instante',
    desc: 'Genera pólizas en XML estándar SAT 1.3, DIOT y CSV listos para importar. Compatible con CONTPAQi Contabilidad y Bancos.',
    badge: 'XML SAT 1.3 + DIOT',
    color: 'bg-green-50 text-green-700',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    titulo: 'App móvil para tus clientes',
    desc: 'Tus clientes suben CFDIs, estados de cuenta y constancias fiscales desde el celular. Tú apruebas desde el panel web.',
    badge: 'iOS + Android',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    titulo: 'Calendario fiscal automatizado',
    desc: 'Nunca más olvides una obligación. IVA, ISR, DIOT, IMSS bimestral con fechas ajustadas por Art. 12 del CFF.',
    badge: 'SAT Art. 12 CFF',
    color: 'bg-yellow-50 text-yellow-700',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    titulo: 'Conciliación bancaria con IA',
    desc: 'Sube estados de cuenta y obtén automáticamente un análisis de diferencias entre lo cobrado, lo facturado y lo declarado.',
    badge: 'Análisis automático',
    color: 'bg-teal-50 text-teal-600',
  },
];

const STEPS = [
  {
    num: '01',
    titulo: 'Crea tu despacho',
    desc: 'Regístrate gratis, configura tu despacho y agrega a tus clientes enviándoles un código de vinculación por WhatsApp.',
  },
  {
    num: '02',
    titulo: 'Configura la e.firma',
    desc: 'Sube el .cer y .key de cada cliente. ContaFlow se conecta al SAT y descarga sus CFDIs automáticamente cada mes.',
  },
  {
    num: '03',
    titulo: 'Trabaja con IA',
    desc: 'Revisa, aprueba y exporta. La IA detecta inconsistencias, genera estrategias y mantiene el calendario fiscal al día.',
  },
];

const TESTIMONIALS = [
  {
    nombre: 'Lic. Patricia Hernández',
    cargo: 'CPC — Despacho Hernández y Asociados, CDMX',
    texto: 'Antes tardaba 3 días en cuadrar el IVA de cada cliente. Ahora en 20 minutos tengo las pólizas listas para CONTPAQi. La descarga del SAT me ahorró contratar otro auxiliar.',
  },
  {
    nombre: 'C.P. Jorge Ramírez',
    cargo: 'Contador independiente, Guadalajara',
    texto: 'Tengo 18 clientes RESICO. El calendario fiscal con las fechas exactas del CFF y el análisis de IA me salvan de errores que antes me costaban multas.',
  },
  {
    nombre: 'Mtra. Sofía Torres',
    cargo: 'Directora — Grupo Fiscal Torres, Monterrey',
    texto: 'Mis clientes adoran la app. Ya no me mandan fotos borrosas de facturas por WhatsApp. Suben todo desde su celular y yo apruebo desde el panel.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav style={{ backgroundColor: '#1B3A6B' }} className="sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-white font-bold text-lg tracking-tight">
              ContaFlow <span style={{ color: '#00A651' }}>AI</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-white/80 hover:text-white text-sm font-medium transition-colors px-3 py-1.5">
              Iniciar sesión
            </Link>
            <Link href="/login"
              style={{ backgroundColor: '#00A651' }}
              className="text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #1B3A6B 0%, #102244 100%)' }}
        className="relative overflow-hidden">
        {/* Grid decorativo */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-8"
            style={{ backgroundColor: 'rgba(0,166,81,0.15)', color: '#4ADE80', border: '1px solid rgba(0,166,81,0.3)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Nuevo: Sincronización automática con el SAT
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6"
            style={{ letterSpacing: '-0.02em' }}>
            El panel contable con IA
            <br />
            <span style={{ color: '#00A651' }}>para tu despacho</span>
          </h1>

          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Descarga CFDIs del SAT, analiza con inteligencia artificial,
            exporta a CONTPAQi y lleva el calendario fiscal de todos tus clientes
            desde un solo lugar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/login"
              style={{ backgroundColor: '#00A651' }}
              className="inline-flex items-center justify-center gap-2 text-white font-bold px-8 py-4 rounded-xl text-lg hover:opacity-90 transition-all shadow-xl">
              Empezar 30 días gratis
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <a href="#precios"
              className="inline-flex items-center justify-center gap-2 text-white/80 font-semibold px-8 py-4 rounded-xl text-lg border border-white/20 hover:border-white/40 transition-all">
              Ver precios
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 max-w-lg mx-auto gap-8 border-t border-white/10 pt-10">
            {[
              { val: '$99', label: 'MXN por empresa/mes' },
              { val: '30', label: 'días de prueba gratis' },
              { val: '∞', label: 'empresas sin límite' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-3xl font-extrabold text-white">{s.val}</div>
                <div className="text-xs text-white/50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-green-600 uppercase tracking-widest mb-3">Funcionalidades</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4"
              style={{ letterSpacing: '-0.02em' }}>
              Todo lo que necesita tu despacho
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Construido para contadores mexicanos. Cumple con los estándares del SAT y SAT y se integra con el software contable que ya usas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.titulo}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  {f.icon}
                </div>
                <div className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 mb-3">
                  {f.badge}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.titulo}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-green-600 uppercase tracking-widest mb-3">Cómo funciona</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900"
              style={{ letterSpacing: '-0.02em' }}>
              Empieza en minutos
            </h2>
          </div>

          <div className="relative">
            {/* Línea conectora */}
            <div className="hidden md:block absolute top-10 left-1/2 -translate-x-1/2 w-full h-px bg-gray-200 -z-0" style={{ width: '66%', left: '17%' }} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
              {STEPS.map((s) => (
                <div key={s.num} className="text-center">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                    style={{ backgroundColor: '#1B3A6B' }}>
                    <span className="text-2xl font-extrabold text-white">{s.num}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{s.titulo}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-green-600 uppercase tracking-widest mb-3">Testimonios</p>
            <h2 className="text-3xl font-extrabold text-gray-900" style={{ letterSpacing: '-0.02em' }}>
              Lo que dicen los contadores
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.nombre} className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5 italic">&ldquo;{t.texto}&rdquo;</p>
                <div>
                  <div className="text-sm font-bold text-gray-900">{t.nombre}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.cargo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────── */}
      <section id="precios" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-green-600 uppercase tracking-widest mb-3">Precios</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4"
              style={{ letterSpacing: '-0.02em' }}>
              Simple y predecible
            </h2>
            <p className="text-gray-500">Sin contratos, sin anualidades forzadas. Cancela cuando quieras.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Plan Despacho */}
            <div className="rounded-2xl border-2 p-8 relative"
              style={{ borderColor: '#1B3A6B' }}>
              <div className="absolute -top-3 left-8">
                <span className="text-xs font-bold px-3 py-1 rounded-full text-white"
                  style={{ backgroundColor: '#1B3A6B' }}>
                  MÁS POPULAR
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Plan Despacho</h3>
                <p className="text-sm text-gray-500">Para contadores y despachos</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-gray-900">$99</span>
                  <span className="text-gray-500">MXN</span>
                </div>
                <div className="text-sm text-gray-500">por empresa cliente / mes</div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Descarga automática SAT (emitidos y recibidos)',
                  'Análisis IA con Claude Sonnet',
                  'Exportación XML SAT 1.3 + DIOT + CSV',
                  'App móvil para clientes (iOS + Android)',
                  'Calendario fiscal automático',
                  'Conciliación bancaria con IA',
                  'Sin límite de CFDIs por empresa',
                  'Soporte por WhatsApp',
                ].map(item => (
                  <li key={item} className="flex gap-3 text-sm text-gray-700">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#00A651' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login"
                style={{ backgroundColor: '#1B3A6B' }}
                className="w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity">
                Empezar 30 días gratis
              </Link>
              <p className="text-xs text-center text-gray-400 mt-3">Sin tarjeta de crédito para la prueba</p>
            </div>

            {/* Plan Enterprise */}
            <div className="rounded-2xl border border-gray-200 p-8 bg-gray-50">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Plan Enterprise</h3>
                <p className="text-sm text-gray-500">Para firmas grandes y grupos</p>
              </div>
              <div className="mb-6">
                <div className="text-3xl font-extrabold text-gray-900">Personalizado</div>
                <div className="text-sm text-gray-500 mt-1">Precio según volumen de empresas</div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Todo lo del Plan Despacho',
                  'Precio por volumen (50+ empresas)',
                  'SLA garantizado',
                  'Integración API personalizada',
                  'Capacitación y onboarding dedicado',
                  'Factura electrónica incluida',
                ].map(item => (
                  <li key={item} className="flex gap-3 text-sm text-gray-700">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="mailto:hola@contaflow.mx"
                className="w-full flex items-center justify-center text-gray-700 font-bold py-3.5 rounded-xl border-2 border-gray-300 hover:border-gray-400 transition-colors">
                Contactar ventas
              </a>
            </div>
          </div>

          {/* FAQ rápido */}
          <div className="mt-16 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">Preguntas frecuentes</h3>
            <div className="space-y-4">
              {[
                {
                  q: '¿Necesito instalar algo?',
                  a: 'No. ContaFlow AI es 100% en la nube. Tu panel es web y tus clientes usan la app móvil.',
                },
                {
                  q: '¿Qué pasa con mis datos cuando termina la prueba?',
                  a: 'Si no contratas, tus datos se conservan 30 días adicionales para que puedas exportarlos.',
                },
                {
                  q: '¿Funciona con CONTPAQi?',
                  a: 'Sí. Generamos el XML de pólizas en formato SAT Contabilidad Electrónica 1.3 que CONTPAQi importa nativamente.',
                },
                {
                  q: '¿Cómo se conecta al SAT?',
                  a: 'Usando la e.firma (.cer y .key) del cliente, que se guarda cifrada en nuestros servidores. Sin capturas de pantalla ni contraseñas del portal.',
                },
              ].map(({ q, a }) => (
                <div key={q} className="border border-gray-200 rounded-xl p-5">
                  <div className="font-semibold text-gray-900 text-sm mb-2">{q}</div>
                  <div className="text-sm text-gray-500 leading-relaxed">{a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #1B3A6B 0%, #102244 100%)' }} className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,166,81,0.2)' }}>
              <LogoMark />
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4"
            style={{ letterSpacing: '-0.02em' }}>
            Moderniza tu despacho hoy
          </h2>
          <p className="text-white/70 text-lg mb-8 leading-relaxed">
            Únete a los contadores que ya automatizan su trabajo con IA.
            30 días gratis, sin tarjeta de crédito.
          </p>
          <Link href="/login"
            style={{ backgroundColor: '#00A651' }}
            className="inline-flex items-center gap-2 text-white font-bold px-10 py-4 rounded-xl text-lg hover:opacity-90 transition-all shadow-xl">
            Crear cuenta gratis
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoMarkDark />
            <span className="text-white font-bold">ContaFlow AI</span>
          </div>
          <div className="text-xs text-center">
            © {new Date().getFullYear()} ContaFlow AI · Hecho en México 🇲🇽 · Para contadores mexicanos
          </div>
          <div className="flex gap-6 text-xs">
            <a href="/login" className="hover:text-white transition-colors">Iniciar sesión</a>
            <a href="mailto:hola@contaflow.mx" className="hover:text-white transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

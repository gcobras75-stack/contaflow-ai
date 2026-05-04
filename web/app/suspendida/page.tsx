'use client';

/**
 * Página /suspendida — destino del middleware cuando el despacho no tiene
 * ninguna suscripción operable (todas suspendidas, vencidas, canceladas, o
 * trials expirados).
 *
 * A donde apuntan los botones:
 * - "Reactivar suscripción" → /dashboard/billing (ruta exenta del gate)
 * - "Contactar soporte"     → mailto:soporte@contaflow.mx
 * - "Cerrar sesión"         → /login
 *
 * Query param `?from=<ruta>` indica qué ruta original intentaba visitar
 * el usuario antes de ser redirigido, para darle contexto.
 */
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SuspendidaPage() {
  // useSearchParams requiere Suspense boundary en Next 16 (CSR bailout).
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
      </div>
    }>
      <SuspendidaContent />
    </Suspense>
  );
}

function SuspendidaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Si por alguna razón no hay sesión, mandar a login directo.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login');
      else setCheckingSession(false);
    });
  }, [router]);

  const handleReactivar = () => {
    router.push('/dashboard/billing');
  };

  const handleReintentar = () => {
    router.replace(from ?? '/dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F2444] to-[#1B3A6B] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header con logo y estado */}
        <div className="bg-[#1B3A6B] px-8 py-6 text-white">
          <div className="flex items-center gap-2.5 mb-4">
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2" y="5" width="10" height="2.5" rx="1.25" fill="white" opacity="0.9" />
              <rect x="2" y="9" width="14" height="2.5" rx="1.25" fill="white" />
              <rect x="2" y="13" width="10" height="2.5" rx="1.25" fill="white" opacity="0.9" />
              <circle cx="17" cy="10.25" r="2.5" fill="#00A651" />
            </svg>
            <span className="font-bold text-lg">ContaFlow AI</span>
          </div>

          {/* Ícono circular de advertencia */}
          <div className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center">
            <svg width="24" height="24" fill="none" stroke="#F87171" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        </div>

        {/* Contenido */}
        <div className="px-8 py-6">
          <h1 className="text-xl font-bold text-[#333333] mb-2">
            Tu cuenta está suspendida o tu periodo de prueba ha vencido
          </h1>

          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Para continuar usando ContaFlow AI necesitas reactivar tu suscripción.
            Una vez completado el pago, el acceso se restaura automáticamente en minutos.
          </p>

          {/* Contexto de la ruta intentada */}
          {from && (
            <div className="bg-[#EEF2FA] border border-[#1B3A6B]/20 rounded-lg px-3 py-2 mb-5">
              <p className="text-xs text-gray-500">
                Intentabas acceder a:{' '}
                <code className="font-mono text-[#1B3A6B] bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  {from}
                </code>
              </p>
            </div>
          )}

          {/* Pasos rápidos */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Cómo reactivar
            </p>
            <div className="space-y-2.5">
              {[
                'Entra a "Reactivar suscripción" para elegir tu plan',
                'Paga de forma segura con Mercado Pago',
                'Tu acceso se restaura automáticamente',
              ].map((txt, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#00A651] text-white text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-600 leading-snug">{txt}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones principales */}
          <div className="space-y-2.5">
            <button
              onClick={handleReactivar}
              className="w-full bg-[#00A651] hover:bg-[#008F45] text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              Reactivar suscripción
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>

            <a
              href="mailto:soporte@contaflow.mx?subject=Reactivaci%C3%B3n%20de%20cuenta"
              className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 font-semibold py-2.5 rounded-xl transition text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contactar soporte
            </a>
          </div>

          {/* Acciones secundarias — separador */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
            <button
              onClick={handleReintentar}
              className="text-xs text-[#1B3A6B] hover:text-[#152d55] font-semibold"
            >
              Ya pagué — reintentar acceso
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

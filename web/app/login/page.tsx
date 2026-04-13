'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const LOGIN_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Ingresa correo y contraseña.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        }),
        LOGIN_TIMEOUT_MS,
      );

      if (authError) {
        setError('Correo o contraseña incorrectos.');
        setLoading(false);
        return;
      }

      const { data: usuario, error: userError } = await withTimeout(
        supabase
          .from('usuarios')
          .select('rol')
          .eq('id', authData.user.id)
          .single(),
        LOGIN_TIMEOUT_MS,
      );

      if (userError || !usuario) {
        setError('Usuario no configurado. Contacta a soporte.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (usuario.rol !== 'contador' && usuario.rol !== 'superadmin') {
        setError('Acceso denegado. Usa la app móvil para acceder como empresa.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Respetar ?redirect si existe, sino redirigir por rol
      const redirectParam = searchParams.get('redirect');
      const defaultDest = usuario.rol === 'superadmin' ? '/admin' : '/dashboard';
      const destination = redirectParam && redirectParam.startsWith('/') ? redirectParam : defaultDest;

      setSuccess(true);

      // Hard redirect: fuerza recarga completa para que las cookies
      // de sesión lleguen correctamente al middleware del servidor.
      window.location.href = destination;
    } catch (err) {
      if (err instanceof Error && err.message === 'TIMEOUT') {
        setError('El servidor no responde. Verifica tu conexión o intenta en unos minutos.');
      } else {
        setError('Error de conexión. Intenta de nuevo.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-end gap-1">
            <span className="text-5xl font-extrabold text-[#1B3A6B] tracking-tight">
              ContaFlow
            </span>
            <span className="text-3xl font-bold text-[#00A651] mb-1">AI</span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Sistema contable inteligente</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-[#333333] mb-6">
            Panel del Contador
          </h1>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 mb-5 text-sm">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#333333] mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contador@despacho.com"
                autoComplete="email"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-[#333333] bg-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#333333] mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-11 text-sm text-[#333333] bg-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00A651] hover:bg-[#008F45] disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-colors text-sm"
            >
              {success ? 'Entrando...' : loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Solo para contadores registrados · ContaFlow AI
        </p>
      </div>
    </div>
  );
}

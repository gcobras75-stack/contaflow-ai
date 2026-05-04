'use client';

/**
 * /ref/[codigo] — landing page para vendedores de la red comercial.
 *
 * El vendedor comparte un link tipo:
 *   https://contaflow.mx/ref/VEND0001
 *
 * Este endpoint:
 *   1. Guarda el código en localStorage (clave: contaflow_ref)
 *      para que persista durante todo el flujo de signup/onboarding
 *   2. Redirige a /login con el ref como query param (defensa en
 *      profundidad — si localStorage está bloqueado, el onboarding
 *      todavía puede leer de URL)
 *
 * El código se consume en onboarding/page.tsx al crear el despacho:
 *   - Si existe un vendedor con ese codigo_referido, se crea fila en
 *     tabla referidos (contador_id, vendedor_id, coordinador_id)
 *   - Si el código no existe o no hay ref, el contador queda "sin
 *     referral" y el 60% admin + 10% cashback son las únicas comisiones
 */
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RefPage() {
  const router = useRouter();
  const params = useParams();
  const codigoRaw = params?.codigo;
  const codigo = Array.isArray(codigoRaw) ? codigoRaw[0] : codigoRaw;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (codigo && typeof codigo === 'string') {
      const codigoNormalizado = codigo.toUpperCase().trim();
      try {
        localStorage.setItem('contaflow_ref', codigoNormalizado);
      } catch {
        // localStorage bloqueado (modo incógnito estricto, etc.) — seguimos al login con query param
      }
      router.replace(`/login?ref=${encodeURIComponent(codigoNormalizado)}`);
    } else {
      router.replace('/login');
    }
  }, [codigo, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F2444 0%, #1B3A6B 100%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, margin: '0 auto 16px',
          border: '3px solid rgba(255,255,255,0.2)',
          borderTopColor: '#00A651',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p>Verificando código de referido...</p>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    </div>
  );
}

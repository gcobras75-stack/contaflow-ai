/**
 * Utilidades para extraer metadata del request HTTP:
 * IP del cliente, user-agent y heurística de dispositivo.
 *
 * Usado por rutas que requieren evidencia forense (aceptaciones legales,
 * auditoría FIEL). No depende de frameworks — funciona con NextRequest
 * o con cualquier objeto que exponga Headers.
 */

type HeadersLike = { get(name: string): string | null };

/**
 * IP real del cliente respetando la cadena de proxies de Vercel.
 *
 * Vercel pone la IP original en el primer elemento de x-forwarded-for.
 * Los siguientes son proxies intermedios — no son la IP del cliente.
 * Algunos proxies usan x-real-ip como fallback.
 */
export function getClientIp(req: { headers: HeadersLike }): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return null;
}

/** User agent completo del cliente, o null si no vino. */
export function getUserAgent(req: { headers: HeadersLike }): string | null {
  return req.headers.get('user-agent') ?? null;
}

/**
 * Heurística de dispositivo a partir del user-agent.
 *
 * Objetivo: generar un resumen legible tipo "iPhone Safari" o
 * "Windows 11 Chrome 126" para meter en notas de auditoría, sin depender
 * de una librería de parsing (ua-parser-js pesa ~40KB).
 *
 * No es perfecto — es una pista para inspección humana, no para telemetría.
 */
export function getDeviceHint(req: { headers: HeadersLike }): string | null {
  const ua = getUserAgent(req);
  if (!ua) return null;

  const parts: string[] = [];

  // SO
  if (/iPhone|iPad|iPod/i.test(ua)) {
    const m = ua.match(/OS (\d+[_\d]*)/);
    parts.push(m ? `iOS ${m[1].replace(/_/g, '.')}` : 'iOS');
  } else if (/Android/i.test(ua)) {
    const m = ua.match(/Android (\d+(?:\.\d+)?)/);
    parts.push(m ? `Android ${m[1]}` : 'Android');
  } else if (/Windows NT/i.test(ua)) {
    const m = ua.match(/Windows NT (\d+\.\d+)/);
    const map: Record<string, string> = {
      '10.0': 'Windows 10/11', '6.3': 'Windows 8.1', '6.2': 'Windows 8',
      '6.1': 'Windows 7',
    };
    parts.push(m ? (map[m[1]] ?? `Windows NT ${m[1]}`) : 'Windows');
  } else if (/Mac OS X/i.test(ua)) {
    const m = ua.match(/Mac OS X (\d+[_\d]*)/);
    parts.push(m ? `macOS ${m[1].replace(/_/g, '.')}` : 'macOS');
  } else if (/Linux/i.test(ua)) {
    parts.push('Linux');
  }

  // Navegador
  if (/Edg\//i.test(ua)) {
    const m = ua.match(/Edg\/(\d+)/);
    parts.push(m ? `Edge ${m[1]}` : 'Edge');
  } else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
    const m = ua.match(/Chrome\/(\d+)/);
    parts.push(m ? `Chrome ${m[1]}` : 'Chrome');
  } else if (/Firefox\//i.test(ua)) {
    const m = ua.match(/Firefox\/(\d+)/);
    parts.push(m ? `Firefox ${m[1]}` : 'Firefox');
  } else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) {
    const m = ua.match(/Version\/(\d+)/);
    parts.push(m ? `Safari ${m[1]}` : 'Safari');
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

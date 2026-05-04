/**
 * Registra la aceptación de documentos legales por parte de un usuario.
 *
 * Modelo: append-only. Cada aceptación es un evento inmutable con
 * timestamp, IP y user-agent para evidencia legal (art. 89 Código de
 * Comercio — valor probatorio de mensajes de datos).
 *
 * POST /api/aceptar-legal
 * Headers: Authorization: Bearer <jwt>
 * Body:   { acceptances: [{ code: 'terminos', version: '1.0' }, ...] }
 * → 200   { ok: true, inserted: 4 }
 * → 400   faltan campos / códigos inválidos
 * → 401   sin JWT
 * → 403   JWT inválido
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp, getUserAgent } from '@/lib/request-meta';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type AcceptanceInput = {
  code:        string;
  version:     string;
  empresa_id?: string | null;  // opcional: para aceptaciones atadas a un cliente específico
};

export async function POST(req: NextRequest) {
  try {
    // ── 1. Autenticación ────────────────────────────────────
    const authHeader = req.headers.get('authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '').trim();
    if (!jwt) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 403 });

    // ── 2. Validar body ─────────────────────────────────────
    const body = await req.json() as { acceptances?: AcceptanceInput[] };
    const acceptances = body.acceptances;

    if (!Array.isArray(acceptances) || acceptances.length === 0) {
      return NextResponse.json(
        { error: 'Falta el array "acceptances" con al menos un documento.' },
        { status: 400 },
      );
    }

    for (const a of acceptances) {
      if (!a.code || !a.version) {
        return NextResponse.json(
          { error: 'Cada aceptación requiere { code, version }.' },
          { status: 400 },
        );
      }
    }

    // ── 3. Validar que los documentos existen y están activos ───
    const codes    = acceptances.map(a => a.code);
    const versions = acceptances.map(a => a.version);

    const { data: docs, error: docsErr } = await supabaseAdmin
      .from('legal_documents')
      .select('code, version, is_active')
      .in('code', codes)
      .in('version', versions);

    if (docsErr) throw docsErr;

    const validKeys = new Set(
      (docs ?? [])
        .filter(d => d.is_active)
        .map(d => `${d.code}:${d.version}`),
    );

    const missing = acceptances.filter(
      a => !validKeys.has(`${a.code}:${a.version}`),
    );

    if (missing.length > 0) {
      return NextResponse.json({
        error: 'Algunos documentos no existen o no están activos.',
        missing,
      }, { status: 400 });
    }

    // ── 4. Buscar despacho_id del usuario (opcional: puede ser null) ─
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('despacho_id')
      .eq('id', user.id)
      .single();

    // ── 5. Insertar registros (append-only) ────────────────
    const ip = getClientIp(req);
    const ua = getUserAgent(req);
    const now = new Date().toISOString();

    const rows = acceptances.map(a => ({
      user_id:          user.id,
      despacho_id:      usuario?.despacho_id ?? null, // puede ser null pre-despacho
      empresa_id:       a.empresa_id ?? null,          // opcional: aceptación atada a un cliente
      document_code:    a.code,
      document_version: a.version,
      accepted_at:      now,
      ip_address:       ip,
      user_agent:       ua,
      is_accepted:      true,
    }));

    const { error: insErr } = await supabaseAdmin
      .from('legal_acceptances')
      .insert(rows);

    if (insErr) throw insErr;

    return NextResponse.json({ ok: true, inserted: rows.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

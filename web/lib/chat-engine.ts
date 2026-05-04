/**
 * Lógica compartida entre /api/chat-contador y /api/chat-cliente.
 *
 * Cada endpoint tiene su propio system prompt y criterios de contexto,
 * pero el flujo es idéntico:
 *   1. auth JWT
 *   2. rate limit (20 msgs/hora por usuario)
 *   3. load historial último 20 msgs desde chat_messages
 *   4. build contexto fiscal si hay empresa
 *   5. fetch Claude con timeout 25s (límite Vercel 30s)
 *   6. persistir user msg + assistant msg con token counts
 *   7. retornar reply + message_id + tokens
 */
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
export const CLAUDE_MODEL   = 'claude-sonnet-4-6';

export const RATE_LIMIT_MAX_PER_HOUR = 20;
export const HISTORY_WINDOW          = 20;
export const CLAUDE_TIMEOUT_MS       = 25_000;
export const MAX_OUTPUT_TOKENS       = 1024;

export type RolChat = 'contador' | 'cliente';

export type ChatMessage = {
  role:    'user' | 'assistant';
  content: string;
};

export type ContextoEmpresa = {
  id:             string;
  nombre:         string;
  rfc:            string;
  giro:           string | null;
  regimen_fiscal: string | null;
  despacho_id:    string | null;
};

export type ChatResult =
  | { ok: true; reply: string; message_id: string; tokens_in: number; tokens_out: number }
  | { ok: false; status: number; error: string };

/** Autentica el JWT del header Authorization y retorna el user. */
export async function autenticar(
  supabase: SupabaseClient,
  req: NextRequest,
): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const auth = req.headers.get('authorization') ?? '';
  const jwt  = auth.replace('Bearer ', '').trim();
  if (!jwt) return { ok: false, status: 401, error: 'No autorizado' };

  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) return { ok: false, status: 401, error: 'Token inválido' };

  return { ok: true, userId: user.id };
}

/** Verifica rate limit contra chat_msgs_count_window. */
export async function verificarRateLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; count: number } | { ok: false; count: number }> {
  const { data, error } = await supabase.rpc('chat_msgs_count_window', {
    p_user_id: userId,
    p_minutes: 60,
  });
  if (error) {
    // Si el RPC falla, fail-open (no bloqueamos al usuario por un error interno).
    console.error('[chat-engine] rate limit rpc error:', error.message);
    return { ok: true, count: 0 };
  }
  const count = (data as number) ?? 0;
  if (count >= RATE_LIMIT_MAX_PER_HOUR) {
    return { ok: false, count };
  }
  return { ok: true, count };
}

/** Carga últimos N mensajes del historial del usuario para este rol_chat. */
export async function cargarHistorial(
  supabase: SupabaseClient,
  userId: string,
  rolChat: RolChat,
  empresaId?: string | null,
): Promise<ChatMessage[]> {
  let query = supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('user_id', userId)
    .eq('rol_chat', rolChat)
    .order('created_at', { ascending: false })
    .limit(HISTORY_WINDOW);

  if (empresaId) query = query.eq('empresa_id', empresaId);

  const { data, error } = await query;
  if (error) {
    console.error('[chat-engine] cargar historial error:', error.message);
    return [];
  }

  // Supabase devuelve desc; invertimos para orden cronológico.
  const rows = (data ?? []).reverse();
  return rows.map(r => ({
    role:    r.role as 'user' | 'assistant',
    content: r.content,
  }));
}

/** Trae datos de la empresa y sus CFDIs recientes para contexto fiscal. */
export async function buildContextoFiscal(
  supabase: SupabaseClient,
  empresa: ContextoEmpresa,
): Promise<string> {
  const partes: string[] = [];
  partes.push('INFORMACIÓN DE LA EMPRESA:');
  partes.push(`- Nombre: ${empresa.nombre}`);
  partes.push(`- RFC: ${empresa.rfc}`);
  if (empresa.giro)           partes.push(`- Giro: ${empresa.giro}`);
  if (empresa.regimen_fiscal) partes.push(`- Régimen fiscal: ${empresa.regimen_fiscal}`);

  // Últimos CFDIs (top 10 del último mes) para que Claude conozca los movimientos recientes
  const haceUnMes = new Date();
  haceUnMes.setMonth(haceUnMes.getMonth() - 1);
  const { data: cfdis } = await supabase
    .from('cfdis')
    .select('tipo, subtotal, iva, total, fecha_emision, rfc_emisor, rfc_receptor')
    .eq('empresa_id', empresa.id)
    .gte('fecha_emision', haceUnMes.toISOString().slice(0, 10))
    .order('fecha_emision', { ascending: false })
    .limit(10);

  if (cfdis && cfdis.length > 0) {
    partes.push('');
    partes.push('CFDIs RECIENTES (últimos 30 días, top 10):');
    for (const c of cfdis) {
      const contraparte = c.tipo === 'ingreso' ? c.rfc_receptor : c.rfc_emisor;
      partes.push(`- ${c.fecha_emision} · ${c.tipo} · $${Number(c.total).toFixed(2)} MXN · ${contraparte ?? 'sin RFC'}`);
    }

    // Totales del período
    const ingresos = cfdis.filter(c => c.tipo === 'ingreso').reduce((s, c) => s + Number(c.total ?? 0), 0);
    const egresos  = cfdis.filter(c => c.tipo === 'egreso').reduce((s, c) => s + Number(c.total ?? 0), 0);
    const iva      = cfdis.reduce((s, c) => s + Number(c.iva ?? 0), 0);
    partes.push('');
    partes.push(`TOTALES ÚLTIMO MES: Ingresos $${ingresos.toFixed(2)} · Egresos $${egresos.toFixed(2)} · IVA $${iva.toFixed(2)}`);
  } else {
    partes.push('');
    partes.push('(Sin CFDIs registrados en los últimos 30 días)');
  }

  return partes.join('\n');
}

/** Llama a Claude con timeout controlado. */
export async function llamarClaude(params: {
  apiKey:  string;
  system:  string;
  messages: ChatMessage[];
}): Promise<
  | { ok: true; reply: string; tokens_in: number; tokens_out: number }
  | { ok: false; status: number; error: string }
> {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         params.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system:     params.system,
        messages:   params.messages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const txt = await response.text().catch(() => '');
      return { ok: false, status: 502, error: `Claude API ${response.status}: ${txt.slice(0, 200)}` };
    }

    const data = await response.json() as {
      content?: { text?: string }[];
      usage?:   { input_tokens?: number; output_tokens?: number };
    };

    const reply = data.content?.[0]?.text?.trim() ?? '';
    if (!reply) {
      return { ok: false, status: 502, error: 'Claude respondió vacío' };
    }

    return {
      ok:         true,
      reply,
      tokens_in:  data.usage?.input_tokens  ?? 0,
      tokens_out: data.usage?.output_tokens ?? 0,
    };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, status: 504, error: 'Claude timeout (>25s)' };
    }
    return { ok: false, status: 500, error: e instanceof Error ? e.message : 'Error llamando a Claude' };
  }
}

/** Persiste el par (user msg, assistant msg) en chat_messages. */
export async function persistirMensajes(
  supabase: SupabaseClient,
  params: {
    userId:      string;
    despachoId:  string | null;
    empresaId:   string | null;
    rolChat:     RolChat;
    userContent: string;
    assistantContent: string;
    tokensIn:    number;
    tokensOut:   number;
  },
): Promise<{ userMsgId: string | null; assistantMsgId: string | null }> {
  // Insert user msg
  const { data: userRow, error: userErr } = await supabase
    .from('chat_messages')
    .insert({
      user_id:     params.userId,
      despacho_id: params.despachoId,
      empresa_id:  params.empresaId,
      rol_chat:    params.rolChat,
      role:        'user',
      content:     params.userContent,
    })
    .select('id')
    .single();

  if (userErr) {
    console.error('[chat-engine] insert user msg error:', userErr.message);
  }

  // Insert assistant msg with token counts
  const { data: asstRow, error: asstErr } = await supabase
    .from('chat_messages')
    .insert({
      user_id:       params.userId,
      despacho_id:   params.despachoId,
      empresa_id:    params.empresaId,
      rol_chat:      params.rolChat,
      role:          'assistant',
      content:       params.assistantContent,
      tokens_input:  params.tokensIn,
      tokens_output: params.tokensOut,
    })
    .select('id')
    .single();

  if (asstErr) {
    console.error('[chat-engine] insert assistant msg error:', asstErr.message);
  }

  return {
    userMsgId:      userRow?.id ?? null,
    assistantMsgId: asstRow?.id ?? null,
  };
}

/** Helper de respuesta de error estándar. */
export function errResponse(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

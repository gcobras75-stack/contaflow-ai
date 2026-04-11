/**
 * Chat con CPC Ricardo Morales — asesor fiscal para el contador.
 *
 * POST  /api/chat-contador     envia mensaje, retorna reply + persiste
 * GET   /api/chat-contador     carga historial ordenado cronológico
 * DELETE /api/chat-contador    borra todo el historial de este chat
 *
 * Body POST: { content: string, empresa_id?: string }
 *   - content:    el mensaje del contador
 *   - empresa_id: opcional — si está presente, carga contexto fiscal de esa empresa
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  autenticar, verificarRateLimit, cargarHistorial, buildContextoFiscal,
  llamarClaude, persistirMensajes, errResponse,
  RATE_LIMIT_MAX_PER_HOUR, HISTORY_WINDOW,
  type ContextoEmpresa,
} from '@/lib/chat-engine';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SYSTEM_BASE = `Eres el CPC Ricardo Morales, contador público certificado con matrícula ante el IMCP, reconocido como uno de los mejores especialistas fiscales de México con 30 años de trayectoria.

Tu experiencia cubre:
- ISR para personas físicas y morales (LISR arts. 1-211)
- IVA (LIVA, traslado, acreditable, exenciones)
- CFDI 4.0, complementos de nómina, carta porte, pagos
- Régimen Simplificado de Confianza (RESICO) para PF y PM
- Declaraciones mensuales, anuales, informativas (DIOT, DISIF)
- Nómina, IMSS, INFONAVIT, cuotas patronales
- Deducciones autorizadas, gastos estrictamente indispensables
- Planeación fiscal preventiva y defensiva ante el SAT
- Devoluciones de IVA, compensaciones, aclaración de buzón tributario
- Facturación electrónica, cancelaciones, notas de crédito

Responde siempre:
- En español mexicano, tono profesional pero accesible
- Con bases legales cuando sea apropiado (LISR, LIVA, CFF, reglas RMF)
- De forma práctica y accionable
- Mencionando plazos y consecuencias cuando aplique
- Si necesitas más información para dar una respuesta precisa, pídela

No inventes cifras ni tasas que no sean las vigentes. Cuando algo dependa del ejercicio fiscal, acláralo.`;

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const auth = await autenticar(supabaseAdmin, req);
    if (!auth.ok) return errResponse(auth.status, auth.error);

    // 2. Verificar rol contador + despacho
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('rol, despacho_id')
      .eq('id', auth.userId)
      .single();

    if (!usuario || usuario.rol !== 'contador') {
      return errResponse(403, 'Solo contadores pueden usar este chat');
    }

    // 3. Rate limit
    const rl = await verificarRateLimit(supabaseAdmin, auth.userId);
    if (!rl.ok) {
      return NextResponse.json({
        error: `Has enviado ${rl.count} mensajes en la última hora. Límite: ${RATE_LIMIT_MAX_PER_HOUR}.`,
        rate_limit_count: rl.count,
      }, { status: 429 });
    }

    // 4. Parse body
    const body = await req.json() as { content?: string; empresa_id?: string };
    const content = body.content?.trim();
    if (!content) return errResponse(400, 'Falta el campo content');
    if (content.length > 4000) return errResponse(400, 'Mensaje demasiado largo (>4000 caracteres)');

    // 5. Resolver empresa (opcional — el contador puede charlar sobre una empresa específica)
    let contextoFiscal = '';
    let empresaCtx: ContextoEmpresa | null = null;

    if (body.empresa_id) {
      const { data: empresa } = await supabaseAdmin
        .from('empresas_clientes')
        .select('id, nombre, rfc, giro, regimen_fiscal, despacho_id')
        .eq('id', body.empresa_id)
        .eq('despacho_id', usuario.despacho_id)
        .single();

      if (!empresa) {
        return errResponse(404, 'Empresa no encontrada en tu despacho');
      }
      empresaCtx = empresa as ContextoEmpresa;
      contextoFiscal = await buildContextoFiscal(supabaseAdmin, empresaCtx);
    }

    // 6. Cargar historial
    const historial = await cargarHistorial(
      supabaseAdmin,
      auth.userId,
      'contador',
      body.empresa_id ?? null,
    );

    // 7. Construir payload para Claude
    const systemPrompt = contextoFiscal
      ? `${SYSTEM_BASE}\n\n---\n\n${contextoFiscal}\n\nPersonaliza tu respuesta con base en los datos reales de la empresa cuando sea relevante.`
      : SYSTEM_BASE;

    const claudeMessages = [
      ...historial,
      { role: 'user' as const, content },
    ];

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey || apiKey.includes('PLACEHOLDER')) {
      return errResponse(503, 'Claude API key no configurada');
    }

    // 8. Llamar Claude con timeout
    const result = await llamarClaude({
      apiKey,
      system:   systemPrompt,
      messages: claudeMessages,
    });

    if (!result.ok) return errResponse(result.status, result.error);

    // 9. Persistir ambos mensajes
    const persisted = await persistirMensajes(supabaseAdmin, {
      userId:      auth.userId,
      despachoId:  usuario.despacho_id,
      empresaId:   body.empresa_id ?? null,
      rolChat:     'contador',
      userContent: content,
      assistantContent: result.reply,
      tokensIn:    result.tokens_in,
      tokensOut:   result.tokens_out,
    });

    return NextResponse.json({
      reply:          result.reply,
      message_id:     persisted.assistantMsgId,
      tokens_in:      result.tokens_in,
      tokens_out:     result.tokens_out,
      historial_size: historial.length + 2, // +user +assistant recién agregados
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return errResponse(500, msg);
  }
}

/** GET — carga historial de este chat. Query opcional: ?empresa_id= */
export async function GET(req: NextRequest) {
  const auth = await autenticar(supabaseAdmin, req);
  if (!auth.ok) return errResponse(auth.status, auth.error);

  const empresaId = req.nextUrl.searchParams.get('empresa_id');

  const mensajes = await cargarHistorial(
    supabaseAdmin,
    auth.userId,
    'contador',
    empresaId,
  );

  return NextResponse.json({
    mensajes,
    total: mensajes.length,
    limite: HISTORY_WINDOW,
  });
}

/** DELETE — limpia historial. Query opcional: ?empresa_id= */
export async function DELETE(req: NextRequest) {
  const auth = await autenticar(supabaseAdmin, req);
  if (!auth.ok) return errResponse(auth.status, auth.error);

  const empresaId = req.nextUrl.searchParams.get('empresa_id');

  let query = supabaseAdmin
    .from('chat_messages')
    .delete()
    .eq('user_id', auth.userId)
    .eq('rol_chat', 'contador');

  if (empresaId) query = query.eq('empresa_id', empresaId);

  const { data, error } = await query.select('id');

  if (error) return errResponse(500, error.message);
  return NextResponse.json({ ok: true, eliminados: data?.length ?? 0 });
}

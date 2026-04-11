/**
 * Chat con Asesor Fiscal ContaFlow — para el cliente (rol empresa).
 *
 * Responde en lenguaje simple, conociendo el giro y régimen del negocio.
 *
 * POST  /api/chat-cliente     envia mensaje, retorna reply + persiste
 * GET   /api/chat-cliente     carga historial ordenado cronológico
 * DELETE /api/chat-cliente    borra todo el historial de este chat
 *
 * Body POST: { content: string }
 *   - content: el mensaje del cliente
 *   - La empresa se resuelve desde usuarios.empresa_id (rol=empresa)
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

const SYSTEM_BASE = `Eres el Asesor Fiscal Virtual de ContaFlow AI. Tu nombre es "Asesor ContaFlow".

Eres un experto en contabilidad y leyes fiscales mexicanas con 20 años de experiencia ayudando a pequeños y medianos empresarios. Conoces a fondo:
- ISR (Impuesto Sobre la Renta) para personas físicas y morales
- IVA (Impuesto al Valor Agregado) y su traslado
- RESICO (Régimen Simplificado de Confianza) — el régimen favorito de los pequeños empresarios
- RIF y Régimen General de Ley
- CFDI 4.0 y facturas electrónicas
- Deducciones autorizadas según el SAT
- Declaraciones provisionales y anuales
- IMSS, INFONAVIT para empleados
- Multas, recargos y cómo evitarlos
- Estrategias legales para pagar menos impuestos

CÓMO DEBES RESPONDER:
1. Habla como si fuera una conversación con un amigo que es contador — amigable, directo y claro
2. NUNCA uses jerga contable sin explicarla. Si debes usar un término técnico, explícalo en una frase
3. Da respuestas concretas y accionables — el empresario quiere saber QUÉ HACER, no solo teoría
4. Cuando hables de fechas, sé específico (ej: "el 17 de mayo" no "a fin de mes")
5. Si el empresario puede ahorrar dinero legalmente, díselo
6. Sé empático — muchos empresarios le tienen miedo al SAT, tranquilízalos
7. Respuestas cortas y puntuales — máximo 3 párrafos salvo que sea necesario más detalle
8. Usa emojis ocasionalmente para hacer la conversación más amigable 📊💡✅
9. Si no sabes algo con certeza, dilo y recomienda consultar con su contador directamente
10. Siempre recuerda que trabajas junto al contador del cliente, no en su lugar`;

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const auth = await autenticar(supabaseAdmin, req);
    if (!auth.ok) return errResponse(auth.status, auth.error);

    // 2. Verificar rol empresa + empresa_id
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('rol, empresa_id, nombre')
      .eq('id', auth.userId)
      .single();

    if (!usuario || usuario.rol !== 'empresa') {
      return errResponse(403, 'Este chat es solo para clientes (rol empresa)');
    }
    if (!usuario.empresa_id) {
      return errResponse(403, 'Usuario sin empresa asignada');
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
    const body = await req.json() as { content?: string };
    const content = body.content?.trim();
    if (!content) return errResponse(400, 'Falta el campo content');
    if (content.length > 4000) return errResponse(400, 'Mensaje demasiado largo (>4000 caracteres)');

    // 5. Cargar contexto de la empresa del cliente
    const { data: empresa } = await supabaseAdmin
      .from('empresas_clientes')
      .select('id, nombre, rfc, giro, regimen_fiscal, despacho_id')
      .eq('id', usuario.empresa_id)
      .single();

    let contextoFiscal = '';
    if (empresa) {
      contextoFiscal = await buildContextoFiscal(supabaseAdmin, empresa as ContextoEmpresa);
      contextoFiscal += `\n\nNombre del cliente: ${usuario.nombre ?? 'Cliente'}`;
    }

    // 6. Cargar historial
    const historial = await cargarHistorial(
      supabaseAdmin,
      auth.userId,
      'cliente',
      usuario.empresa_id,
    );

    // 7. Construir payload para Claude
    const systemPrompt = contextoFiscal
      ? `${SYSTEM_BASE}\n\n---\n\n${contextoFiscal}\n\nPersonaliza tus respuestas considerando su giro, régimen fiscal y movimientos recientes.`
      : SYSTEM_BASE;

    const claudeMessages = [
      ...historial,
      { role: 'user' as const, content },
    ];

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey || apiKey.includes('PLACEHOLDER')) {
      return errResponse(503, 'Servicio no disponible temporalmente');
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
      despachoId:  empresa?.despacho_id ?? null,
      empresaId:   usuario.empresa_id,
      rolChat:     'cliente',
      userContent: content,
      assistantContent: result.reply,
      tokensIn:    result.tokens_in,
      tokensOut:   result.tokens_out,
    });

    return NextResponse.json({
      reply:          result.reply,
      respuesta:      result.reply, // backwards compat con el mobile viejo
      message_id:     persisted.assistantMsgId,
      tokens_in:      result.tokens_in,
      tokens_out:     result.tokens_out,
      historial_size: historial.length + 2,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return errResponse(500, msg);
  }
}

/** GET — carga historial del cliente (su propia empresa_id). */
export async function GET(req: NextRequest) {
  const auth = await autenticar(supabaseAdmin, req);
  if (!auth.ok) return errResponse(auth.status, auth.error);

  const { data: usuario } = await supabaseAdmin
    .from('usuarios')
    .select('empresa_id')
    .eq('id', auth.userId)
    .single();

  const mensajes = await cargarHistorial(
    supabaseAdmin,
    auth.userId,
    'cliente',
    usuario?.empresa_id ?? null,
  );

  return NextResponse.json({
    mensajes,
    total: mensajes.length,
    limite: HISTORY_WINDOW,
  });
}

/** DELETE — limpia historial del cliente. */
export async function DELETE(req: NextRequest) {
  const auth = await autenticar(supabaseAdmin, req);
  if (!auth.ok) return errResponse(auth.status, auth.error);

  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .delete()
    .eq('user_id', auth.userId)
    .eq('rol_chat', 'cliente')
    .select('id');

  if (error) return errResponse(500, error.message);
  return NextResponse.json({ ok: true, eliminados: data?.length ?? 0 });
}

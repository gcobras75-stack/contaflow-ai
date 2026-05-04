/**
 * Analiza una Constancia de Situación Fiscal (CSF) del SAT.
 * Recibe el PDF como base64, usa Claude para extraer:
 * - Nombre / Razón Social
 * - RFC
 * - Actividad económica / Giro (código y descripción SCIAN)
 * - Régimen fiscal
 * - Domicilio fiscal
 * Actualiza la empresa en la BD con los datos extraídos.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL   = 'claude-sonnet-4-6';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const jwt  = auth.replace('Bearer ', '').trim();
    if (!jwt) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { empresa_id, pdf_base64 } = await req.json() as {
      empresa_id: string;
      pdf_base64: string;
    };

    if (!empresa_id || !pdf_base64) {
      return NextResponse.json({ error: 'Falta empresa_id o pdf_base64' }, { status: 400 });
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey || apiKey.includes('PLACEHOLDER')) {
      return NextResponse.json({ error: 'Claude API key no configurada' }, { status: 503 });
    }

    // Enviar PDF a Claude para extracción
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdf_base64,
              },
            },
            {
              type: 'text',
              text: `Analiza esta Constancia de Situación Fiscal del SAT México y extrae la siguiente información en formato JSON exacto:
{
  "nombre": "Nombre completo o razón social",
  "rfc": "RFC con homoclave",
  "regimen": "Nombre del régimen fiscal",
  "actividad_principal": "Descripción de la actividad económica principal",
  "codigo_actividad": "Código SCIAN si está disponible",
  "cp": "Código postal del domicilio fiscal",
  "estado": "Estado de la república"
}
Solo devuelve el JSON, sin explicaciones adicionales.`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Error al procesar el PDF con IA' }, { status: 500 });
    }

    const data = await response.json() as { content?: { text?: string }[] };
    const texto = data.content?.[0]?.text?.trim() ?? '{}';

    let datosCSF: Record<string, string> = {};
    try {
      // Limpiar el JSON por si Claude agrega markdown
      const jsonStr = texto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      datosCSF = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: 'No se pudo parsear la respuesta de IA', raw: texto }, { status: 500 });
    }

    // Actualizar la empresa con los datos extraídos
    const updates: Record<string, string | null> = {};
    if (datosCSF.actividad_principal) {
      const giro = datosCSF.codigo_actividad
        ? `${datosCSF.codigo_actividad} — ${datosCSF.actividad_principal}`
        : datosCSF.actividad_principal;
      updates.giro = giro;
    }
    if (datosCSF.regimen) updates.regimen_fiscal = datosCSF.regimen;

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin
        .from('empresas_clientes')
        .update(updates)
        .eq('id', empresa_id);
    }

    return NextResponse.json({ ok: true, datos: datosCSF });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Sube la FIEL de una empresa cliente.
 *
 * Reglas del modelo de negocio:
 * - Solo un contador puede subir. Rol empresa → 403.
 * - La empresa destino debe pertenecer al despacho del contador autenticado.
 * - La FIEL se guarda en la tabla dedicada empresa_fiel (no en empresas_clientes).
 * - Campos cert/key/password se cifran con AES-256-GCM antes de persistir.
 * - empresas_clientes.fiel_disponible se actualiza como flag público para la app móvil.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Fiel } from '@nodecfdi/sat-ws-descarga-masiva';
import { encryptFiel } from '@/lib/fiel-crypto';
import { logFielEvent } from '@/lib/fiel-audit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    // Auth: leer JWT del header
    const auth = req.headers.get('authorization') ?? '';
    const jwt = auth.replace('Bearer ', '').trim();
    if (!jwt) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const formData = await req.formData();
    const empresaId = formData.get('empresa_id') as string;
    const certFile  = formData.get('cert') as File | null;
    const keyFile   = formData.get('key')  as File | null;
    const password  = formData.get('password') as string;

    if (!empresaId || !certFile || !keyFile || !password) {
      return NextResponse.json({ error: 'Faltan campos requeridos: empresa_id, cert, key, password' }, { status: 400 });
    }

    // Verificar rol y despacho del usuario autenticado.
    // Solo 'contador' puede subir FIEL. Rol 'empresa' NUNCA sube su propia FIEL:
    // ese flujo es responsabilidad del despacho (modelo de negocio).
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('rol, despacho_id')
      .eq('id', user.id)
      .single();

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 });
    }
    if (usuario.rol !== 'contador') {
      return NextResponse.json({
        error: 'Solo el contador puede subir la FIEL de sus empresas cliente.',
      }, { status: 403 });
    }
    if (!usuario.despacho_id) {
      return NextResponse.json({ error: 'Contador sin despacho asignado' }, { status: 403 });
    }

    // Verificar que la empresa pertenece al despacho del contador
    const { data: empresa } = await supabaseAdmin
      .from('empresas_clientes')
      .select('id, rfc, despacho_id')
      .eq('id', empresaId)
      .eq('despacho_id', usuario.despacho_id)
      .single();
    if (!empresa) {
      return NextResponse.json({ error: 'Empresa no encontrada en tu despacho' }, { status: 404 });
    }

    // Leer archivos
    const certBuffer = Buffer.from(await certFile.arrayBuffer());
    const keyBuffer  = Buffer.from(await keyFile.arrayBuffer());

    // Validar FIEL con la librería (los archivos DER van como binary string)
    let fiel: InstanceType<typeof Fiel>;
    try {
      fiel = Fiel.create(certBuffer.toString('binary'), keyBuffer.toString('binary'), password);
    } catch {
      await logFielEvent(supabaseAdmin, {
        empresaId:  empresa.id,
        despachoId: empresa.despacho_id,
        uploadedBy: user.id,
        action:     'rechazo_validacion',
        req,
        notes:      'No se pudo leer la FIEL: archivos o contraseña incorrectos',
      });
      return NextResponse.json({ error: 'No se pudo leer la FIEL. Verifica que los archivos y contraseña sean correctos.' }, { status: 422 });
    }

    if (!fiel.isValid()) {
      await logFielEvent(supabaseAdmin, {
        empresaId:  empresa.id,
        despachoId: empresa.despacho_id,
        uploadedBy: user.id,
        action:     'rechazo_validacion',
        req,
        notes:      'FIEL inválida o vencida',
      });
      return NextResponse.json({ error: 'La FIEL no es válida o está vencida.' }, { status: 422 });
    }

    const rfcFiel = fiel.getRfc();
    if (rfcFiel.toUpperCase() !== empresa.rfc.toUpperCase()) {
      await logFielEvent(supabaseAdmin, {
        empresaId:  empresa.id,
        despachoId: empresa.despacho_id,
        uploadedBy: user.id,
        action:     'rechazo_validacion',
        req,
        notes:      `RFC FIEL (${rfcFiel}) no coincide con RFC empresa (${empresa.rfc})`,
      });
      return NextResponse.json({
        error: `El RFC de la FIEL (${rfcFiel}) no coincide con el RFC de la empresa (${empresa.rfc}).`,
      }, { status: 422 });
    }

    // Cifrar antes de persistir. NUNCA guardar .key ni password en claro:
    // la FIEL es el instrumento legal equivalente a la firma autógrafa del
    // contribuyente ante el SAT (art. 17-D CFF). Un dump de BD con FIEL en
    // claro habilita suplantación de identidad fiscal (art. 113 bis CFF).
    const certEnc = encryptFiel(certBuffer);           // el .cer no es secreto, pero cifrar uniforma el formato
    const keyEnc  = encryptFiel(keyBuffer);            // .key es secreto — OBLIGATORIO cifrar
    const passEnc = encryptFiel(password);             // password de la FIEL — OBLIGATORIO cifrar

    // Upsert en empresa_fiel (tabla dedicada con RLS solo-contador).
    // ON CONFLICT por empresa_id → si ya existía, se actualiza.
    const { error: fielErr } = await supabaseAdmin
      .from('empresa_fiel')
      .upsert({
        empresa_id:   empresa.id,
        despacho_id:  empresa.despacho_id,
        rfc:          empresa.rfc,
        cert_enc:     certEnc,
        key_enc:      keyEnc,
        password_enc: passEnc,
        uploaded_by:  user.id,
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'empresa_id' });

    if (fielErr) throw fielErr;

    // Flag público en empresas_clientes para que la app móvil sepa si está lista.
    // NO se guardan datos sensibles aquí.
    const { error: flagErr } = await supabaseAdmin
      .from('empresas_clientes')
      .update({ fiel_disponible: true })
      .eq('id', empresa.id);

    if (flagErr) throw flagErr;

    // Registro forense de subida exitosa. Debe quedar DESPUÉS del upsert
    // para que no queden eventos 'subida' apuntando a FIELs que nunca se
    // persistieron (si hubiera un error entre validación y upsert).
    await logFielEvent(supabaseAdmin, {
      empresaId:  empresa.id,
      despachoId: empresa.despacho_id,
      uploadedBy: user.id,
      action:     'subida',
      req,
      notes:      `RFC ${rfcFiel}`,
    });

    return NextResponse.json({ ok: true, rfc: rfcFiel });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

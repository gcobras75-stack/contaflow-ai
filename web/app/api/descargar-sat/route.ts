import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  Fiel,
  FielRequestBuilder,
  HttpsWebClient,
  Service,
  ServiceEndpoints,
  QueryParameters,
  DateTimePeriod,
  DateTime,
  RfcMatch,
  DownloadType,
  RequestType,
} from '@nodecfdi/sat-ws-descarga-masiva';
import JSZip from 'jszip';
import { decryptFiel, decryptFielString, isEncrypted } from '@/lib/fiel-crypto';
import { logFielEvent } from '@/lib/fiel-audit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── Tipos de CFDI SAT → internos ────────────────────────────────────────────
const TIPO_MAP: Record<string, string> = {
  I: 'ingreso',
  E: 'egreso',
  N: 'nomina',
  T: 'traslado',
  P: 'pago',
};

// ── Parsear XML de un CFDI ──────────────────────────────────────────────────
function attr(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`(?:^|\\s)${name}="([^"]+)"`, 'i'));
  return m ? m[1] : null;
}

type Concepto = {
  descripcion:    string;
  cantidad:       number;
  valorUnitario:  number;
  importe:        number;
  unidad:         string | null;
  claveProdServ:  string | null;
  claveUnidad:    string | null;
};

function parseCfdiXml(xml: string) {
  const uuid       = attr(xml, 'UUID')?.toLowerCase() ?? null;
  const tipoRaw    = attr(xml, 'TipoDeComprobante');
  const tipo       = tipoRaw ? (TIPO_MAP[tipoRaw.toUpperCase()] ?? null) : null;
  const subtotal   = parseFloat(attr(xml, 'SubTotal') ?? '0') || 0;
  const total      = parseFloat(attr(xml, 'Total') ?? '0') || 0;
  const ivaRaw     = attr(xml, 'TotalImpuestosTrasladados');
  const iva        = ivaRaw ? parseFloat(ivaRaw) : 0;
  const fechaRaw   = attr(xml, 'Fecha');
  const fecha      = fechaRaw ? fechaRaw.slice(0, 10) : null;

  // RFC Emisor y Receptor
  const emisorMatch   = xml.match(/(?:cfdi:)?Emisor[^>]*\s+Rfc="([^"]+)"/i);
  const receptorMatch = xml.match(/(?:cfdi:)?Receptor[^>]*\s+Rfc="([^"]+)"/i);
  const rfcEmisor   = emisorMatch?.[1]?.toUpperCase() ?? null;
  const rfcReceptor = receptorMatch?.[1]?.toUpperCase() ?? null;

  // Conceptos (nodo cfdi:Concepto o Concepto)
  const conceptos: Concepto[] = [];
  const conceptoRe = /<(?:cfdi:)?Concepto([^/]*)\/>/gi;
  let m;
  while ((m = conceptoRe.exec(xml)) !== null) {
    const attrs = m[1];
    const getA = (n: string) => {
      const r = attrs.match(new RegExp(`${n}="([^"]+)"`, 'i'));
      return r ? r[1] : null;
    };
    const descripcion = getA('Descripcion') ?? getA('descripcion') ?? '';
    if (!descripcion) continue;
    conceptos.push({
      descripcion,
      cantidad:      parseFloat(getA('Cantidad') ?? '1') || 1,
      valorUnitario: parseFloat(getA('ValorUnitario') ?? '0') || 0,
      importe:       parseFloat(getA('Importe') ?? '0') || 0,
      unidad:        getA('Unidad'),
      claveProdServ: getA('ClaveProdServ'),
      claveUnidad:   getA('ClaveUnidad'),
    });
  }

  return { uuid, tipo, subtotal, iva, total, fecha, rfcEmisor, rfcReceptor, conceptos };
}

// ── Polling: esperar a que el SAT prepare el paquete ───────────────────────
async function esperarPaquetes(
  service: InstanceType<typeof Service>,
  requestId: string,
  maxIntentos = 20,
): Promise<string[]> {
  for (let i = 0; i < maxIntentos; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const verify = await service.verify(requestId);

    if (!verify.getStatus().isAccepted()) {
      throw new Error(`SAT rechazó la solicitud: ${verify.getStatus().getMessage()}`);
    }

    const sr = verify.getStatusRequest();
    if (sr.isTypeOf('Failure') || sr.isTypeOf('Rejected') || sr.isTypeOf('Expired')) {
      throw new Error(`Estado SAT: ${sr.getEntryId()}`);
    }
    if (sr.isTypeOf('Finished')) {
      return verify.getPackageIds();
    }
    // InProgress o Accepted → seguir esperando
  }
  throw new Error('Tiempo de espera agotado. El SAT no preparó los paquetes. Intenta de nuevo en unos minutos.');
}

// ── Route handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Autenticación: JWT de usuario O CRON_SECRET dedicado (para cron interno)
    // NUNCA reutilizar SUPABASE_SERVICE_ROLE_KEY como shared secret: si se loguea
    // en un trace, se filtra la llave maestra de la BD.
    const cronKey = req.headers.get('x-cron-service-key');
    const cronSecret = process.env.CRON_SECRET;
    const esCron  = !!cronSecret && !!cronKey && cronKey === cronSecret;

    let userId: string | null = null;
    let despachoId: string | null = null;

    if (!esCron) {
      const auth = req.headers.get('authorization') ?? '';
      const jwt  = auth.replace('Bearer ', '').trim();
      if (!jwt) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
      if (authErr || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      userId = user.id;
    }

    const body = await req.json() as {
      empresa_id:   string;
      fecha_inicio: string;
      fecha_fin:    string;
      tipo:         'emitidos' | 'recibidos' | 'ambos';
    };

    const { empresa_id, fecha_inicio, fecha_fin, tipo = 'ambos' } = body;
    if (!empresa_id || !fecha_inicio || !fecha_fin) {
      return NextResponse.json({ error: 'Faltan empresa_id, fecha_inicio o fecha_fin' }, { status: 400 });
    }

    // Verificar acceso
    if (!esCron) {
      const { data: usuario } = await supabaseAdmin
        .from('usuarios').select('despacho_id').eq('id', userId!).single();
      if (!usuario?.despacho_id) return NextResponse.json({ error: 'Usuario sin despacho' }, { status: 403 });
      despachoId = usuario.despacho_id;
    }

    // Traer la empresa y verificar pertenencia al despacho (defensa en profundidad;
    // RLS también la impone vía service_role bypass + checks manuales).
    const empresaQuery = supabaseAdmin
      .from('empresas_clientes')
      .select('id, rfc, despacho_id, fiel_disponible')
      .eq('id', empresa_id);
    if (!esCron && despachoId) empresaQuery.eq('despacho_id', despachoId);

    const { data: empresa } = await empresaQuery.single();

    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    if (!empresa.fiel_disponible) {
      return NextResponse.json({ error: 'Esta empresa no tiene FIEL configurada.' }, { status: 422 });
    }

    // Traer el material FIEL de la tabla dedicada (empresa_fiel).
    const { data: fielRow, error: fielErr } = await supabaseAdmin
      .from('empresa_fiel')
      .select('cert_enc, key_enc, password_enc')
      .eq('empresa_id', empresa.id)
      .single();

    if (fielErr || !fielRow) {
      return NextResponse.json({
        error: 'No se encontró el material FIEL para esta empresa. Pide al contador que la vuelva a subir.',
      }, { status: 422 });
    }

    // Descifrar AES-256-GCM. Los registros migrados desde las columnas
    // legacy de empresas_clientes pueden venir todavía en plaintext base64
    // si el deploy anterior no las había cifrado — isEncrypted() lo detecta.
    const certBuffer = isEncrypted(fielRow.cert_enc)
      ? decryptFiel(fielRow.cert_enc)
      : Buffer.from(fielRow.cert_enc, 'base64');
    const keyBuffer  = isEncrypted(fielRow.key_enc)
      ? decryptFiel(fielRow.key_enc)
      : Buffer.from(fielRow.key_enc, 'base64');
    const fielPassword = isEncrypted(fielRow.password_enc)
      ? decryptFielString(fielRow.password_enc)
      : fielRow.password_enc;

    const fiel = Fiel.create(
      certBuffer.toString('binary'),
      keyBuffer.toString('binary'),
      fielPassword,
    );

    if (!fiel.isValid()) {
      await logFielEvent(supabaseAdmin, {
        empresaId:  empresa.id,
        despachoId: empresa.despacho_id,
        uploadedBy: userId,
        action:     'rechazo_validacion',
        req,
        notes:      'FIEL registrada inválida o vencida al intentar usarla con SAT-WS',
      });
      return NextResponse.json({ error: 'La FIEL registrada no es válida o está vencida.' }, { status: 422 });
    }

    // Registro forense: cada uso de la FIEL para descargar CFDIs del SAT.
    // Se loguea ANTES de disparar el request al SAT para que quede constancia
    // incluso si el SAT falla a mitad del proceso. userId puede ser null
    // cuando el cron automático dispara el sync — queda documentado en notes.
    await logFielEvent(supabaseAdmin, {
      empresaId:  empresa.id,
      despachoId: empresa.despacho_id,
      uploadedBy: userId,  // null si es cron
      action:     'uso_sat',
      req,
      notes: esCron
        ? `Sync automático SAT · ${fecha_inicio} → ${fecha_fin} · tipo ${tipo}`
        : `Sync manual SAT · ${fecha_inicio} → ${fecha_fin} · tipo ${tipo}`,
    });

    // Crear servicio SAT
    const service = new Service(
      new FielRequestBuilder(fiel),
      new HttpsWebClient(),
      null,
      ServiceEndpoints.cfdi(),
    );

    // Rango de fechas
    const period = DateTimePeriod.createFromValues(
      `${fecha_inicio}T00:00:00`,
      `${fecha_fin}T23:59:59`,
    );

    const rfc = empresa.rfc.toUpperCase();
    let importados = 0;
    let duplicados = 0;
    const errores: string[] = [];

    // Tipos a descargar
    const tiposDescargar: ('emitidos' | 'recibidos')[] = tipo === 'ambos'
      ? ['emitidos', 'recibidos']
      : [tipo];

    for (const tipoDescarga of tiposDescargar) {
      const downloadType = new DownloadType(tipoDescarga === 'emitidos' ? 'issued' : 'received');
      const fuente: string = tipoDescarga === 'emitidos' ? 'sat_emitidos' : 'sat_recibidos';

      const queryParams = QueryParameters
        .create(period, downloadType, new RequestType('xml'))
        .withRfcMatch(RfcMatch.create(rfc));

      // Solicitar descarga
      let queryResult;
      try {
        queryResult = await service.query(queryParams);
      } catch (e) {
        errores.push(`Error solicitando ${tipoDescarga}: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }

      if (!queryResult.getStatus().isAccepted()) {
        errores.push(`SAT no aceptó solicitud ${tipoDescarga}: ${queryResult.getStatus().getMessage()}`);
        continue;
      }

      // Esperar paquetes
      let packageIds: string[];
      try {
        packageIds = await esperarPaquetes(service, queryResult.getRequestId());
      } catch (e) {
        errores.push(`${tipoDescarga}: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }

      if (packageIds.length === 0) {
        // Sin CFDIs en ese período
        continue;
      }

      // Descargar y procesar cada paquete
      for (const packageId of packageIds) {
        let downloadResult;
        try {
          downloadResult = await service.download(packageId);
        } catch (e) {
          errores.push(`Error descargando paquete ${packageId}: ${e instanceof Error ? e.message : String(e)}`);
          continue;
        }

        if (!downloadResult.getStatus().isAccepted()) {
          errores.push(`Paquete ${packageId} rechazado: ${downloadResult.getStatus().getMessage()}`);
          continue;
        }

        // Descomprimir ZIP
        const base64Zip = downloadResult.getPackageContent();
        const zipBuffer = Buffer.from(base64Zip, 'base64');

        let zip: JSZip;
        try {
          zip = await JSZip.loadAsync(zipBuffer);
        } catch {
          // Intentar como binario directo (por si no es base64)
          try {
            zip = await JSZip.loadAsync(base64Zip, { base64: false });
          } catch (e2) {
            errores.push(`No se pudo leer ZIP del paquete ${packageId}: ${e2 instanceof Error ? e2.message : String(e2)}`);
            continue;
          }
        }

        // Procesar cada XML del ZIP
        for (const [filename, file] of Object.entries(zip.files)) {
          if (!filename.toLowerCase().endsWith('.xml')) continue;

          let xmlContent: string;
          try {
            xmlContent = await file.async('string');
          } catch {
            continue;
          }

          const cfdi = parseCfdiXml(xmlContent);
          if (!cfdi.uuid) continue;

          // Upsert en la tabla cfdis (ON CONFLICT por uuid_sat)
          const { error: upsertErr } = await supabaseAdmin
            .from('cfdis')
            .upsert({
              empresa_id:   empresa_id,
              uuid_sat:     cfdi.uuid,
              tipo:         cfdi.tipo,
              subtotal:     cfdi.subtotal,
              iva:          cfdi.iva,
              total:        cfdi.total,
              fecha_emision: cfdi.fecha,
              fuente,
              rfc_emisor:   cfdi.rfcEmisor,
              rfc_receptor: cfdi.rfcReceptor,
              status:       'aprobado',  // CFDIs del SAT se consideran aprobados
            }, { onConflict: 'uuid_sat', ignoreDuplicates: false });

          if (upsertErr) {
            if (upsertErr.code === '23505') { duplicados++; }
            else { errores.push(`Error guardando ${cfdi.uuid}: ${upsertErr.message}`); }
          } else {
            importados++;
            // Guardar conceptos para E3 marketplace (si los hay)
            if (cfdi.conceptos.length > 0) {
              // Obtener el id del CFDI recién upserted
              const { data: cfdiRow } = await supabaseAdmin
                .from('cfdis').select('id').eq('uuid_sat', cfdi.uuid!).single();
              if (cfdiRow?.id) {
                const filas = cfdi.conceptos.map(c => ({
                  cfdi_id:        cfdiRow.id,
                  empresa_id:     empresa_id,
                  descripcion:    c.descripcion,
                  cantidad:       c.cantidad,
                  valor_unitario: c.valorUnitario,
                  importe:        c.importe,
                  unidad:         c.unidad,
                  clave_prod_serv: c.claveProdServ,
                  clave_unidad:   c.claveUnidad,
                  rfc_proveedor:  cfdi.rfcEmisor,
                }));
                // upsert silencioso — no bloquear si falla
                await supabaseAdmin.from('cfdi_conceptos').upsert(filas, {
                  onConflict: 'cfdi_id,descripcion',
                  ignoreDuplicates: true,
                });
              }
            }
          }
        }
      }
    }

    // Actualizar timestamp de última sincronización
    await supabaseAdmin
      .from('empresas_clientes')
      .update({ sat_ultima_sync: new Date().toISOString() })
      .eq('id', empresa_id);

    return NextResponse.json({ importados, duplicados, errores });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Cron: sincronización automática SAT — se ejecuta el día 2 de cada mes a las 8am UTC
 * Schedule en vercel.json: "0 8 2 * *"
 *
 * Descarga los CFDIs del mes anterior para todas las empresas con FIEL configurada
 * y sat_auto_sync = true.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  // Vercel Cron envía Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const hoy       = new Date();
  const mesPrev   = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const anio      = mesPrev.getFullYear();
  const mes       = mesPrev.getMonth() + 1;
  const fechaIni  = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const fechaFin  = new Date(anio, mes, 0).toISOString().slice(0, 10);

  // Empresas con FIEL y auto-sync activado
  const { data: empresas, error } = await supabaseAdmin
    .from('empresas_clientes')
    .select('id, nombre, rfc')
    .eq('fiel_disponible', true)
    .eq('sat_auto_sync', true)
    .eq('activa', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!empresas || empresas.length === 0) {
    return NextResponse.json({ mensaje: 'Sin empresas con auto-sync activado', procesadas: 0 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`;
  const resultados: { empresa: string; ok: boolean; importados?: number; error?: string }[] = [];

  for (const empresa of empresas) {
    try {
      // Llamar al endpoint de descarga con CRON_SECRET dedicado (no service role).
      // descargar-sat verifica x-cron-service-key contra CRON_SECRET, no contra la
      // service role key — así evitamos que la llave maestra viaje en headers.
      const res = await fetch(`${baseUrl}/api/descargar-sat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-service-key': process.env.CRON_SECRET!,
        },
        body: JSON.stringify({
          empresa_id:   empresa.id,
          fecha_inicio: fechaIni,
          fecha_fin:    fechaFin,
          tipo:         'ambos',
          _cron:        true,
        }),
      });

      const json = await res.json() as { importados?: number; error?: string };
      resultados.push({
        empresa: empresa.nombre,
        ok:          !json.error,
        importados:  json.importados,
        error:       json.error,
      });
    } catch (e) {
      resultados.push({
        empresa: empresa.nombre,
        ok: false,
        error: e instanceof Error ? e.message : 'Error desconocido',
      });
    }
  }

  const exitosas  = resultados.filter(r => r.ok).length;
  const fallidas  = resultados.filter(r => !r.ok).length;
  const totalImportados = resultados.reduce((s, r) => s + (r.importados ?? 0), 0);

  console.log(`[CRON SAT SYNC] ${mesPrev.toLocaleString('es-MX', { month: 'long', year: 'numeric' })} — ${exitosas} exitosas, ${fallidas} fallidas, ${totalImportados} CFDIs importados`);

  return NextResponse.json({
    periodo:    `${fechaIni} al ${fechaFin}`,
    procesadas: empresas.length,
    exitosas,
    fallidas,
    totalImportados,
    detalle: resultados,
  });
}

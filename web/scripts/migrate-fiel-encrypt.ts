/**
 * Script único: cifra registros FIEL en empresa_fiel que todavía estén en plaintext.
 *
 * Contexto: la migración SQL 003 copia los datos desde las columnas legacy
 * de empresas_clientes a empresa_fiel tal cual (Postgres no puede cifrar con
 * AES-256-GCM nativamente). Si alguna de esas filas venía en plaintext base64
 * de un deploy previo al cifrado, este script las re-escribe cifradas.
 *
 * Idempotente: filas ya cifradas se saltan (detectadas por isEncrypted).
 * Seguro de correr múltiples veces.
 *
 * Uso:
 *   cd web
 *   npx tsx scripts/migrate-fiel-encrypt.ts
 *
 * Requiere env: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, FIEL_ENCRYPTION_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { encryptFiel, isEncrypted } from '../lib/fiel-crypto';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!process.env.FIEL_ENCRYPTION_KEY) {
    throw new Error('Falta FIEL_ENCRYPTION_KEY. Genera con: openssl rand -base64 32');
  }

  const supabase = createClient(url, key);

  const { data: rows, error } = await supabase
    .from('empresa_fiel')
    .select('id, rfc, cert_enc, key_enc, password_enc');

  if (error) throw error;
  if (!rows || rows.length === 0) {
    console.log('Sin filas en empresa_fiel. Nada que migrar.');
    return;
  }

  let migrados = 0;
  let yaCifrados = 0;
  const errores: { id: string; rfc: string; error: string }[] = [];

  for (const r of rows) {
    try {
      const necesitaCert = !isEncrypted(r.cert_enc);
      const necesitaKey  = !isEncrypted(r.key_enc);
      const necesitaPass = !isEncrypted(r.password_enc);

      if (!necesitaCert && !necesitaKey && !necesitaPass) {
        yaCifrados++;
        continue;
      }

      const update: Record<string, string> = {};
      if (necesitaCert) update.cert_enc     = encryptFiel(Buffer.from(r.cert_enc, 'base64'));
      if (necesitaKey)  update.key_enc      = encryptFiel(Buffer.from(r.key_enc,  'base64'));
      if (necesitaPass) update.password_enc = encryptFiel(r.password_enc);

      const { error: updErr } = await supabase
        .from('empresa_fiel')
        .update(update)
        .eq('id', r.id);

      if (updErr) throw updErr;
      migrados++;
      console.log(`  ✓ ${r.rfc} (${r.id}) cifrado`);
    } catch (err) {
      errores.push({
        id: r.id,
        rfc: r.rfc,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.log('\n── Resumen ──');
  console.log(`  Total:       ${rows.length}`);
  console.log(`  Migrados:    ${migrados}`);
  console.log(`  Ya cifrados: ${yaCifrados}`);
  console.log(`  Errores:     ${errores.length}`);
  if (errores.length > 0) {
    console.error('\nErrores:');
    for (const e of errores) console.error(`  ✗ ${e.rfc} (${e.id}): ${e.error}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

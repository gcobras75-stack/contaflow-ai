/**
 * Helper para escribir en la bitácora append-only fiel_audit_log.
 *
 * Todas las rutas que tocan material FIEL deben llamar logFielEvent()
 * para dejar trazabilidad legal. No lanza excepciones: si el log falla,
 * se loguea a console.error y el caller sigue su flujo (un fallo del
 * audit no debe tumbar el flujo principal — pero SÍ debe ser visible
 * en los logs de Vercel para investigación).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getClientIp, getDeviceHint } from './request-meta';

/** Tipos de evento permitidos. Deben coincidir con el CHECK de fiel_audit_log.action. */
export type FielAuditAction =
  | 'subida'
  | 'descarga'
  | 'eliminacion'
  | 'uso_sat'
  | 'rechazo_validacion';

export interface FielAuditEvent {
  empresaId:   string | null;
  despachoId:  string | null;
  uploadedBy:  string | null;     // user_id del actor; null si fue proceso automático
  action:      FielAuditAction;
  req:         { headers: { get(name: string): string | null } };
  notes?:      string | null;     // contexto extra además del device hint
}

/**
 * Escribe una fila en fiel_audit_log. Never throws.
 *
 * notes se arma como "<device hint> · <notes extras>" si ambos existen,
 * o cualquiera de los dos, o null.
 */
export async function logFielEvent(
  supabase: SupabaseClient,
  evt: FielAuditEvent,
): Promise<void> {
  try {
    const ip      = getClientIp(evt.req);
    const device  = getDeviceHint(evt.req);
    const noteParts = [device, evt.notes].filter(Boolean);
    const notes = noteParts.length > 0 ? noteParts.join(' · ') : null;

    const { error } = await supabase.from('fiel_audit_log').insert({
      empresa_id:   evt.empresaId,
      despacho_id:  evt.despachoId,
      uploaded_by:  evt.uploadedBy,
      ip_address:   ip,
      action:       evt.action,
      notes:        notes,
    });

    if (error) {
      console.error('[fiel_audit_log] insert fallido:', {
        action: evt.action,
        empresaId: evt.empresaId,
        error: error.message,
      });
    }
  } catch (e) {
    console.error('[fiel_audit_log] excepción:', e);
  }
}

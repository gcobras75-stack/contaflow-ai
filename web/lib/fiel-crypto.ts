/**
 * Cifrado de material sensible de la FIEL (e.firma) antes de persistirlo.
 *
 * Algoritmo: AES-256-GCM
 * - Authenticated encryption: detecta manipulación del ciphertext
 * - IV de 12 bytes aleatorio por cada encrypt (nunca reusado)
 * - Auth tag de 16 bytes
 *
 * Formato serializado: base64(iv) . ':' . base64(authTag) . ':' . base64(ciphertext)
 * Todo el paquete cabe en una sola columna TEXT.
 *
 * La llave maestra vive solo en FIEL_ENCRYPTION_KEY (env). Rotación:
 * generar FIEL_ENCRYPTION_KEY_PREV con la anterior, intentar descifrar con
 * la actual primero, caer a PREV si falla, y reescribir con la actual.
 * (No implementado aquí — agregar cuando toque rotar.)
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function loadKey(): Buffer {
  const raw = process.env.FIEL_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'FIEL_ENCRYPTION_KEY no configurada. Genera una con: openssl rand -base64 32',
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_LEN) {
    throw new Error(
      `FIEL_ENCRYPTION_KEY debe ser de 32 bytes (base64 de 32 bytes). Recibidos ${key.length} bytes.`,
    );
  }
  return key;
}

/** Cifra una cadena (UTF-8) o un Buffer binario. Retorna el paquete serializado. */
export function encryptFiel(plaintext: string | Buffer): string {
  const key = loadKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);

  const data = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/** Descifra el paquete serializado. Retorna un Buffer (el consumidor decide string/binary). */
export function decryptFiel(packed: string): Buffer {
  const key = loadKey();
  const parts = packed.split(':');
  if (parts.length !== 3) {
    throw new Error('Paquete FIEL cifrado con formato inválido.');
  }
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');

  if (iv.length !== IV_LEN || authTag.length !== TAG_LEN) {
    throw new Error('Paquete FIEL cifrado corrupto (IV o authTag con longitud inválida).');
  }

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/** Descifra y convierte a string UTF-8 (para el password). */
export function decryptFielString(packed: string): string {
  return decryptFiel(packed).toString('utf8');
}

/**
 * Heurística: un valor viejo en plaintext base64 NO contiene ':' (base64 estándar no usa ':').
 * Si la columna tiene exactamente 2 ':', asumimos que ya está cifrada. Útil durante la migración.
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(':');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

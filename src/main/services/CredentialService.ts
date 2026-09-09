// Servicio de credenciales: unico punto del sistema que conoce el hash.
// Fase 0.5 - Auth & Security Foundation.
//
// Reglas:
//  - Ningun hash sale de este modulo hacia el renderer.
//  - Toda escritura de contrasena pasa por hashPassword().
//  - La clasificacion de credenciales es pura y testeable sin base de datos.

import bcrypt from 'bcryptjs';

/** Coste de bcrypt. 10 es el equilibrio habitual para login interactivo local. */
export const BCRYPT_ROUNDS = 10;

export type CredentialKind = 'bcrypt' | 'legacy-plaintext' | 'empty';

/**
 * Formato de un hash bcrypt: $2a$/$2b$/$2y$ + coste de 2 digitos + '$' + 53 chars base64.
 * Se valida de forma estricta para no confundir una contrasena plana que empiece por '$2'.
 */
const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/** Indica si el valor almacenado ya es un hash bcrypt valido. */
export function isBcryptHash(stored: unknown): boolean {
  return typeof stored === 'string' && BCRYPT_PATTERN.test(stored);
}

/**
 * Clasifica el valor almacenado en usuario_credenciales.password.
 * 'empty' cubre null/undefined/cadena en blanco: no es migrable y no permite login.
 */
export function classifyCredential(stored: unknown): CredentialKind {
  if (typeof stored !== 'string' || stored.trim() === '') return 'empty';
  return isBcryptHash(stored) ? 'bcrypt' : 'legacy-plaintext';
}

/** Genera el hash bcrypt de una contrasena en claro. */
export function hashPassword(plain: string): string {
  const value = String(plain ?? '');
  if (!value) {
    throw new Error('No se puede generar el hash de una contrasena vacia.');
  }
  return bcrypt.hashSync(value, BCRYPT_ROUNDS);
}

/**
 * Verifica una contrasena contra el valor almacenado.
 * Regla dura: solo se acepta un hash bcrypt valido. Una credencial legacy en
 * texto plano NUNCA autentica, aunque coincida literalmente.
 */
export function verifyPassword(plain: string, stored: unknown): boolean {
  if (!isBcryptHash(stored)) return false;
  const value = String(plain ?? '');
  if (!value) return false;
  try {
    return bcrypt.compareSync(value, stored as string);
  } catch {
    return false;
  }
}

/** Enmascara un hash para logs. Nunca se imprime completo. */
export function maskSecret(value: unknown): string {
  const s = typeof value === 'string' ? value : '';
  if (!s) return '<vacio>';
  return `${s.slice(0, 7)}...<${s.length} chars>`;
}

// --- Alta atomica de usuario + credencial ---------------------------------

/**
 * Operaciones que necesita createUserWithCredential.
 * Se inyectan para poder probar el orden y el rollback sin base de datos.
 */
export interface UserCreationOps {
  insertUser(userId: string): Promise<void>;
  setPasswordHash(userId: string, hash: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}

/**
 * Crea un usuario y su credencial sin dejar estado parcial.
 *
 * La capa de datos no expone transacciones, asi que la atomicidad se consigue
 * combinando dos mecanismos:
 *
 *  1. Todo lo que puede fallar por datos de entrada ocurre ANTES de insertar:
 *     se valida que la contrasena no este vacia y se calcula el hash. Si algo
 *     falla aqui, no se ha creado ningun usuario.
 *  2. Si la escritura de la credencial falla pese a todo, se elimina el usuario
 *     recien insertado (rollback compensatorio) y se propaga el error original.
 *
 * Resultado: nunca queda un usuario sin credencial.
 */
export async function createUserWithCredential(
  ops: UserCreationOps,
  userId: string,
  plainPassword: unknown
): Promise<string> {
  // --- Fase 1: validar y hashear ANTES de tocar la tabla usuarios ---
  const value = String(plainPassword ?? '').trim();
  if (!value) {
    throw new Error('Debes proporcionar una contrasena inicial para el usuario.');
  }

  // Si hashPassword lanza, tampoco se ha insertado nada.
  const hash = hashPassword(value);

  // --- Fase 2: insertar el usuario ---
  await ops.insertUser(userId);

  // --- Fase 3: credencial, con rollback compensatorio ---
  try {
    await ops.setPasswordHash(userId, hash);
  } catch (credentialError) {
    try {
      await ops.deleteUser(userId);
    } catch {
      // El rollback fallo: se prioriza informar del error original, pero se
      // deja constancia de que puede haber quedado un usuario sin credencial.
      // Un usuario sin credencial no puede iniciar sesion (fail-closed).
      console.error(
        `[createUserWithCredential] rollback fallido para user_id=${userId}: ` +
          'puede haber quedado un usuario sin credencial.'
      );
    }
    throw credentialError;
  }

  return userId;
}

// --- Migracion de credenciales legacy -------------------------------------

export interface LegacyCredentialRow {
  user_id: string;
  password: string;
}

/** Almacen inyectable: permite probar la migracion sin SQL Server. */
export interface CredentialStore {
  listAll(): Promise<LegacyCredentialRow[]>;
  updateHash(userId: string, hash: string): Promise<void>;
}

export interface MigrationReport {
  analizadas: number;
  migradas: number;
  yaSeguras: number;
  errores: number;
  vacias: number;
}

/**
 * Convierte credenciales legacy en texto plano a bcrypt.
 *
 * Idempotente: una credencial ya hasheada se cuenta como 'yaSeguras' y no se
 * vuelve a hashear. Conserva la contrasena funcional del usuario (se hashea el
 * mismo valor que ya usaba). No borra usuarios ni resetea contrasenas.
 * No registra jamas la contrasena ni el hash completo.
 */
export async function migrateLegacyCredentials(
  store: CredentialStore,
  log: (msg: string) => void = () => {}
): Promise<MigrationReport> {
  const report: MigrationReport = {
    analizadas: 0,
    migradas: 0,
    yaSeguras: 0,
    errores: 0,
    vacias: 0,
  };

  const rows = await store.listAll();

  for (const row of rows) {
    report.analizadas += 1;
    const kind = classifyCredential(row?.password);

    if (kind === 'bcrypt') {
      report.yaSeguras += 1;
      continue;
    }

    if (kind === 'empty') {
      // Sin credencial utilizable. No se inventa una contrasena.
      report.vacias += 1;
      continue;
    }

    try {
      const hash = hashPassword(row.password);
      await store.updateHash(row.user_id, hash);
      report.migradas += 1;
    } catch (error: any) {
      report.errores += 1;
      log(`[cred-migration] error al migrar user_id=${row?.user_id}: ${error?.message || 'desconocido'}`);
    }
  }

  log(
    `[cred-migration] analizadas=${report.analizadas} migradas=${report.migradas} ` +
      `ya-seguras=${report.yaSeguras} vacias=${report.vacias} errores=${report.errores}`
  );

  return report;
}

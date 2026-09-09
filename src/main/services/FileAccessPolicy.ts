// Politica central de acceso a archivos desde el renderer.
// Fase 0.5 - Auth & Security Foundation.
//
// Un renderer comprometido NO debe poder leer rutas arbitrarias (.env, .ssh,
// AppData, C:\ completo). Todo acceso pasa por resolveReadablePath().
//
// Diseno:
//  - Las raices autorizadas se configuran por entorno (SGC_ALLOWED_FILE_ROOTS).
//  - La comparacion se hace por segmentos de ruta canonicalizada, no con un
//    startsWith ingenuo (que aceptaria "C:\datos-privados" como hijo de "C:\datos").
//  - Se resuelven '..' y enlaces simbolicos antes de comparar (realpath).
//  - Soporta Windows (case-insensitive, separador '\') y rutas UNC.

import fs from 'fs';
import path from 'path';

export type DenyReason =
  | 'EMPTY_PATH'
  | 'NO_ROOTS_CONFIGURED'
  | 'OUTSIDE_ALLOWED_ROOTS'
  | 'NOT_FOUND'
  | 'NOT_A_FILE';

export interface AccessAllowed {
  allowed: true;
  /** Ruta canonicalizada y verificada. Es la unica que debe usarse para leer. */
  resolvedPath: string;
}

export interface AccessDenied {
  allowed: false;
  reason: DenyReason;
  message: string;
}

export type AccessDecision = AccessAllowed | AccessDenied;

/** En Windows la comparacion de rutas es insensible a mayusculas. */
const IS_WINDOWS = process.platform === 'win32';

function normalizeForCompare(p: string): string {
  const normalized = path.resolve(p);
  return IS_WINDOWS ? normalized.toLowerCase() : normalized;
}

/**
 * Divide una ruta en segmentos comparables, preservando la raiz
 * (unidad "C:" o prefijo UNC "\\\\servidor\\recurso").
 */
function toSegments(p: string): string[] {
  const normalized = normalizeForCompare(p);
  return normalized.split(path.sep).filter(seg => seg.length > 0);
}

/**
 * Comprueba si `childPath` esta dentro de `rootPath` comparando segmento a
 * segmento. Evita el falso positivo de startsWith: "C:\datosX" NO es hijo de
 * "C:\datos". Una ruta identica a la raiz se considera dentro.
 */
export function isPathInsideRoot(childPath: string, rootPath: string): boolean {
  const child = toSegments(childPath);
  const root = toSegments(rootPath);

  if (root.length === 0) return false;
  if (child.length < root.length) return false;

  for (let i = 0; i < root.length; i += 1) {
    if (child[i] !== root[i]) return false;
  }
  return true;
}

/**
 * Lee las raices autorizadas de SGC_ALLOWED_FILE_ROOTS.
 * Formato: rutas absolutas separadas por ';' (Windows) o ':' no se usa para no
 * romper "C:\". Se acepta tambien ',' como separador alternativo.
 * No hay rutas hardcodeadas de ningun cliente.
 */
export function getAllowedRoots(rawEnv?: string): string[] {
  const raw = rawEnv !== undefined ? rawEnv : process.env.SGC_ALLOWED_FILE_ROOTS || '';
  return String(raw)
    .split(/[;,]/)
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0)
    .map(entry => path.resolve(entry));
}

/**
 * Canonicaliza una ruta resolviendo enlaces simbolicos cuando es posible.
 * Si la ruta no existe, devuelve null (se traduce en NOT_FOUND).
 */
function canonicalize(target: string): string | null {
  try {
    return fs.realpathSync.native
      ? fs.realpathSync.native(target)
      : fs.realpathSync(target);
  } catch {
    return null;
  }
}

/**
 * Decide si el renderer puede leer `requestedPath`.
 *
 * Orden de comprobaciones (deny by default):
 *   1. ruta no vacia y de tipo string
 *   2. existen raices configuradas
 *   3. la ruta existe
 *   4. es un archivo regular (no directorio)
 *   5. la ruta canonicalizada cae dentro de alguna raiz autorizada
 */
export function resolveReadablePath(
  requestedPath: unknown,
  allowedRootsOverride?: string[]
): AccessDecision {
  if (typeof requestedPath !== 'string' || requestedPath.trim() === '') {
    return { allowed: false, reason: 'EMPTY_PATH', message: 'Ruta de archivo invalida.' };
  }

  const roots = allowedRootsOverride ?? getAllowedRoots();
  if (roots.length === 0) {
    return {
      allowed: false,
      reason: 'NO_ROOTS_CONFIGURED',
      message:
        'Acceso a archivos deshabilitado: no hay raices autorizadas. Configura SGC_ALLOWED_FILE_ROOTS.',
    };
  }

  // path.resolve ya colapsa '..' y '.'; realpath ademas resuelve symlinks.
  const absolute = path.resolve(requestedPath);
  const canonical = canonicalize(absolute);

  if (canonical === null) {
    return { allowed: false, reason: 'NOT_FOUND', message: 'El archivo solicitado no existe.' };
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(canonical);
  } catch {
    return { allowed: false, reason: 'NOT_FOUND', message: 'El archivo solicitado no existe.' };
  }

  if (!stat.isFile()) {
    return { allowed: false, reason: 'NOT_A_FILE', message: 'La ruta solicitada no es un archivo.' };
  }

  // Las raices tambien se canonicalizan: si una raiz es un symlink, ambos lados
  // deben expresarse en el mismo espacio de nombres para poder compararse.
  const insideSomeRoot = roots.some(root => {
    const canonicalRoot = canonicalize(root) ?? path.resolve(root);
    return isPathInsideRoot(canonical, canonicalRoot);
  });

  if (!insideSomeRoot) {
    return {
      allowed: false,
      reason: 'OUTSIDE_ALLOWED_ROOTS',
      message: 'Acceso denegado: la ruta esta fuera de las carpetas autorizadas.',
    };
  }

  return { allowed: true, resolvedPath: canonical };
}

/** Envuelve resolveReadablePath lanzando un error uniforme. Uso en handlers IPC. */
export function assertReadablePath(requestedPath: unknown): string {
  const decision = resolveReadablePath(requestedPath);
  if (!decision.allowed) {
    console.error(`[FileAccessPolicy] DENY (${decision.reason})`);
    throw new Error(decision.message);
  }
  return decision.resolvedPath;
}

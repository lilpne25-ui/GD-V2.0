// Politica de acciones de la Demo guiada.
//
// Unica fuente de verdad sobre lo que la demo puede hacer. Defensa en
// profundidad:
//  1. El tipo ReadOnlyActionKind no contiene ninguna escritura.
//  2. READ_ONLY_ACTIONS es la lista blanca exacta.
//  3. assertReadOnlyAction rechaza en tiempo de ejecucion cualquier accion que
//     no este en la lista o que contenga un verbo de escritura.
//  4. demoBus aplica la misma comprobacion a cada comando que recibe.

import type { ReadOnlyActionKind } from '../types';

export const READ_ONLY_ACTIONS: readonly ReadOnlyActionKind[] = [
  'app.navigate',
  'app.openNotifications',
  'app.closeNotifications',
  'doc.reset',
  'doc.openFolderPath',
  'doc.focusNode',
  'doc.setSearch',
  'doc.clearSearch',
  'doc.openDocumentViewer',
  'doc.closeDocumentViewers',
  'doc.openAccessDialog',
  'doc.closeAccessDialog',
  'doc.openReviewInbox',
  'doc.closeReviewInbox',
  'doc.openDecisionPreview',
  'doc.closeDecisionPreview',
  'registros.setTab',
  'dynamic.selectType',
  'dynamic.resetForm',
  'dom.touchField',
] as const;

/**
 * Verbos de escritura prohibidos durante la demo. Si una accion futura los
 * contuviera, se rechazaria aunque alguien la anadiera a la lista blanca.
 */
export const PROHIBITED_VERBS: readonly string[] = [
  'create',
  'update',
  'delete',
  'remove',
  'approve',
  'reject',
  'correct',
  'send',
  'publish',
  'import',
  'upload',
  'transition',
  'submit',
  'markread',
  'mark-read',
  'rename',
  'move',
  'sign',
  'restore',
  'purge',
  'password',
  'write',
  'save',
];

export class ProhibitedDemoActionError extends Error {
  constructor(kind: string) {
    super(`Accion no permitida en la Demo guiada: ${kind}`);
    this.name = 'ProhibitedDemoActionError';
  }
}

/** Nombre de la accion sin el espacio de nombres, en minusculas. */
function verbOf(kind: string): string {
  const dot = kind.indexOf('.');
  return (dot >= 0 ? kind.slice(dot + 1) : kind).toLowerCase();
}

export function containsProhibitedVerb(kind: string): boolean {
  const verb = verbOf(kind);
  return PROHIBITED_VERBS.some(word => verb.includes(word.toLowerCase()));
}

export function isReadOnlyAction(kind: string): kind is ReadOnlyActionKind {
  return (READ_ONLY_ACTIONS as readonly string[]).includes(kind) && !containsProhibitedVerb(kind);
}

export function assertReadOnlyAction(kind: string): asserts kind is ReadOnlyActionKind {
  if (!isReadOnlyAction(kind)) {
    throw new ProhibitedDemoActionError(kind);
  }
}

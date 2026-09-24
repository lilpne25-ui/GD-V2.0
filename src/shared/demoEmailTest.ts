// Prueba controlada del correo de workflow para la demo Innovax.
//
// Reglas:
//  - El destinatario NUNCA se inventa: se resuelve solo si en la configuracion
//    existe exactamente UNA direccion de "Proyectos TI" (proyectos.ti@...).
//  - Ninguna, o varias: no se envia y se informa.
//  - Un envio por ejecucion; la Demo guiada nunca envia correos por si sola.

export type RecipientResolution =
  | { ok: true; address: string }
  | { ok: false; reason: string; candidates: string[] };

const PROYECTOS_TI = /^proyectos[._-]?ti@[^\s@]+\.[^\s@]+$/i;

export const RECIPIENT_UNRESOLVED = 'Necesito la dirección exacta de Proyectos TI.';

export function resolveProyectosTiRecipient(addresses: Array<string | null | undefined>): RecipientResolution {
  const unique = Array.from(new Set(
    addresses
      .map(a => String(a || '').trim().toLowerCase())
      .filter(a => PROYECTOS_TI.test(a))
  ));
  if (unique.length === 1) return { ok: true, address: unique[0] };
  if (unique.length === 0) return { ok: false, reason: RECIPIENT_UNRESOLVED, candidates: [] };
  return {
    ok: false,
    reason: 'Hay varias direcciones posibles de Proyectos TI; no se elige una arbitrariamente.',
    candidates: unique,
  };
}

export interface DemoTestEmail {
  subject: string;
  message: string;
}

/** Correo de prueba: deja claro que no es una aprobacion real y no incluye datos personales. */
export function buildDemoTestEmail(when: Date): DemoTestEmail {
  const stamp = when.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  return {
    subject: '[GD-V2 DEMO] Prueba de notificación de workflow',
    message:
      'PRUEBA DE DEMOSTRACIÓN — no es una aprobación ni una corrección real.<br><br>' +
      'Este mensaje verifica que el Sistema de Gestión de Calidad (GD-V2) de Innovax puede ' +
      'entregar las notificaciones por correo del workflow documental.<br><br>' +
      `Generado: ${stamp} (hora de México).`,
  };
}

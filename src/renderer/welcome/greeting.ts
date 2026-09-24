// Saludo de bienvenida segun la hora LOCAL del sistema (sin internet).
//
//   05:00-11:59 -> Buenos dias
//   12:00-18:59 -> Buenas tardes
//   19:00-04:59 -> Buenas noches

export type GreetingKey = 'dias' | 'tardes' | 'noches';

export interface Greeting {
  key: GreetingKey;
  /** "Buenos días" | "Buenas tardes" | "Buenas noches" */
  label: string;
}

export function getGreetingForHour(hour: number): Greeting {
  const h = ((Math.floor(Number(hour)) % 24) + 24) % 24;
  if (h >= 5 && h <= 11) return { key: 'dias', label: 'Buenos días' };
  if (h >= 12 && h <= 18) return { key: 'tardes', label: 'Buenas tardes' };
  return { key: 'noches', label: 'Buenas noches' };
}

export const WELCOME_COMPANY = 'Innovax';
export const WELCOME_SUBTITLE = 'Bienvenidos a su Sistema de Gestión de Calidad.';

/** Titular visible: "Buenos días, Innovax". */
export function welcomeTitle(hour: number): string {
  return `${getGreetingForHour(hour).label}, ${WELCOME_COMPANY}`;
}

/**
 * Lo que dice la voz. Formulacion principal (elegida para la demo):
 *   "Buenos días, Innovax. Bienvenidos a su Sistema de Gestión de Calidad."
 * Alternativa evaluada en la audicion:
 *   "Buenos días. Bienvenidos al Sistema de Gestión de Calidad de Innovax."
 */
export function welcomeSpeech(hour: number, variant: 'principal' | 'alternativa' = 'principal'): string {
  const { label } = getGreetingForHour(hour);
  if (variant === 'alternativa') return `${label}. Bienvenidos al Sistema de Gestión de Calidad de ${WELCOME_COMPANY}.`;
  return `${label}, ${WELCOME_COMPANY}. ${WELCOME_SUBTITLE}`;
}

/** Puesto legible: "coordinador del sgc" -> "Coordinador del SGC". */
export function formatRole(role: string): string {
  const clean = String(role || '').trim().toLowerCase();
  if (!clean) return '';
  const withAcronyms = clean.replace(/\b(sgc|ti|rh|sma|iso)\b/g, m => m.toUpperCase());
  return withAcronyms.charAt(0).toUpperCase() + withAcronyms.slice(1);
}

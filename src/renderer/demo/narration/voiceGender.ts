// Clasificacion del genero de una voz del sistema.
//
// La Web Speech API no expone el genero de las voces. Se infiere por el nombre
// que publica el sistema (Windows, macOS, Android usan nombres de pila) con
// una lista de nombres conocidos. No se usa para ELEGIR una voz concreta: solo
// para descartar las masculinas y las de genero desconocido.
//
// Regla de la demo Innovax: la narradora es femenina. Una voz de genero
// desconocido NUNCA se usa: sin voz femenina, la demo sigue en modo manual.

export type VoiceGender = 'female' | 'male' | 'unknown';

const FEMALE_NAMES = new Set([
  // Espanol (Windows, Edge, macOS, Android)
  'sabina', 'helena', 'laura', 'hilda', 'irene', 'elvira', 'dalia', 'paloma', 'elena', 'monica', 'mónica',
  'paulina', 'conchita', 'penelope', 'penélope', 'lucia', 'lucía', 'mia', 'lupe', 'ximena', 'renata',
  'beatriz', 'candela', 'larissa', 'marisol', 'nuria', 'salome', 'salomé', 'soledad', 'estrella', 'abril',
  'triana', 'vera', 'sabela', 'marina', 'camila', 'catalina', 'valentina', 'andrea', 'elsa', 'belkys',
  'karla', 'margarita', 'maria', 'maría', 'ana', 'isabel', 'luciana', 'teresa', 'yolanda', 'nora',
  // Otros idiomas frecuentes en Windows (por si no hay voz en espanol)
  'zira', 'hazel', 'susan', 'aria', 'jenny', 'michelle', 'libby', 'sonia', 'hortense', 'julie', 'katja',
]);

const MALE_NAMES = new Set([
  'raul', 'raúl', 'pablo', 'jorge', 'juan', 'carlos', 'alvaro', 'álvaro', 'gerardo', 'enrique', 'miguel',
  'diego', 'alonso', 'tomas', 'tomás', 'arnau', 'dario', 'darío', 'liberto', 'saul', 'saúl', 'teo', 'jose',
  'josé', 'pedro', 'manuel', 'andres', 'andrés', 'emilio', 'gonzalo', 'yago', 'mateo', 'rodrigo', 'alberto',
  'federico', 'lorenzo', 'mario', 'nicolas', 'nicolás', 'sergio', 'victor', 'víctor', 'cecilio', 'luciano',
  'david', 'mark', 'guy', 'ryan', 'george', 'james', 'richard', 'paul', 'henri', 'stefan',
]);

/** Nombre de pila de la voz: "Microsoft Sabina - Spanish (Mexico)" -> "sabina". */
function givenNames(name: string): string[] {
  return String(name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(/[\s\-_,]+/)
    .filter(Boolean);
}

export function voiceGender(voice: { name: string }): VoiceGender {
  const raw = String(voice.name || '').toLowerCase();
  if (/\b(female|femenina|mujer|woman)\b/.test(raw)) return 'female';
  if (/\b(male|masculina|hombre|man)\b/.test(raw)) return 'male';
  const tokens = givenNames(voice.name);
  if (tokens.some(t => MALE_NAMES.has(t))) return 'male';
  if (tokens.some(t => FEMALE_NAMES.has(t))) return 'female';
  return 'unknown';
}

export function isFemaleVoice(voice: { name: string }): boolean {
  return voiceGender(voice) === 'female';
}

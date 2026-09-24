// Clave estable de un texto narrado.
//
// El audio pregenerado se asocia al TEXTO que se pronuncia (no al id del paso):
// si alguien cambia una frase en scenes.ts, su clave cambia, el audio anterior
// deja de usarse y la demo cae a la voz local hasta regenerarlo. Asi nunca se
// oye un audio que no coincide con el subtitulo.

export function normalizeSpeech(text: string): string {
  return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** FNV-1a de 32 bits en hexadecimal (determinista, sin dependencias). */
export function speechKey(text: string): string {
  const input = normalizeSpeech(text);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export interface DemoAudioManifest {
  /** Voz con la que se generaron los archivos (vacio si aun no hay audios). */
  voice: string;
  /** Proveedor o metodo de generacion (documentado en el runbook). */
  source: string;
  generatedAt: string;
  /** speechKey(texto) -> nombre de archivo en assets/demo-audio. */
  entries: Record<string, string>;
}

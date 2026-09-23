// Datos de EJEMPLO para narrar el paso FP-15-C.
//
// - Se muestran siempre con la etiqueta "Ejemplo de demo".
// - Estructura inspirada en el formato real FP-15-C de Innovax.
// - Sin nombres de personas: el responsable se expresa por rol/area.
// - Nunca se escriben en la base de datos.

export interface Fp15Example {
  maquina: string;
  area: string;
  parte: string;
  evento: string;
  comentario: string;
  inicio: string;
  fin: string;
  porquesCompletos: number;
  porquesTotal: number;
}

export const FP15_EXAMPLE: Fp15Example = {
  maquina: 'M-31',
  area: 'Logística',
  parte: '085-002',
  evento: 'FALTA DE MATERIAL FÍSICO',
  comentario: 'Material pendiente para iniciar operación.',
  inicio: '07:10',
  fin: '08:42',
  porquesCompletos: 3,
  porquesTotal: 5,
};

function toMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Duracion entre dos horas HH:MM del mismo turno. Si el fin es anterior al
 * inicio se asume que el paro cruzo la medianoche.
 */
export function fp15Duration(inicio: string, fin: string): string {
  const start = toMinutes(inicio);
  const end = toMinutes(fin);
  if (start === null || end === null) return '—';

  const total = end >= start ? end - start : end + 24 * 60 - start;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

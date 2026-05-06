import type { RegistroTemplate } from './types';

export const STORAGE_KEY = 'sgc.registros.personalizados';

export const DEFAULT_DOC_HTML = `
  <h2>Documento nuevo</h2>
  <p>Escribe aquí como en Word: formato, listas, títulos, etc.</p>
`;

export const TEMPLATE_OPTIONS: Array<{ id: RegistroTemplate; label: string }> = [
  { id: 'blank', label: 'Plantilla en blanco' },
  { id: 'bitacora', label: 'Bitácora diaria' },
  { id: 'asistencia', label: 'Control de asistencia' },
  { id: 'inspeccion', label: 'Checklist de inspección' },
];

export const WF_STATUS_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  revision: 'En revisión',
  correcciones: 'Correcciones',
  aprobado: 'Aprobado',
  obsoleto: 'Obsoleto',
};

export const WF_STATUS_CLASS: Record<string, string> = {
  borrador: 'badge--draft',
  revision: 'badge--programada',
  correcciones: 'badge--overdue',
  aprobado: 'badge--approved',
  obsoleto: 'badge--closed',
};

// Etiquetas visibles de cada estado. Los tres estados obligatorios
// (Funciona hoy / Siguiente implementacion / Vision) se muestran con este texto.

import type { DemoStatus } from '../types';

export const STATUS_META: Record<DemoStatus, { label: string; description: string }> = {
  context: {
    label: 'Contexto Innovax',
    description: 'Situación actual de Innovax. No es una capacidad de GD-V2.',
  },
  live: {
    label: 'Funciona hoy',
    description: 'Pantalla real de GD-V2 conectada a la base de datos.',
  },
  next: {
    label: 'Siguiente implementación',
    description: 'Diseño de la siguiente etapa. Todavía no está construido.',
  },
  vision: {
    label: 'Visión',
    description: 'Dirección del producto. No está construido.',
  },
  plan: {
    label: 'Plan',
    description: 'Ruta propuesta de implementación.',
  },
};

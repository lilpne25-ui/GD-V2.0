// Linea de tiempo narrable del recorrido.
//
// Aplana escenas y micro-pasos en una secuencia con punteros next/prev. Es el
// contrato para la Fase 2 (voz): el reproductor podra hacer
//   ejecutar accion -> esperar render -> spotlight -> narrar narrationText
//   -> al terminar el audio, avanzar a `next`
// sin depender de tiempos fijos. Hoy no se reproduce ningun audio.

import type { DataSource, DemoStatus, Scene } from '../types';

export interface TimelineEntry {
  /** Posicion global (0..n-1). */
  index: number;
  sceneId: string;
  sceneIndex: number;
  stepId: string;
  stepIndex: number;
  title: string;
  narrationText: string;
  target: string[];
  status: DemoStatus;
  dataSource: DataSource;
  prev: string | null;
  next: string | null;
}

export function buildTimeline(scenes: Scene[]): TimelineEntry[] {
  const flat: TimelineEntry[] = [];
  scenes.forEach((scene, sceneIndex) => {
    scene.steps.forEach((step, stepIndex) => {
      flat.push({
        index: flat.length,
        sceneId: scene.id,
        sceneIndex,
        stepId: step.id,
        stepIndex,
        title: step.title,
        narrationText: step.narrationText,
        target: step.target || [],
        status: step.status,
        dataSource: step.dataSource,
        prev: null,
        next: null,
      });
    });
  });
  flat.forEach((entry, i) => {
    entry.prev = i > 0 ? flat[i - 1].stepId : null;
    entry.next = i < flat.length - 1 ? flat[i + 1].stepId : null;
  });
  return flat;
}

/** Cuenta frases de un texto narrable (para mantenerlos cortos). */
export function countSentences(text: string): number {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean).length;
}

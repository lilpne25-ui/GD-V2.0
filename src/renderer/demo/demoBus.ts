// Canal entre la Demo guiada y los modulos reales de la aplicacion.
//
// La seccion principal NO pasa por aqui: la demo usa el mismo setSection del
// Sidebar. El bus cubre acciones dentro de modulos que guardan su estado
// localmente (abrir carpeta, abrir un dialogo, fijar la busqueda...).
//
// Semantica:
//  - Cada modulo registra un manejador para su espacio de nombres.
//  - Si la demo envia un comando antes de que el modulo lazy se monte, el
//    comando queda en cola y se entrega al registrarse el manejador.
//  - execute() devuelve si la accion pudo completarse; nunca lanza hacia la
//    demo: un fallo se traduce en "no disponible en este entorno".
//  - Todo comando pasa la politica de solo lectura antes de entregarse.
//
// Sin comandos pendientes, los modulos se comportan exactamente igual que antes.

import { assertReadOnlyAction } from './actions/policy';
import type { ReadOnlyActionKind } from './types';

export type DemoNamespace = 'app' | 'documentacion' | 'registros' | 'dynamic';

export interface DemoCommand {
  kind: ReadOnlyActionKind;
  params?: Record<string, unknown>;
}

export type DemoCommandHandler = (command: DemoCommand) => boolean | Promise<boolean>;

interface Pending {
  command: DemoCommand;
  resolve: (ok: boolean) => void;
}

const handlers: Partial<Record<DemoNamespace, DemoCommandHandler>> = {};
const queues: Record<DemoNamespace, Pending[]> = {
  app: [],
  documentacion: [],
  registros: [],
  dynamic: [],
};

async function deliver(handler: DemoCommandHandler, command: DemoCommand): Promise<boolean> {
  try {
    return Boolean(await handler(command));
  } catch {
    // Un manejador defectuoso no rompe la demo ni el modulo.
    return false;
  }
}

export const demoBus = {
  /** Envia un comando de solo lectura a un modulo. */
  execute(namespace: DemoNamespace, command: DemoCommand): Promise<boolean> {
    assertReadOnlyAction(command.kind);
    const handler = handlers[namespace];
    if (handler) return deliver(handler, command);
    return new Promise<boolean>(resolve => {
      queues[namespace].push({ command, resolve });
    });
  },

  /** Registra el manejador de un modulo y le entrega los comandos en cola. */
  register(namespace: DemoNamespace, handler: DemoCommandHandler): () => void {
    handlers[namespace] = handler;
    const pending = queues[namespace].splice(0);
    void (async () => {
      for (const item of pending) {
        item.resolve(await deliver(handler, item.command));
      }
    })();
    return () => {
      if (handlers[namespace] === handler) delete handlers[namespace];
    };
  },

  /** Descarta los comandos en cola (al cerrar la demo). */
  clear(): void {
    (Object.keys(queues) as DemoNamespace[]).forEach(ns => {
      queues[ns].splice(0).forEach(item => item.resolve(false));
    });
  },

  /** Solo para pruebas: cuantos comandos esperan a un modulo. */
  pendingCount(namespace: DemoNamespace): number {
    return queues[namespace].length;
  },
};

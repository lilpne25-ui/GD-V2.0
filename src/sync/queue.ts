// Manejo de cola de sincronización offline/online (placeholder)
export class SyncQueue {
  private queue: any[] = [];

  add(item: any) {
    this.queue.push(item);
  }

  process() {
    // Procesar la cola
  }
}

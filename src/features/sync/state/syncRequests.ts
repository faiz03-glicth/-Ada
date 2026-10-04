type Listener = () => void;

const listeners = new Set<Listener>();

/** Asks for a sync soon: called after a check-in is saved, deleted or restored. Does nothing for guests. */
export function requestSync(): void {
  listeners.forEach((listener) => listener());
}

/** Subscribes the background sync to those requests; returns the unsubscribe. */
export function onSyncRequested(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

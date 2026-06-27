// Ensures only one trailer preview plays at a time: starting one stops whichever was playing.
// Cards register a listener and call play()/stop(); play() notifies every other card to stop.

type Listener = () => void;

let active: symbol | null = null;
const listeners = new Map<symbol, Listener>();

export const trailerController = {
  /** Make `id` the sole playing trailer and tell every other card to stop. */
  play(id: symbol): void {
    if (active === id) return;
    active = id;
    for (const [key, notifyStop] of listeners) if (key !== id) notifyStop();
  },
  stop(id: symbol): void {
    if (active === id) active = null;
  },
  isActive(id: symbol): boolean {
    return active === id;
  },
  /** `onStop` fires when another trailer takes over, so this card can pause itself. */
  subscribe(id: symbol, onStop: Listener): () => void {
    listeners.set(id, onStop);
    return () => {
      listeners.delete(id);
    };
  },
};

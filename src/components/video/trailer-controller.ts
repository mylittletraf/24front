// Global controller that guarantees at most MAX_CONCURRENT trailers play at once
// (UI_SPEC §3.2). Cards "request" a slot while in view; the controller grants the
// first MAX_CONCURRENT requests and re-grants freed slots to the next waiting card.

const MAX_CONCURRENT = 2;

const wanting: symbol[] = [];
const playing = new Set<symbol>();
const listeners = new Map<symbol, () => void>();

function recompute(): void {
  const shouldPlay = new Set(wanting.slice(0, MAX_CONCURRENT));
  const affected: symbol[] = [];
  for (const id of playing) if (!shouldPlay.has(id)) affected.push(id);
  for (const id of shouldPlay) if (!playing.has(id)) affected.push(id);

  playing.clear();
  shouldPlay.forEach((id) => playing.add(id));

  affected.forEach((id) => listeners.get(id)?.());
}

export const trailerController = {
  request(id: symbol): void {
    if (!wanting.includes(id)) {
      wanting.push(id);
      recompute();
    }
  },
  release(id: symbol): void {
    const index = wanting.indexOf(id);
    if (index !== -1) {
      wanting.splice(index, 1);
      recompute();
    }
  },
  isPlaying(id: symbol): boolean {
    return playing.has(id);
  },
  subscribe(id: symbol, callback: () => void): () => void {
    listeners.set(id, callback);
    return () => {
      listeners.delete(id);
    };
  },
};

import type Hls from "hls.js";

type HlsModule = typeof import("hls.js");

// Lazy singleton for the hls.js module — loaded once, shared across every slide so the swipe feed
// doesn't bundle/parse it per `<video>`. Resolves to null when MSE isn't supported.
let hlsModulePromise: Promise<HlsModule | null> | null = null;

function loadHls(): Promise<HlsModule | null> {
  hlsModulePromise ??= import("hls.js").then((mod) => {
    const Ctor = mod.default;
    return Ctor.isSupported() ? (mod as unknown as HlsModule) : null;
  });
  return hlsModulePromise;
}

/** True when the browser can play HLS natively (Safari / iOS) — no hls.js needed. */
function canPlayNativeHls(video: HTMLVideoElement): boolean {
  return video.canPlayType("application/vnd.apple.mpegurl") !== "";
}

export interface AttachHlsOptions {
  /** Called on a fatal/unrecoverable media error so the feed can auto-skip the slide. */
  onError?: () => void;
}

/**
 * Attach an HLS source to a `<video>`. Uses native playback on Safari, otherwise lazily loads
 * hls.js (shared module) and recovers from non-fatal network/media errors. Returns a destroy
 * function that tears down the hls.js instance (or clears `src` on the native path).
 *
 * Async work is guarded by a `cancelled` flag so a fast swipe (mount→unmount before the dynamic
 * import resolves) never attaches a stale instance.
 */
export function attachHls(
  video: HTMLVideoElement,
  src: string,
  { onError }: AttachHlsOptions = {},
): () => void {
  let cancelled = false;
  let instance: Hls | null = null;

  if (canPlayNativeHls(video)) {
    video.src = src;
    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
  }

  void loadHls().then((mod) => {
    if (cancelled || !mod) {
      // No hls.js / MSE — last-resort native attempt (also covers cancelled mounts cheaply).
      if (!cancelled && !mod) {
        video.src = src;
      }
      return;
    }
    const Hls = mod.default;
    const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
    instance = hls;
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (!data.fatal) return;
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          hls.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError();
          break;
        default:
          onError?.();
      }
    });
  });

  return () => {
    cancelled = true;
    instance?.destroy();
    instance = null;
  };
}

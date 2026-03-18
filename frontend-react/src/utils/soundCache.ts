const sounds = new Set([
  "/clicksound.m4a",
  "/assets/sounds/intro-sound.mp3",
  "/assets/sounds/victory-beat.mp3",
  "/assets/sounds/incorrect.mp3",
  "/assets/sounds/knowledge-point.mp3",
  "/assets/sounds/player-level-up.mp3",
]);

const cachedAudio = new Map<string, HTMLAudioElement>();
const preloadPromises = new Map<string, Promise<void>>();

const getOrCreateAudio = (src: string) => {
  const existing = cachedAudio.get(src);
  if (existing) return existing;

  const audio = new Audio(src);
  audio.preload = "auto";
  cachedAudio.set(src, audio);
  return audio;
};

export const warmSound = (src: string) => {
  if (!sounds.has(src)) return Promise.resolve();
  if (typeof Audio === "undefined") return Promise.resolve();

  const pending = preloadPromises.get(src);
  if (pending) return pending;

  const audio = getOrCreateAudio(src);
  const promise = new Promise<void>((resolve) => {
    if (audio.readyState >= 2) {
      resolve();
      return;
    }

    const settle = () => {
      audio.removeEventListener("loadeddata", settle);
      audio.removeEventListener("canplaythrough", settle);
      audio.removeEventListener("error", settle);
      resolve();
    };

    audio.addEventListener("loadeddata", settle, { once: true });
    audio.addEventListener("canplaythrough", settle, { once: true });
    audio.addEventListener("error", settle, { once: true });
    audio.load();
  }).finally(() => {
    preloadPromises.delete(src);
  });

  preloadPromises.set(src, promise);
  return promise;
};

export const playSound = (src: string, volume: number = 1) => {
  if (!sounds.has(src)) {
    console.warn(`Sound not found: ${src}`);
    return;
  }

  const audio = getOrCreateAudio(src);
  audio.volume = volume;
  audio.currentTime = 0;
  audio.play().catch((err) => console.error("Error playing sound:", err));
};

// Backward-compatible alias for existing callers.
export const preloadSounds = playSound;

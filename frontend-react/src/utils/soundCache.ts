// src/utils/soundCache.ts
const sounds = [
  "/clicksound.m4a",
  "/intro-sound.mp3",
  "/victory-beat.mp3",
  "/incorrect.mp3",
  "/knowledge-point.mp3",
  "/player-level-up.mp3",
];

// Play a specific sound with optional volume
export const preloadSounds = (src: string, volume: number = 1) => {
  if (!sounds.includes(src)) {
    console.warn(`Sound not found: ${src}`);
    return;
  }

  const audio = new Audio(src);
  audio.volume = volume; // volume between 0 and 1
  audio.play().catch((err) => console.error("Error playing sound:", err));
};

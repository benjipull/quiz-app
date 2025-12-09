// src/utils/soundCache.ts
const sounds = [
  "/clicksound.m4a",
  "/intro-sound.mp3",
  "/victory-beat.mp3",
  "/incorrect.mp3",
  "/knowledge-point.mp3",
  "/player-level-up.mp3",
];

export const preloadSounds = () => {
  sounds.forEach((src) => {
    const audio = new Audio();
    audio.src = src;
    audio.load();
  });
};

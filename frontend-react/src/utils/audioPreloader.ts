// src/utils/audioPreloader.ts

// 💡 NEW: Use eager glob import to include all sound files in the build bundle.
// This is critical for caching, as it forces the browser to download the files
// as part of the initial app bundle, eliminating per-play network requests.
const soundFiles = import.meta.glob("../assets/sounds/*.mp3", {
  eager: true,
  import: "default", // Ensure the imported value is the direct URL
});

// Cache to hold loaded HTMLAudioElement objects
export const cachedSounds: Record<string, HTMLAudioElement> = {};

/**
 * Preloads all sound files by eagerly loading them and storing them
 * as HTMLAudioElement objects in the cachedSounds map.
 */
export const preloadSounds = () => {
  if (Object.keys(cachedSounds).length > 0) {
    console.log("🔊 Sounds already preloaded.");
    return;
  }

  console.log("🚀 Starting sound preloading...");
  
  Object.entries(soundFiles).forEach(([path, url]) => {
    // Extracts the filename (e.g., 'levelUp' from '../assets/sounds/levelUp.mp3')
    const fileNameMatch = path.match(/([^\/]+)\.mp3$/);
    const fileName = fileNameMatch ? fileNameMatch[1] : null;
    
    if (fileName) {
      const audio = new Audio(url as string);
      audio.load(); // Request the audio file data immediately
      cachedSounds[fileName] = audio;
    }
  });
  
  console.log(`✅ Preloaded ${Object.keys(cachedSounds).length} sound files.`);
};

/**
 * Helper function to play a cached sound
 * @param key The filename key (without extension) of the sound to play
 */
export const playCachedSound = (key: string) => {
  const audio = cachedSounds[key];
  if (audio) {
    // Cloning the node allows the sound to be played multiple times concurrently
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.play().catch(e => console.warn("Could not play sound:", key, e));
  } else {
    console.warn(`Sound not found in cache: ${key}`);
  }
};
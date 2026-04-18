export interface PreloadConfig {
  images: string[];
  sounds: string[];
}

/**
 * Single source of truth for eager preloads.
 * Only files listed here are preloaded on app startup.
 * Every other image/sound loads on demand when first used.
 */
export const PRELOAD_CONFIG: PreloadConfig = {
  images: [
    "/assets/images/homebg1.jpg",
    "/assets/images/image.png",
    "/assets/images/moon.jpg",
    "/assets/images/q.jpg",
    "/assets/images/icons/coin gift.png",
    "/assets/images/icons/coin.png",
    "/assets/images/icons/edit-icon.png",
    "/assets/images/icons/play-icon.png",
  ],
  sounds: [
    "/clicksound.m4a",
    "/assets/sounds/knowledge-point.mp3",
  ],
};

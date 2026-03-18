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
    "/homebg1.jpg",
    "/image.png",
    "/logo1.jpg",
    "/moon.jpg",
    "/moon.jpg",
    "/q.jpg",
    "/assets/images/icons/coin gift.png",
    "/assets/images/icons/edit-icon.png",
    "/assets/images/icons/play-icon.png",
  ],
  sounds: [
    "/clicksound.m4a",
    "/completion-page.mp3",
    "/correct.mp3",
    "/incorrect.mp3",
    "/intro-sound.mp3",
    "/knowledge-point.mp3",
    "/level-up.mp3",
    "/player-level-up.mp3",
    "/purchase-success.mp3",
    "/success_bell.mp3",
    "/victory-beat.mp3",
  ],
};

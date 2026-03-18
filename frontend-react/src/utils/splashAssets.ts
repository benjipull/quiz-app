import { PRELOAD_CONFIG } from "@/utils/preloadConfig";
import { warmSound } from "@/utils/soundCache";

const preloadedImageSources = new Map<string, string>();

const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    if (typeof Image === "undefined") {
      resolve();
      return;
    }

    const image = new Image();
    const settle = () => {
      preloadedImageSources.set(src, image.currentSrc || image.src);
      resolve();
    };

    image.onload = settle;
    image.onerror = settle;
    image.src = src;

    if (image.complete) {
      resolve();
    }
  });

const preloadAudio = (src: string) =>
  new Promise<void>((resolve) => {
    warmSound(src).finally(resolve);
  });

let splashAssetsReady = false;
let splashAssetsPromise: Promise<void> | null = null;

export const areSplashAssetsReady = () => splashAssetsReady;
export const getPreloadedImageSrc = (src: string) => preloadedImageSources.get(src) ?? src;

export const preloadSplashAssets = async () => {
  if (splashAssetsReady) return;
  if (splashAssetsPromise) return splashAssetsPromise;

  const imageAssets = Array.from(new Set(PRELOAD_CONFIG.images));
  const soundAssets = Array.from(new Set(PRELOAD_CONFIG.sounds));

  splashAssetsPromise = (async () => {
    await Promise.allSettled([
      ...imageAssets.map((asset) => preloadImage(asset)),
      ...soundAssets.map((asset) => preloadAudio(asset)),
    ]);

    splashAssetsReady = true;
  })();

  return splashAssetsPromise;
};

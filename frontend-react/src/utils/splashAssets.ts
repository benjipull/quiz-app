import { PRELOAD_CONFIG } from "@/utils/preloadConfig";

const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    if (typeof Image === "undefined") {
      resolve();
      return;
    }

    const image = new Image();
    const settle = () => resolve();

    image.onload = settle;
    image.onerror = settle;
    image.src = src;

    if (image.complete) {
      resolve();
    }
  });

const preloadAudio = (src: string) =>
  new Promise<void>((resolve) => {
    if (typeof Audio === "undefined") {
      resolve();
      return;
    }

    const audio = new Audio();
    let settled = false;

    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      audio.onloadeddata = null;
      audio.oncanplaythrough = null;
      audio.onerror = null;
      audio.onstalled = null;
      audio.onabort = null;
      resolve();
    };

    const timeoutId = setTimeout(settle, 5000);

    audio.preload = "auto";
    audio.onloadeddata = settle;
    audio.oncanplaythrough = settle;
    audio.onerror = settle;
    audio.onstalled = settle;
    audio.onabort = settle;
    audio.src = src;
    audio.load();
  });

let splashAssetsReady = false;
let splashAssetsPromise: Promise<void> | null = null;

export const areSplashAssetsReady = () => splashAssetsReady;

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

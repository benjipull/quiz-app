const srcImageModules = import.meta.glob("../assets/**/*.{png,jpg,jpeg,JPG,webp,gif,svg}", {
  eager: true,
  import: "default",
});

const SRC_IMAGE_ASSETS = Object.values(srcImageModules).filter(
  (asset): asset is string => typeof asset === "string"
);

const PUBLIC_IMAGE_ASSETS = [
  "/fairy.png",
  "/homebg.jpg",
  "/homebg1.jpg",
  "/image.png",
  "/leaderboard.jpg",
  "/logo1.jpg",
  "/moon.jpg",
  "/moon1.JPG",
  "/q.jpg",
  "/splash-screen.png",
  "/trophies.jpg",
  "/trophy.png",
  "/assets/splash-screen.png",
  "/assets/images/avatars/1.png",
  "/assets/images/avatars/2.png",
  "/assets/images/avatars/3.png",
  "/assets/images/avatars/4.png",
  "/assets/images/avatars/5.png",
  "/assets/images/avatars/6.png",
  "/assets/images/avatars/7.png",
  "/assets/images/avatars/8.png",
  "/assets/images/avatars/9.png",
  "/assets/images/avatars/10.png",
  "/assets/images/avatars/11.png",
  "/assets/images/avatars/12.png",
  "/assets/images/avatars/13.png",
  "/assets/images/avatars/14.png",
  "/assets/images/avatars/15.png",
  "/assets/images/icons/coin gift.png",
  "/assets/images/icons/edit icon.png",
  "/assets/images/icons/edit-icon-cropped.png",
  "/assets/images/icons/KP Icon.png",
  "/assets/images/icons/Play Icon.png",
  "/assets/images/icons/play.png",
];

const PUBLIC_SOUND_ASSETS = [
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
];

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

  const imageAssets = Array.from(new Set([...SRC_IMAGE_ASSETS, ...PUBLIC_IMAGE_ASSETS]));
  const soundAssets = Array.from(new Set(PUBLIC_SOUND_ASSETS));

  splashAssetsPromise = (async () => {
    await Promise.allSettled([
      ...imageAssets.map((asset) => preloadImage(asset)),
      ...soundAssets.map((asset) => preloadAudio(asset)),
    ]);

    splashAssetsReady = true;
  })();

  return splashAssetsPromise;
};

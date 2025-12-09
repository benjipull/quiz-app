// src/utils/avatarCache.ts
const avatarUrls = [
  "../assets/images/avatars/1.png",
  "../assets/images/avatars/2.png",
  "../assets/images/avatars/3.png",
  "../assets/images/avatars/4.png",
  "../assets/images/avatars/5.png",
  "../assets/images/avatars/6.png",
  "../assets/images/avatars/7.png",
  "../assets/images/avatars/8.png",
  "../assets/images/avatars/9.png",
  "../assets/images/avatars/10.png",
  "../assets/images/avatars/11.png",
  "../assets/images/avatars/12.png",
  "../assets/images/avatars/13.png",
  "../assets/images/avatars/14.png",
  "../assets/images/avatars/15.png",
];

export const preloadAvatars = () => {
  avatarUrls.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
};

// src/utils/avatarCache.ts - FIXED VERSION
// Use absolute paths that match your public directory structure

const avatarUrls = [
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
];

// Preload all avatars into browser cache
export const preloadAvatars = () => {
  console.log("🖼️ Starting avatar preload...");
  
  avatarUrls.forEach((src, index) => {
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      console.log(`✅ Avatar ${index + 1} cached`);
    };
    
    img.onerror = () => {
      console.warn(`⚠️ Failed to cache avatar ${index + 1}: ${src}`);
    };
  });
  
  console.log(`📦 Initiated preload for ${avatarUrls.length} avatars`);
};

// Export avatar URLs for use in components
export { avatarUrls };
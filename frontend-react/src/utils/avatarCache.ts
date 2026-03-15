// src/utils/avatarCache.ts - FIXED VERSION
// Use absolute paths that match your public directory structure

const avatarUrls = [

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
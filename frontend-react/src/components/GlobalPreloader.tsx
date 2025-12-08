// src/components/GlobalPreloader.tsx - Enhanced with better debugging
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { preloadCategoryAndSession, globalCache, isQuizSessionReady } from '@/hooks/useAppPreloader';

/**
 * GlobalPreloader - Ensures quiz sessions are always preloaded
 * Place this component at the root of your app to maintain preloaded state
 */
export const GlobalPreloader = () => {
  const location = useLocation();
  const lastPreloadRef = useRef(0);
  const isPreloadingRef = useRef(false);
  const hasInitialPreloadRef = useRef(false);

  // Initial preload on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (hasInitialPreloadRef.current) {
      console.log("⏭️ GlobalPreloader: Already did initial preload");
      return;
    }

    hasInitialPreloadRef.current = true;

    const doInitialPreload = async () => {
      console.log("🎬 GlobalPreloader: Starting initial preload...");
      
      try {
        await preloadCategoryAndSession();
        console.log("✅ GlobalPreloader: Initial preload complete");
        
        // Log cache status
        if (globalCache.nextCategory) {
          console.log("📦 Cache Status:", {
            category: globalCache.nextCategory.name,
            categoryId: globalCache.nextCategory.categoryId,
            hasSession: !!globalCache.quizSession,
            hasQuestion: !!globalCache.firstQuestion,
            isReady: isQuizSessionReady(globalCache.nextCategory.categoryId)
          });
        }
      } catch (error) {
        console.error("❌ GlobalPreloader: Initial preload failed", error);
      }
    };

    // Start preload after a short delay to let the app settle
    const timer = setTimeout(doInitialPreload, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Preload on navigation changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const shouldPreload = () => {
      const now = Date.now();
      const timeSinceLastPreload = now - lastPreloadRef.current;
      
      // Don't preload if we just did (within 10 seconds)
      if (timeSinceLastPreload < 10 * 1000 && isPreloadingRef.current) {
        console.log("⏭️ Skipping preload - too soon since last attempt");
        return false;
      }

      // Check if we have a valid session
      const hasValidSession = globalCache.nextCategory && 
                             isQuizSessionReady(globalCache.nextCategory.categoryId);
      
      if (hasValidSession) {
        const sessionAge = Date.now() - globalCache.lastUpdated.quizSession;
        // Session is still fresh (< 20 minutes)
        if (sessionAge < 20 * 60 * 1000) {
          console.log("✅ Session still fresh, no preload needed");
          return false;
        }
      }

      return true;
    };

    const doPreload = async () => {
      if (!shouldPreload()) return;
      
      isPreloadingRef.current = true;
      lastPreloadRef.current = Date.now();
      
      console.log("🔄 GlobalPreloader: Navigation detected, checking preload...");
      
      try {
        await preloadCategoryAndSession();
        console.log("✅ GlobalPreloader: Navigation preload complete");
      } catch (error) {
        console.error("❌ GlobalPreloader: Navigation preload failed", error);
      } finally {
        isPreloadingRef.current = false;
      }
    };

    // Delay slightly to avoid preloading during rapid navigation
    const timer = setTimeout(doPreload, 200);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Periodic refresh - check every 2 minutes if we need to refresh
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const interval = setInterval(() => {
      const sessionAge = Date.now() - globalCache.lastUpdated.quizSession;
      
      // Refresh if session is older than 15 minutes
      if (sessionAge > 15 * 60 * 1000) {
        console.log("🔄 GlobalPreloader: Periodic refresh triggered");
        preloadCategoryAndSession();
      } else {
        console.log("✅ GlobalPreloader: Periodic check - cache still fresh");
      }
    }, 2 * 60 * 1000); // Check every 2 minutes

    return () => clearInterval(interval);
  }, []);

  // Listen for visibility changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("👁️ GlobalPreloader: Page visible, checking cache...");
        
        const sessionAge = Date.now() - globalCache.lastUpdated.quizSession;
        
        // If cache is older than 3 minutes, refresh
        if (sessionAge > 3 * 60 * 1000) {
          console.log("🔄 GlobalPreloader: Cache stale after visibility change, refreshing...");
          setTimeout(() => {
            preloadCategoryAndSession();
          }, 500);
        } else {
          console.log("✅ GlobalPreloader: Cache fresh after visibility check");
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
};

export default GlobalPreloader;
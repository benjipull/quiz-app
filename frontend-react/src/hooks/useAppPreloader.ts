import { useEffect, useRef } from 'react';
import { preloadSounds } from '@/utils/soundCache'; 
import { preloadAvatars } from '@/utils/avatarCache'; 

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Global cache objects
export const globalCache = {
  homeData: null as any,
  leaderboardData: {
    day: [] as any[],
    week: [] as any[],
    month: [] as any[],
    year: [] as any[],
  },
  nextCategory: null as any,
  quizSession: null as any,
  firstQuestion: null as any,
  lastUpdated: {
    home: 0,
    leaderboard: 0,
    category: 0,
    quizSession: 0,
  }
};

const CACHE_DURATION = {
  HOME: 5 * 60 * 1000,
  LEADERBOARD: 10 * 60 * 1000,
  CATEGORY: 2 * 60 * 1000,
  QUIZ_SESSION: 5 * 60 * 1000,
};

// 🔥 NEW: Track ongoing fetch operations to prevent duplicates
const ongoingFetches = {
  home: null as Promise<void> | null,
  leaderboard: null as Promise<void> | null,
  category: null as Promise<void> | null,
  quizSession: null as Promise<void> | null,
};

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const userToken = localStorage.getItem("token") || "";
  const headers: any = {
    ...options.headers,
    "Authorization": `Bearer ${userToken}`,
  };
  
  if (options.body) headers["Content-Type"] = "application/json";

  return fetch(url, { ...options, headers });
};

// -------------------- HOME --------------------
const preloadHomeData = async (): Promise<void> => {
  const now = Date.now();
  if (globalCache.homeData && (now - globalCache.lastUpdated.home) < CACHE_DURATION.HOME) {
    return;
  }

  // 🔥 Return existing promise if already fetching
  if (ongoingFetches.home) {
    console.log("⏭️ Home data already fetching, reusing promise");
    return ongoingFetches.home;
  }

  ongoingFetches.home = (async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      console.log("🌐 Fetching home data...");
      const userResponse = await authenticatedFetch(`${BASE_URL}/api/getUserDetails`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        globalCache.homeData = { user: userData, timestamp: now };
        globalCache.lastUpdated.home = now;
        console.log("✅ Home data preloaded");
      }
    } catch (err) {
      console.error("Error preloading home:", err);
    } finally {
      ongoingFetches.home = null;
    }
  })();

  return ongoingFetches.home;
};

// -------------------- LEADERBOARD --------------------
export const preloadLeaderboardData = async (): Promise<void> => {
  const now = Date.now();
  
  // Check if already cached and valid
  if (
    globalCache.leaderboardData.day.length &&
    (now - globalCache.lastUpdated.leaderboard) < CACHE_DURATION.LEADERBOARD
  ) {
    console.log("✅ Using cached leaderboard data");
    return;
  }

  // 🔥 Return existing promise if already fetching
  if (ongoingFetches.leaderboard) {
    console.log("⏭️ Leaderboard already fetching, reusing promise");
    return ongoingFetches.leaderboard;
  }

  ongoingFetches.leaderboard = (async () => {
    try {
      console.log("🌐 Fetching all leaderboard periods...");
      const periods = ['day', 'week', 'month', 'year'] as const;

      // Fetch all periods in parallel
      const results = await Promise.allSettled(
        periods.map(async (period) => {
          const res = await authenticatedFetch(`${BASE_URL}/api/leaderboard?period=${period}`);
          if (res.ok) {
            const data = await res.json();
            globalCache.leaderboardData[period] = data.leaderboard || [];
            console.log(`✅ ${period} leaderboard cached`);
          }
        })
      );

      globalCache.lastUpdated.leaderboard = now;
      console.log("✅ All leaderboards preloaded");
    } catch (err) {
      console.error("Leaderboard preload error:", err);
    } finally {
      ongoingFetches.leaderboard = null;
    }
  })();

  return ongoingFetches.leaderboard;
};

// -------------------- CATEGORY --------------------
export const preloadNextCategory = async (): Promise<void> => {
  const now = Date.now();
  if (
    globalCache.nextCategory &&
    (now - globalCache.lastUpdated.category) < CACHE_DURATION.CATEGORY
  ) {
    return;
  }

  // 🔥 Return existing promise if already fetching
  if (ongoingFetches.category) {
    console.log("⏭️ Category already fetching, reusing promise");
    return ongoingFetches.category;
  }

  ongoingFetches.category = (async () => {
    try {
      console.log("🌐 Fetching next category...");
      const res = await authenticatedFetch(`${BASE_URL}/api/getGetegoryToPlay`);
      if (res.ok) {
        const data = await res.json();
        if (data.categoryId) {
          globalCache.nextCategory = data;
          globalCache.lastUpdated.category = now;
          console.log("✅ Next category cached:", data.categoryId);
        }
      }
    } catch (err) {
      console.error("Category preload error:", err);
    } finally {
      ongoingFetches.category = null;
    }
  })();

  return ongoingFetches.category;
};

// -------------------- SAFE QUIZ SESSION PRELOAD --------------------
export const preloadQuizSession = async (categoryId: string): Promise<boolean> => {
  const now = Date.now();

  // Use cache if still valid
  if (
    globalCache.quizSession &&
    globalCache.quizSession.categoryId === categoryId &&
    (now - globalCache.lastUpdated.quizSession) < CACHE_DURATION.QUIZ_SESSION
  ) {
    return true;
  }

  // 🔥 Return existing promise if already fetching
  if (ongoingFetches.quizSession) {
    console.log("⏭️ Quiz session already fetching, reusing promise");
    await ongoingFetches.quizSession;
    return globalCache.quizSession?.categoryId === categoryId;
  }

  ongoingFetches.quizSession = (async () => {
    try {
      console.log("🌐 Fetching category name for:", categoryId);
      
      // Fetch category name safely
      let categoryName = "Quiz";
      try {
        const res = await authenticatedFetch(`${BASE_URL}/api/categories`);
        if (res.ok) {
          const cats = await res.json();
          const match = cats.find((c: any) => c._id === categoryId);
          if (match) categoryName = match.name;
        }
      } catch (err) {
        console.warn("Failed to fetch category name:", err);
      }

      // Cache metadata
      globalCache.quizSession = {
        categoryId,
        categoryName,
        totalQuestions: 10,
        started: false,
        timestamp: now
      };

      globalCache.lastUpdated.quizSession = now;
      console.log("✅ Quiz metadata cached:", categoryName);
    } catch (err) {
      console.error("Quiz preload failed:", err);
      clearQuizCache();
    } finally {
      ongoingFetches.quizSession = null;
    }
  })();

  await ongoingFetches.quizSession;
  return globalCache.quizSession?.categoryId === categoryId;
};

// -------------------- CACHE CLEAR --------------------
export const clearQuizCache = () => {
  globalCache.quizSession = null;
  globalCache.firstQuestion = null;
  globalCache.lastUpdated.quizSession = 0;
  console.log("🧹 Quiz cache cleared");
};

// -------------------- COMBINED PRELOAD --------------------
export const preloadCategoryAndSession = async () => {
  await preloadNextCategory();
  if (globalCache.nextCategory?.categoryId) {
    await preloadQuizSession(globalCache.nextCategory.categoryId);
  }
};

// -------------------- MAIN PRELOADER --------------------
export const preloadAllData = async () => {
  const token = localStorage.getItem("token");

  console.log("🎵 Preloading sounds...");
  preloadSounds();
  console.log("🖼️ Preloading avatars...");
  preloadAvatars();

  if (!token) return;

  // 🔥 CRITICAL: Use Promise.all to prevent multiple simultaneous calls
  await Promise.all([
    preloadHomeData(),
    preloadLeaderboardData(),
    preloadCategoryAndSession(),
  ]);

  console.log("✅ All preloading complete");
};

// -------------------- HOOK --------------------
export const useAppPreloader = () => {
  const hasPreloaded = useRef(false);

  useEffect(() => {
    if (!hasPreloaded.current) {
      hasPreloaded.current = true;
      preloadAllData();
    }

    // Refresh cache periodically (but not too often)
    const interval = setInterval(() => {
      preloadHomeData();
      preloadLeaderboardData();
    }, 2 * 60 * 1000); // Every 2 minutes instead of 1

    return () => clearInterval(interval);
  }, []);

  return {
    preloadHomeData,
    preloadLeaderboardData,
    preloadNextCategory,
    preloadQuizSession,
    preloadCategoryAndSession,
    clearQuizCache,
    globalCache,
  };
};

// -------------------- EXPORTS --------------------
export { preloadHomeData };

// -------------------- READY CHECK --------------------
export const isQuizSessionReady = (categoryId: string): boolean => {
  return !!(
    globalCache.quizSession &&
    globalCache.quizSession.categoryId === categoryId &&
    globalCache.quizSession.categoryName
  );
};
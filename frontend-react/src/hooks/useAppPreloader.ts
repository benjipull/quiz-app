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

// ✅ OPTIMIZATION 1: Longer cache durations to reduce API calls
const CACHE_DURATION = {
  HOME: 10 * 60 * 1000,        // 10 minutes (was 5)
  LEADERBOARD: 15 * 60 * 1000, // 15 minutes (was 10)
  CATEGORY: 5 * 60 * 1000,      // 5 minutes (was 2)
  QUIZ_SESSION: 10 * 60 * 1000, // 10 minutes (was 5)
};

// Track ongoing fetch operations to prevent duplicates
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

// ✅ OPTIMIZATION 2: Batch API calls where possible
const fetchUserDataBatch = async () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    // Fetch user details and categories in parallel
    const [userResponse, categoriesResponse] = await Promise.all([
      authenticatedFetch(`${BASE_URL}/api/getUserDetails`),
      authenticatedFetch(`${BASE_URL}/api/getGetegoryToPlay`)
    ]);

    const userData = userResponse.ok ? await userResponse.json() : null;
    const categoryData = categoriesResponse.ok ? await categoriesResponse.json() : null;

    return { userData, categoryData };
  } catch (err) {
    console.error("Error in batch fetch:", err);
    return null;
  }
};

// -------------------- HOME --------------------
const preloadHomeData = async (): Promise<void> => {
  const now = Date.now();
  if (globalCache.homeData && (now - globalCache.lastUpdated.home) < CACHE_DURATION.HOME) {
    console.log("⚡ Using cached home data");
    return;
  }

  if (ongoingFetches.home) {
    console.log("⏸️ Home data already fetching, reusing promise");
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

// -------------------- LEADERBOARD (ON-DEMAND ONLY) --------------------
export const preloadLeaderboardData = async (): Promise<void> => {
  const now = Date.now();
  
  if (
    globalCache.leaderboardData.day.length &&
    (now - globalCache.lastUpdated.leaderboard) < CACHE_DURATION.LEADERBOARD
  ) {
    console.log("✅ Using cached leaderboard data");
    return;
  }

  if (ongoingFetches.leaderboard) {
    console.log("⏸️ Leaderboard already fetching, reusing promise");
    return ongoingFetches.leaderboard;
  }

  ongoingFetches.leaderboard = (async () => {
    try {
      console.log("🌐 Fetching all leaderboard periods...");
      const periods = ['day', 'week', 'month', 'year'] as const;

      // ✅ OPTIMIZATION 3: Fetch all periods in parallel
      await Promise.allSettled(
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
    console.log("⚡ Using cached category");
    return;
  }

  if (ongoingFetches.category) {
    console.log("⏸️ Category already fetching, reusing promise");
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

  if (
    globalCache.quizSession &&
    globalCache.quizSession.categoryId === categoryId &&
    (now - globalCache.lastUpdated.quizSession) < CACHE_DURATION.QUIZ_SESSION
  ) {
    console.log("⚡ Using cached quiz session");
    return true;
  }

  if (ongoingFetches.quizSession) {
    console.log("⏸️ Quiz session already fetching, reusing promise");
    await ongoingFetches.quizSession;
    return globalCache.quizSession?.categoryId === categoryId;
  }

  ongoingFetches.quizSession = (async () => {
    try {
      console.log("🌐 Fetching category name for:", categoryId);
      
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

// ✅ OPTIMIZATION 4: Intelligent preloading strategy
export const preloadAllData = async () => {
  const token = localStorage.getItem("token");

  // ✅ Non-blocking: Start asset preloading immediately (don't await)
  console.log("🎵 Preloading sounds (non-blocking)...");
  preloadSounds();
  console.log("🖼️ Preloading avatars (non-blocking)...");
  preloadAvatars();

  if (!token) return;

  // ✅ CRITICAL PATH: Only load what's needed for first screen
  // Parallelize critical data
  await Promise.all([
    preloadHomeData(),
    preloadCategoryAndSession(),
  ]);

  console.log("✅ Critical preloading complete");

  // ✅ OPTIMIZATION 5: Defer non-critical data
  // Load leaderboard after a short delay (not blocking initial render)
  setTimeout(() => {
    console.log("⏳ Starting deferred leaderboard preload...");
    preloadLeaderboardData();
  }, 2000);
};

// -------------------- HOOK --------------------
export const useAppPreloader = () => {
  const hasPreloaded = useRef(false);

  useEffect(() => {
    if (!hasPreloaded.current) {
      hasPreloaded.current = true;
      preloadAllData();
    }

    // ✅ OPTIMIZATION 6: Smart refresh intervals
    const criticalInterval = setInterval(() => {
      // Only refresh if data is stale
      const now = Date.now();
      if (now - globalCache.lastUpdated.home > CACHE_DURATION.HOME) {
        preloadHomeData();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(criticalInterval);
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

export { preloadHomeData };

export const isQuizSessionReady = (categoryId: string): boolean => {
  return !!(
    globalCache.quizSession &&
    globalCache.quizSession.categoryId === categoryId &&
    globalCache.quizSession.categoryName
  );
};
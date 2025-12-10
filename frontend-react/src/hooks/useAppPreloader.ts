import { useEffect, useRef } from 'react';
// 🔥 NEW: Import sound and avatar preloading utilities
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

// Track ongoing preload operations
let isPreloadingSession = false;
let sessionPreloadPromise: Promise<boolean> | null = null;

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
const preloadHomeData = async () => {
  const now = Date.now();
  if (globalCache.homeData && (now - globalCache.lastUpdated.home) < CACHE_DURATION.HOME) return;

  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    const userResponse = await authenticatedFetch(`${BASE_URL}/api/getUserDetails`);
    if (userResponse.ok) {
      const userData = await userResponse.json();
      globalCache.homeData = { user: userData, timestamp: now };
      globalCache.lastUpdated.home = now;
      console.log("✅ Home data preloaded");
    }
  } catch (err) {
    console.error("Error preloading home:", err);
  }
};

// -------------------- LEADERBOARD --------------------
const preloadLeaderboardData = async () => {
  const now = Date.now();
  if (
    globalCache.leaderboardData.day.length &&
    (now - globalCache.lastUpdated.leaderboard) < CACHE_DURATION.LEADERBOARD
  ) return;

  try {
    const periods = ['day', 'week', 'month', 'year'] as const;

    await Promise.allSettled(
      periods.map(async (period) => {
        const res = await authenticatedFetch(`${BASE_URL}/api/leaderboard?period=${period}`);
        if (res.ok) {
          const data = await res.json();
          globalCache.leaderboardData[period] = data.leaderboard || [];
        }
      })
    );

    globalCache.lastUpdated.leaderboard = now;
    console.log("✅ Leaderboard preloaded");
  } catch (err) {
    console.error("Leaderboard preload error:", err);
  }
};

// -------------------- CATEGORY --------------------
const preloadNextCategory = async () => {
  const now = Date.now();
  if (
    globalCache.nextCategory &&
    (now - globalCache.lastUpdated.category) < CACHE_DURATION.CATEGORY
  ) return;

  try {
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
  }
};

// -------------------- SAFE QUIZ SESSION PRELOAD --------------------
// ✅ SAFE: NO coin deduction, no real session creation
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

  if (isPreloadingSession && sessionPreloadPromise) {
    return sessionPreloadPromise;
  }

  isPreloadingSession = true;
  clearQuizCache();

  sessionPreloadPromise = (async () => {
    try {
      // ✅ Fetch category name safely
      let categoryName = "Quiz";
      try {
        const res = await authenticatedFetch(`${BASE_URL}/api/categories`);
        if (res.ok) {
          const cats = await res.json();
          const match = cats.find((c: any) => c._id === categoryId);
          if (match) categoryName = match.name;
        }
      } catch {}

      // ✅ SAFE: only cache metadata
      globalCache.quizSession = {
        categoryId,
        categoryName,
        totalQuestions: 10,
        started: false,
        timestamp: now
      };

      globalCache.lastUpdated.quizSession = now;

      console.log("✅ Safe quiz metadata cached:", categoryName);
      return true;
    } catch (err) {
      console.error("Quiz preload failed:", err);
      clearQuizCache();
      return false;
    } finally {
      isPreloadingSession = false;
      sessionPreloadPromise = null;
    }
  })();

  return sessionPreloadPromise;
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

  await Promise.allSettled([
    preloadHomeData(),
    preloadLeaderboardData(),
    preloadCategoryAndSession(),
  ]);

  console.log("✅ Preload done");
};

// -------------------- HOOK --------------------
export const useAppPreloader = () => {
  const hasPreloaded = useRef(false);

  useEffect(() => {
    if (!hasPreloaded.current) {
      hasPreloaded.current = true;
      preloadAllData();
    }

    const interval = setInterval(() => {
      preloadHomeData();
      preloadLeaderboardData();
    }, 60 * 1000);

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
export { preloadHomeData, preloadLeaderboardData, preloadNextCategory };

// -------------------- READY CHECK --------------------
export const isQuizSessionReady = (categoryId: string): boolean => {
  return !!(
    globalCache.quizSession &&
    globalCache.quizSession.categoryId === categoryId &&
    globalCache.quizSession.categoryName
  );
};

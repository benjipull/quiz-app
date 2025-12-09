// src/hooks/useAppPreloader.ts - Complete Fixed Version
import { useEffect, useRef } from 'react';

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
  QUIZ_SESSION: 5 * 60 * 1000, // 5 minutes - shorter to avoid stale sessions
};

// Track ongoing preload operations
let isPreloadingSession = false;
let sessionPreloadPromise: Promise<boolean> | null = null;

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const userToken = localStorage.getItem("token") || "";
  const headers = {
    ...options.headers,
    "Authorization": `Bearer ${userToken}`,
    "Content-Type": "application/json",
  };
  
  if (!options.body && (options.method === 'GET' || options.method === 'HEAD')) {
    delete headers["Content-Type"];
  }

  return fetch(url, { ...options, headers });
};

const preloadHomeData = async () => {
  const now = Date.now();
  if (globalCache.homeData && (now - globalCache.lastUpdated.home) < CACHE_DURATION.HOME) {
    return;
  }

  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    const userResponse = await authenticatedFetch(`${BASE_URL}/api/getUserDetails`, {
      method: "GET",
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      globalCache.homeData = {
        user: userData,
        timestamp: now,
      };
      globalCache.lastUpdated.home = now;
      console.log("✅ Home data preloaded");
    }
  } catch (error) {
    console.error("Error preloading home data:", error);
  }
};

const preloadLeaderboardData = async () => {
  const now = Date.now();
  if (globalCache.leaderboardData.day.length > 0 && 
      (now - globalCache.lastUpdated.leaderboard) < CACHE_DURATION.LEADERBOARD) {
    return;
  }

  try {
    const periods = ['day', 'week', 'month', 'year'] as const;
    
    const promises = periods.map(async (period) => {
      const response = await authenticatedFetch(`${BASE_URL}/api/leaderboard?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        globalCache.leaderboardData[period] = data.leaderboard || [];
      }
    });

    await Promise.all(promises);
    globalCache.lastUpdated.leaderboard = now;
    console.log("✅ Leaderboard data preloaded for all periods");
  } catch (error) {
    console.error("Error preloading leaderboard data:", error);
  }
};

const preloadNextCategory = async () => {
  const now = Date.now();
  if (globalCache.nextCategory && (now - globalCache.lastUpdated.category) < CACHE_DURATION.CATEGORY) {
    return;
  }

  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    const response = await authenticatedFetch(`${BASE_URL}/api/getGetegoryToPlay`, {
      method: "GET",
    });

    if (response.ok) {
      const data = await response.json();
      if (data.categoryId) {
        globalCache.nextCategory = data;
        globalCache.lastUpdated.category = now;
        console.log("✅ Next category preloaded:", data.categoryId);
      }
    }
  } catch (error) {
    console.error("Error preloading category:", error);
  }
};

// 🔥 FIXED: Enhanced preload quiz session with category name
export const preloadQuizSession = async (categoryId: string): Promise<boolean> => {
  const now = Date.now();
  
  // Check if we already have a valid cached session for THIS EXACT category
  if (globalCache.quizSession && 
      globalCache.quizSession.categoryId === categoryId &&
      globalCache.firstQuestion &&
      (now - globalCache.lastUpdated.quizSession) < CACHE_DURATION.QUIZ_SESSION) {
    console.log("✅ Using cached quiz session for category:", categoryId);
    return true;
  }

  // If already preloading, wait for it
  if (isPreloadingSession && sessionPreloadPromise) {
    console.log("⏳ Quiz session preload already in progress, waiting...");
    return sessionPreloadPromise;
  }

  // Clear any old session data before starting new preload
  console.log("🧹 Clearing old session before preloading new one");
  clearQuizCache();

  isPreloadingSession = true;
  sessionPreloadPromise = (async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("❌ No token available for preload");
        return false;
      }

      console.log("🎯 Starting full quiz session preload for:", categoryId);

      // 🔥 CRITICAL FIX: Fetch category info FIRST
      let categoryName = "Quiz";
      try {
        const categoriesResponse = await authenticatedFetch(`${BASE_URL}/api/categories`);
        if (categoriesResponse.ok) {
          const categories = await categoriesResponse.json();
          const category = categories.find((cat: any) => cat._id === categoryId);
          if (category) {
            categoryName = category.name;
            console.log("✅ Found category name:", categoryName);
          }
        }
      } catch (err) {
        console.warn("⚠️ Could not fetch category name, using default");
      }

      // Start the quiz session
      const startResponse = await authenticatedFetch(`${BASE_URL}/api/startQuiz`, {
        method: "POST",
        body: JSON.stringify({ categoryId, userToken: token }),
      });

      if (!startResponse.ok) {
        console.error("❌ Failed to start quiz session for preload");
        return false;
      }

      const startData = await startResponse.json();
      console.log("✅ Quiz session started, total questions:", startData.total);
      
      // Fetch the first question
      const questionResponse = await authenticatedFetch(`${BASE_URL}/api/nextQuestion/${token}`);

      if (!questionResponse.ok) {
        console.error("❌ Failed to fetch first question");
        return false;
      }

      const questionData = await questionResponse.json();
      
      if (questionData.question) {
        const questionWithTimer = {
          ...questionData.question,
          timerInSeconds: questionData.timerInSeconds,
        };

        // 🔥 CRITICAL FIX: Store session WITH category name
        globalCache.quizSession = {
          categoryId: categoryId,
          categoryName: categoryName, // ← THIS IS CRITICAL!
          totalQuestions: startData.total || 10,
          started: true,
          timestamp: now,
        };
        globalCache.firstQuestion = questionWithTimer;
        globalCache.lastUpdated.quizSession = now;
        
        console.log("✅ FULL quiz session preloaded successfully!");
        console.log("   - Category ID:", categoryId);
        console.log("   - Category Name:", categoryName);
        console.log("   - Total questions:", startData.total);
        console.log("   - First question loaded:", !!questionWithTimer);
        
        return true;
      } else {
        console.error("❌ No question data received");
        return false;
      }
    } catch (error) {
      console.error("❌ Error preloading quiz session:", error);
      globalCache.quizSession = null;
      globalCache.firstQuestion = null;
      return false;
    } finally {
      isPreloadingSession = false;
      sessionPreloadPromise = null;
    }
  })();

  return sessionPreloadPromise;
};

// Clear quiz cache
export const clearQuizCache = () => {
  globalCache.quizSession = null;
  globalCache.firstQuestion = null;
  globalCache.lastUpdated.quizSession = 0;
  console.log("🧹 Quiz cache cleared");
};

// Enhanced: Preload category AND full quiz session together
export const preloadCategoryAndSession = async () => {
  try {
    // First get the category
    await preloadNextCategory();
    
    // Then preload the full quiz session if we have a category
    if (globalCache.nextCategory?.categoryId) {
      console.log("🚀 Preloading session for next category:", globalCache.nextCategory.categoryId);
      await preloadQuizSession(globalCache.nextCategory.categoryId);
    }
  } catch (error) {
    console.error("Error in preloadCategoryAndSession:", error);
  }
};

// Main preloader function
export const preloadAllData = async () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  console.log("🔄 Starting comprehensive preload...");

  // Run all preloads in parallel
  await Promise.allSettled([
    preloadHomeData(),
    preloadLeaderboardData(),
    preloadCategoryAndSession(),
  ]);
  
  console.log("✅ Comprehensive preload complete");
};

// Hook to use in your app
export const useAppPreloader = () => {
  const hasPreloaded = useRef(false);

  useEffect(() => {
    if (!hasPreloaded.current) {
      hasPreloaded.current = true;
      preloadAllData();
    }

    // Set up periodic refresh - but DON'T refresh quiz sessions automatically
    const interval = setInterval(() => {
      // Only refresh home and leaderboard data, NOT quiz sessions
      Promise.allSettled([
        preloadHomeData(),
        preloadLeaderboardData(),
      ]);
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

// Export individual preload functions
export { preloadHomeData, preloadLeaderboardData, preloadNextCategory };

// Utility to check if quiz session is ready
export const isQuizSessionReady = (categoryId: string): boolean => {
  const isReady = !!(
    globalCache.quizSession && 
    globalCache.quizSession.categoryId === categoryId &&
    globalCache.firstQuestion &&
    globalCache.quizSession.categoryName // Ensure we have the name too
  );
  
  if (isReady) {
    console.log("✅ Quiz session IS ready for:", categoryId, "-", globalCache.quizSession.categoryName);
  } else {
    console.log("⚠️ Quiz session NOT ready for:", categoryId);
    if (globalCache.quizSession) {
      console.log("   - Cached category:", globalCache.quizSession.categoryId);
      console.log("   - Has question:", !!globalCache.firstQuestion);
    }
  }
  
  return isReady;
};
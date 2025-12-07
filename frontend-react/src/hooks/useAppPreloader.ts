// src/hooks/useAppPreloader.ts
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
  quizSession: null as any, // Store active quiz session
  firstQuestion: null as any, // Store first question
  lastUpdated: {
    home: 0,
    leaderboard: 0,
    category: 0,
    quizSession: 0,
  }
};

const CACHE_DURATION = {
  HOME: 5 * 60 * 1000, // 5 minutes
  LEADERBOARD: 10 * 60 * 1000, // 10 minutes
  CATEGORY: 2 * 60 * 1000, // 2 minutes
  QUIZ_SESSION: 30 * 1000, // 30 seconds
};

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

// Preload home screen data
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

// Preload leaderboard data for all periods
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

// Preload next quiz category
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
        
        // Immediately preload quiz session for this category
        preloadQuizSession(data.categoryId);
      }
    }
  } catch (error) {
    console.error("Error preloading category:", error);
  }
};

// NEW: Preload quiz session and first question
export const preloadQuizSession = async (categoryId: string) => {
  const now = Date.now();
  
  // Check if we already have a valid cached session for this category
  if (globalCache.quizSession && 
      globalCache.quizSession.categoryId === categoryId &&
      globalCache.firstQuestion &&
      (now - globalCache.lastUpdated.quizSession) < CACHE_DURATION.QUIZ_SESSION) {
    console.log("✅ Using cached quiz session for category:", categoryId);
    return true;
  }

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("❌ No token available for preload");
      return false;
    }

    console.log("🎯 Starting full quiz session preload for:", categoryId);

    // Start the quiz session
    const startResponse = await authenticatedFetch(`${BASE_URL}/api/startQuiz`, {
      method: "POST",
      body: JSON.stringify({ categoryId, userToken: token }),
    });

    if (!startResponse.ok) {
      console.error("❌ Failed to start quiz session for preload");
      globalCache.quizSession = null;
      globalCache.firstQuestion = null;
      return false;
    }

    const startData = await startResponse.json();
    console.log("✅ Quiz session started, total questions:", startData.total);
    
    // Fetch the first question
    const questionResponse = await authenticatedFetch(`${BASE_URL}/api/nextQuestion/${token}`, {
      method: "GET",
    });

    if (!questionResponse.ok) {
      console.error("❌ Failed to fetch first question");
      globalCache.quizSession = null;
      globalCache.firstQuestion = null;
      return false;
    }

    const questionData = await questionResponse.json();
    
    if (questionData.question) {
      const questionWithTimer = {
        ...questionData.question,
        timerInSeconds: questionData.timerInSeconds,
      };

      // Cache both session and first question
      globalCache.quizSession = {
        categoryId,
        totalQuestions: startData.total || 10,
        started: true,
      };
      globalCache.firstQuestion = questionWithTimer;
      globalCache.lastUpdated.quizSession = now;
      
      console.log("✅ FULL quiz session preloaded successfully!");
      console.log("   - Category:", categoryId);
      console.log("   - Total questions:", startData.total);
      console.log("   - First question loaded:", !!questionWithTimer);
      
      return true;
    } else {
      console.error("❌ No question data received");
      globalCache.quizSession = null;
      globalCache.firstQuestion = null;
      return false;
    }
  } catch (error) {
    console.error("❌ Error preloading quiz session:", error);
    // Clear cache on error
    globalCache.quizSession = null;
    globalCache.firstQuestion = null;
    return false;
  }
};

// NEW: Clear quiz cache (call when quiz ends)
export const clearQuizCache = () => {
  globalCache.quizSession = null;
  globalCache.firstQuestion = null;
  globalCache.lastUpdated.quizSession = 0;
  console.log("🧹 Quiz cache cleared");
};

// Main preloader function
export const preloadAllData = async () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  // Run all preloads in parallel
  await Promise.allSettled([
    preloadHomeData(),
    preloadLeaderboardData(),
    preloadNextCategory(),
  ]);
};

// Hook to use in your app
export const useAppPreloader = () => {
  const hasPreloaded = useRef(false);

  useEffect(() => {
    if (!hasPreloaded.current) {
      hasPreloaded.current = true;
      preloadAllData();
    }

    // Set up periodic refresh
    const interval = setInterval(() => {
      preloadAllData();
    }, 60 * 1000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  return {
    preloadHomeData,
    preloadLeaderboardData,
    preloadNextCategory,
    preloadQuizSession,
    clearQuizCache,
    globalCache,
  };
};

// Export individual preload functions for manual triggering
export { preloadHomeData, preloadLeaderboardData, preloadNextCategory };

// Utility to check if quiz session is ready
export const isQuizSessionReady = (categoryId: string): boolean => {
  return !!(
    globalCache.quizSession && 
    globalCache.quizSession.categoryId === categoryId &&
    globalCache.firstQuestion
  );
};
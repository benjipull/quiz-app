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
  lastUpdated: {
    home: 0,
    leaderboard: 0,
    category: 0,
  }
};

const CACHE_DURATION = {
  HOME: 5 * 60 * 1000, // 5 minutes
  LEADERBOARD: 10 * 60 * 1000, // 10 minutes
  CATEGORY: 2 * 60 * 1000, // 2 minutes
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
    return; // Cache still valid
  }

  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Preload user details
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
    return; // Cache still valid
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
    return; // Cache still valid
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
    globalCache,
  };
};

// Export individual preload functions for manual triggering
export { preloadHomeData, preloadLeaderboardData, preloadNextCategory };
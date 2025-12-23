import { useEffect } from 'react';
import { apiClient } from '@/utils/apiClient';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const PERIODS = ['day', 'week', 'month', 'year'];

// Global cache shared across all components
export const globalLeaderboardCache: Record<string, any[]> = {};
let isPreloading = false;
let preloadPromise: Promise<void> | null = null;

/**
 * Hook to preload leaderboard data once
 */
export const useLeaderboardPreloader = () => {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || isPreloading) return;

    isPreloading = true;

    preloadPromise = (async () => {
      const promises = PERIODS.map(async (period) => {
        if (!globalLeaderboardCache[period]) {
          try {
            const res = await apiClient(`${BASE_URL}/api/leaderboard?period=${period}`, {
              method: 'GET',
            });

            if (res?.ok) {
              const data = await res.json();
              globalLeaderboardCache[period] = data.leaderboard || [];
            } else {
              globalLeaderboardCache[period] = [];
            }
          } catch {
            globalLeaderboardCache[period] = [];
          }
        }
      });

      await Promise.all(promises);
    })();
  }, []);
};

/**
 * Getter for cached leaderboard data
 */
export const getLeaderboardCache = (period: string) => {
  if (!PERIODS.includes(period)) return [];
  return globalLeaderboardCache[period] || [];
};

/**
 * Check if cache is ready
 */
export const isCacheReady = (period: string) => {
  return globalLeaderboardCache[period] !== undefined;
};

/**
 * Wait for cache to be ready
 */
export const waitForCache = async (period: string) => {
  if (preloadPromise) {
    await preloadPromise;
  }
  return globalLeaderboardCache[period] || [];
};
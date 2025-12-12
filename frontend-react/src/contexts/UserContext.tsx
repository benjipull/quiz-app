// UserContext.tsx - OPTIMIZED - Minimal API calls
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { globalCache } from '@/hooks/useAppPreloader';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface UserDetails {
  _id: string;
  alias: string;
  level: number;
  avatar: number;
  userType?: "Guest" | "Registered" | "Admin";
  interests?: string[];
  coins?: number;
  email?: string;
  age?: number;
  knowledgePoints?: number;
  wisdomGems?: number;
  enlightenmentCrystals?: number;
  dailyClaimAvailable?: boolean;
}

interface UserContextType {
  user: UserDetails | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUserLocally: (updates: Partial<UserDetails>) => void;
  updateCoins: (newCoins: number) => void;
  markUserStale: () => void; // New: Mark user data as needing refresh
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const userToken = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const headers = {
    ...options.headers,
    "Authorization": `Bearer ${userToken}`,
    "Content-Type": "application/json",
  };
  
  if (!options.body && (options.method === 'GET' || options.method === 'HEAD')) {
    delete headers["Content-Type"];
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  
  const isRefreshingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const lastFetchTime = useRef<number>(0);
  const isStaleRef = useRef(false); // Track if user data needs refresh

  // 🎯 CACHE DURATION: Only refresh if data is older than 10 minutes
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  const loadUserFromStorage = () => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    if (storedUser) {
      try {
        const parsedUser: UserDetails = JSON.parse(storedUser);
        console.log("💾 Loaded user from localStorage:", parsedUser.alias);
        return parsedUser;
      } catch (e) {
        console.error("❌ Failed to parse local user data:", e);
      }
    }
    return null;
  };

  const refreshUser = async (force: boolean = false) => {
    if (isRefreshingRef.current) {
      console.log("⏳ Already refreshing user, skipping...");
      return;
    }

    const userToken = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    
    if (!userToken) {
      console.log("⚠️ No token found");
      setLoading(false);
      return;
    }

    // ✅ Check if cache is still fresh
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    
    if (!force && !isStaleRef.current && timeSinceLastFetch < CACHE_DURATION) {
      console.log(`✅ User data is fresh (${Math.round(timeSinceLastFetch / 1000)}s old), skipping refresh`);
      return;
    }

    console.log("🔄 refreshUser called", force ? "(forced)" : "(cache expired or stale)");

    const cachedUser = loadUserFromStorage();
    if (!cachedUser) {
      setLoading(true);
    }

    isRefreshingRef.current = true;

    try {
      console.log("🌐 Fetching fresh user data from API...");
      const response = await authenticatedFetch(`${BASE_URL}/api/getUserDetails`, {
        method: "GET",
      });

      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch user details (Status: ${response.status})`);
        setLoading(false);
        return;
      }

      const apiUser: UserDetails = await response.json();
      console.log("✅ Fresh user data fetched from API:", apiUser.alias);

      const userToStore = {
        ...apiUser,
        level: apiUser.level || 1,
        userType: apiUser.userType || 'Registered',
        interests: apiUser.interests || [],
        coins: apiUser.coins || 0,
        dailyClaimAvailable: apiUser.dailyClaimAvailable ?? false,
      };

      setUser(userToStore);
      lastFetchTime.current = now;
      isStaleRef.current = false; // Mark as fresh
      
      // Persist to localStorage asynchronously
      if (typeof window !== 'undefined') {
        requestIdleCallback(() => {
          const safeToPersist = { ...userToStore };
          delete safeToPersist.coins;
          localStorage.setItem("user", JSON.stringify(safeToPersist));
        });
      }
      
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
    } finally {
      console.log("🔄 refresh complete");
      setLoading(false);
      isRefreshingRef.current = false;
    }
  };

  const updateUserLocally = (updates: Partial<UserDetails>) => {
    setUser(prev => {
      if (!prev) return null;

      const updated = { ...prev, ...updates };

      // Async localStorage write
      if (typeof window !== 'undefined') {
        requestIdleCallback(() => {
          const safeToPersist = { ...updated };
          delete safeToPersist.coins;
          localStorage.setItem("user", JSON.stringify(safeToPersist));
        });
      }

      if (globalCache.homeData) {
        globalCache.homeData.user = updated;
      }

      return updated;
    });
  };

  const updateCoins = (newCoins: number) => {
    updateUserLocally({ coins: newCoins });
  };

  // ✅ NEW: Mark user data as stale (needs refresh on next check)
  const markUserStale = () => {
    console.log("🔄 User data marked as stale");
    isStaleRef.current = true;
  };

  // ✅ Initialize immediately with cached data
  useEffect(() => {
    if (hasInitializedRef.current) {
      console.log("⭐️ Already initialized, skipping");
      return;
    }

    hasInitializedRef.current = true;
    console.log("🚀 UserProvider mounted");

    // Load from cache instantly
    const cachedUser = loadUserFromStorage();
    if (cachedUser) {
      console.log("⚡ Setting user from cache immediately");
      setUser(cachedUser);
      setLoading(false);
      
      // Check if cache is stale (older than 10 minutes)
      const now = Date.now();
      const shouldRefresh = isStaleRef.current || (now - lastFetchTime.current) > CACHE_DURATION;
      
      if (shouldRefresh) {
        // Refresh in background only if stale
        setTimeout(() => {
          console.log("🔄 Background refresh started (cache stale)");
          refreshUser();
        }, 500);
      } else {
        console.log("✅ Cache is fresh, no background refresh needed");
      }
    } else {
      // No cache, fetch immediately
      refreshUser(true);
    }
  }, []);

  return (
    <UserContext.Provider value={{ 
      user, 
      loading, 
      refreshUser: () => refreshUser(true), // Force refresh when called explicitly
      updateUserLocally, 
      updateCoins,
      markUserStale 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
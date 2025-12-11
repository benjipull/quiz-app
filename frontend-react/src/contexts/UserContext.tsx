// UserContext.tsx - OPTIMIZED VERSION - Ultra-fast loading
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
  const [loading, setLoading] = useState(false); // ✅ Start as false for instant render
  
  const isRefreshingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // ✅ OPTIMIZATION 1: Synchronous localStorage load (instant)
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

  const refreshUser = async () => {
    if (isRefreshingRef.current) {
      console.log("⏳ Already refreshing user, skipping...");
      return;
    }

    console.log("🔄 refreshUser called");
    const userToken = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    
    if (!userToken) {
      console.log("⚠️ No token found");
      setLoading(false);
      return;
    }

    // ✅ OPTIMIZATION 2: Don't set loading if we have cached data
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
      
      // ✅ OPTIMIZATION 3: Persist to localStorage asynchronously (non-blocking)
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

      // ✅ OPTIMIZATION 4: Async localStorage write (non-blocking)
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

  // ✅ OPTIMIZATION 5: Initialize immediately with cached data
  useEffect(() => {
    if (hasInitializedRef.current) {
      console.log("⭐️ Already initialized, skipping");
      return;
    }

    hasInitializedRef.current = true;
    console.log("🚀 UserProvider mounted");

    // Load from cache instantly (synchronous)
    const cachedUser = loadUserFromStorage();
    if (cachedUser) {
      console.log("⚡ Setting user from cache immediately");
      setUser(cachedUser);
      setLoading(false);
      
      // Refresh in background (non-blocking)
      setTimeout(() => {
        console.log("🔄 Background refresh started");
        refreshUser();
      }, 100);
    } else {
      // No cache, fetch immediately
      refreshUser();
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, updateUserLocally, updateCoins }}>
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
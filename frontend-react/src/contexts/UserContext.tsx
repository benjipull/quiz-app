// UserContext.tsx - FIXED VERSION - Minimal API calls
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
  const [loading, setLoading] = useState(true);
  
  // ✅ CRITICAL FIX: Prevent multiple simultaneous refreshes
  const isRefreshingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const loadUserFromStorage = () => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    if (storedUser) {
      try {
        const parsedUser: UserDetails = JSON.parse(storedUser);
        console.log("💾 Loaded user from localStorage:", parsedUser.alias);
        setUser(parsedUser);
        return parsedUser;
      } catch (e) {
        console.error("❌ Failed to parse local user data:", e);
      }
    }
    return null;
  };

  const refreshUser = async () => {
    // ✅ CRITICAL FIX: Prevent multiple simultaneous API calls
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

    // Load from localStorage first for instant display
    const cachedUser = loadUserFromStorage();
    if (cachedUser) {
      console.log("⚡ User loaded from localStorage immediately");
      setLoading(false);
    }

    // ✅ Set flag to prevent concurrent refreshes
    isRefreshingRef.current = true;

    try {
      console.log("🌐 Fetching fresh user data from API...");
      const response = await authenticatedFetch(`${BASE_URL}/api/getUserDetails`, {
        method: "GET",
      });

      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch user details (Status: ${response.status})`);
        if (!cachedUser) {
          setLoading(false);
        }
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
      
      if (typeof window !== 'undefined') {
        localStorage.setItem("user", JSON.stringify(userToStore));
      }

      // Update global cache
      globalCache.homeData = {
        user: userToStore,
        timestamp: Date.now(),
      };
      globalCache.lastUpdated.home = Date.now();
    } catch (error) {
      console.error("❌ Error fetching user details from API:", error);
    } finally {
      console.log("✓ User refresh complete");
      if (!cachedUser) {
        setLoading(false);
      }
      // ✅ Reset flag after completion
      isRefreshingRef.current = false;
    }
  };

  const updateUserLocally = (updates: Partial<UserDetails>) => {
  setUser(prev => {
    if (!prev) return null;

    const updated = { ...prev, ...updates };

    // ✅ Only persist safe fields
    const safeToPersist = { ...updated };
    delete safeToPersist.coins;

    if (typeof window !== 'undefined') {
      localStorage.setItem("user", JSON.stringify(safeToPersist));
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

  // ✅ CRITICAL FIX: Only initialize once
  useEffect(() => {
    if (hasInitializedRef.current) {
      console.log("⭐️ Already initialized, skipping");
      return;
    }

    console.log("🚀 UserProvider mounted, calling refreshUser");
    hasInitializedRef.current = true;
    refreshUser();
  }, []); // Empty deps!

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
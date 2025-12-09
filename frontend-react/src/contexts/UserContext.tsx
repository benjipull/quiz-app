// src/contexts/UserContext.tsx - Complete Fixed Version
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  // 🔥 NEW: Add daily claim status to the cached user details
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

  console.log("👤 UserProvider render - loading:", loading, "user:", !!user);

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
    console.log("🔄 refreshUser called");
    const userToken = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    
    if (!userToken) {
      console.log("⚠️ No token found");
      setLoading(false);
      return;
    }

    // 🔥 CRITICAL FIX: Load from localStorage FIRST and set loading to false immediately
    const cachedUser = loadUserFromStorage();
    if (cachedUser) {
      console.log("⚡ User loaded from localStorage immediately - loading set to FALSE");
      setLoading(false); // This prevents blank screen!
    }

    // Then fetch fresh data in background
    console.log("🌐 Fetching fresh user data from API in background...");
    try {
      // NOTE: The backend API /api/getUserDetails should ideally be split or return minimal data 
      // for economy (coins, dailyClaimAvailable) and more for core (alias, level, avatar).
      // Since we assume it returns all, we ensure we cache all.
      const response = await authenticatedFetch(`${BASE_URL}/api/getUserDetails`, {
        method: "GET",
      });

      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch user details (Status: ${response.status}). Using cached data.`);
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
        dailyClaimAvailable: apiUser.dailyClaimAvailable ?? false, // 🔥 NEW: Cache daily claim status
      };

      setUser(userToStore);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem("user", JSON.stringify(userToStore));
      }

      // Update global cache
      globalCache.homeData = {
        user: userToStore, // Use userToStore which includes defaults/claim
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
    }
  };

  const updateUserLocally = (updates: Partial<UserDetails>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        localStorage.setItem("user", JSON.stringify(updated));
      }
      // Update cache too
      if (globalCache.homeData) {
        globalCache.homeData.user = updated;
      }
      return updated;
    });
  };

  const updateCoins = (newCoins: number) => {
    updateUserLocally({ coins: newCoins });
  };

  useEffect(() => {
    console.log("🚀 UserProvider mounted, calling refreshUser");
    refreshUser();
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
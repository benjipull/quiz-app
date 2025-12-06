// src/contexts/UserContext.tsx - Updated with Debug Logging
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
      console.log("⚠️ No token found, loading from storage");
      loadUserFromStorage();
      setLoading(false);
      return;
    }

    // Check if we have cached data first
    if (globalCache.homeData?.user) {
      const cachedUser = globalCache.homeData.user;
      const userToStore = {
        ...cachedUser,
        level: cachedUser.level || 1,
        userType: cachedUser.userType || 'Registered',
        interests: cachedUser.interests || [],
        coins: cachedUser.coins || 0,
      };
      console.log("⚡ User loaded from cache:", userToStore.alias);
      setUser(userToStore);
      if (typeof window !== 'undefined') {
        localStorage.setItem("user", JSON.stringify(userToStore));
      }
      setLoading(false);
      return;
    }

    console.log("🌐 Fetching user from API...");
    try {
      const response = await authenticatedFetch(`${BASE_URL}/api/getUserDetails`, {
        method: "GET",
      });

      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch user details (Status: ${response.status}). Using cached data.`);
        loadUserFromStorage();
        setLoading(false);
        return;
      }

      const apiUser: UserDetails = await response.json();
      console.log("✅ User fetched from API:", apiUser.alias);
      
      const userToStore = {
        ...apiUser,
        level: apiUser.level || 1,
        userType: apiUser.userType || 'Registered',
        interests: apiUser.interests || [],
        coins: apiUser.coins || 0,
      };

      setUser(userToStore);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem("user", JSON.stringify(userToStore));
      }

      // Update global cache
      globalCache.homeData = {
        user: apiUser,
        timestamp: Date.now(),
      };
      globalCache.lastUpdated.home = Date.now();
    } catch (error) {
      console.error("❌ Error fetching user details from API:", error);
      loadUserFromStorage();
    } finally {
      console.log("🏁 User loading complete, setting loading to false");
      setLoading(false);
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
// UserContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { getApiBaseUrl } from "@/utils/baseUrl";

const BASE_URL = getApiBaseUrl();

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
  lastDailyCoinClaim?: string | null; // ✅ NEW: Add this field
}

interface UserContextType {
  user: UserDetails | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUserLocally: (updates: Partial<UserDetails>) => void;
  updateCoins: (newCoins: number) => void;
  markUserStale: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Helper for API calls with Auth
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const userToken = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const headers = {
    ...options.headers,
    "Authorization": `Bearer ${userToken}`,
    "Content-Type": "application/json",
  };

  // Prevent Content-Type on GET requests to avoid pre-flight issues in some setups
  if (options.method === 'GET' || !options.body) {
    const { "Content-Type": _, ...remainingHeaders } = headers;
    return fetch(url, { ...options, headers: remainingHeaders });
  }

  return fetch(url, { ...options, headers });
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const isRefreshingRef = useRef(false);
  const lastFetchTime = useRef<number>(0);
  const isStaleRef = useRef(false);
  const hasInitializedUserFetchRef = useRef(false);

  // Cache settings
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  const loadUserFromStorage = () => {
    if (typeof window === 'undefined') return null;
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser) as UserDetails;
      } catch (e) {
        console.error("❌ Failed to parse local user data:", e);
      }
    }
    return null;
  };

  const saveUserToStorage = (userData: UserDetails) => {
    if (typeof window !== 'undefined') {
      // Use requestIdleCallback to avoid blocking the main UI thread for I/O
      const persist = () => {
        // We often don't want to persist highly volatile data like coins 
        // if the API is the source of truth, but we keep the rest.
        const { coins, ...rest } = userData;
        localStorage.setItem("user", JSON.stringify(rest));
      };

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(persist);
      } else {
        setTimeout(persist, 0);
      }
    }
  };

  const logoutUser = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    setUser(null);
    isStaleRef.current = false;
    lastFetchTime.current = 0;
  };

  const refreshUser = async (force: boolean = false) => {
    if (isRefreshingRef.current) return;

    const userToken = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    if (!userToken) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;

    // Skip if data is still fresh and not forced
    if (!force && !isStaleRef.current && timeSinceLastFetch < CACHE_DURATION && user) {
      return;
    }

    isRefreshingRef.current = true;
    try {
      const response = await authenticatedFetch(`${BASE_URL}/api/getUserDetails`);

      if (response.ok) {
        const apiUser: UserDetails = await response.json();

        const updatedUser = {
          ...apiUser,
          level: apiUser.level || 1,
          coins: apiUser.coins ?? 0,
          lastDailyCoinClaim: apiUser.lastDailyCoinClaim || null, // ✅ Include this
        };

        setUser(updatedUser);
        saveUserToStorage(updatedUser);
        lastFetchTime.current = Date.now();
        isStaleRef.current = false;
      } else if (response.status === 401) {
        let errorMessage = "";
        try {
          const payload = await response.json();
          errorMessage = payload?.error || payload?.message || "";
        } catch {
          // Ignore non-JSON response body
        }

        console.warn(
          `Unauthorized from getUserDetails (${errorMessage || "no details"}). Logging out user.`
        );
        logoutUser();
      }
    } catch (error) {
      console.error("❌ Error refreshing user:", error);
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  };

  const updateUserLocally = (updates: Partial<UserDetails>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      saveUserToStorage(updated);
      return updated;
    });
  };

  const updateCoins = (newCoins: number) => {
    updateUserLocally({ coins: newCoins });
  };

  const markUserStale = () => {
    isStaleRef.current = true;
  };


  useEffect(() => {
    if (hasInitializedUserFetchRef.current) {
      return;
    }
    hasInitializedUserFetchRef.current = true;

    const init = async () => {
      const cached = loadUserFromStorage();
      if (cached) {
        setUser(cached);
        // Keep splash/loading active until initial getUserDetails resolves.
        await refreshUser(true);
      } else {
        await refreshUser(true);
      }
    };

    init();
  }, []);


  return (
    <UserContext.Provider value={{
      user,
      loading,
      refreshUser: () => refreshUser(true),
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

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from "../utils/baseUrl";

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
  lastDailyCoinClaim?: string | null;
}

interface UserContextType {
  user: UserDetails | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUserLocally: (updates: Partial<UserDetails>) => void;
  updateCoins: (newCoins: number) => void;
  markUserStale: () => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const userToken = await AsyncStorage.getItem("token") || "";
  const headers = {
    ...options.headers,
    "Authorization": `Bearer ${userToken}`,
    "Content-Type": "application/json",
  };

  if (options.method === 'GET' || !options.body) {
    const { "Content-Type": _, ...remainingHeaders } = headers as any;
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

  const CACHE_DURATION = 10 * 60 * 1000;

  const loadUserFromStorage = async () => {
    const storedUser = await AsyncStorage.getItem("user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser) as UserDetails;
      } catch (e) {
        console.error("❌ Failed to parse local user data:", e);
      }
    }
    return null;
  };

  const saveUserToStorage = async (userData: UserDetails) => {
    try {
      const { coins, ...rest } = userData;
      await AsyncStorage.setItem("user", JSON.stringify(rest));
    } catch (e) {
      console.error("❌ Failed to save user to storage:", e);
    }
  };

  const logoutUser = async () => {
    await AsyncStorage.multiRemove(["token", "user"]);
    setUser(null);
    isStaleRef.current = false;
    lastFetchTime.current = 0;
  };

  const createGuestUser = async () => {
    try {
      console.log("📝 Creating guest user...");
      const response = await fetch(`${BASE_URL}/api/users/guestLogin`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Guest user created successfully");

        // Store token and user
        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("user", JSON.stringify(data.user));

        const guestUser = {
          ...data.user,
          level: data.user.level || 1,
          coins: data.user.coins ?? 0,
          lastDailyCoinClaim: data.user.lastDailyCoinClaim || null,
        };

        setUser(guestUser);
        lastFetchTime.current = Date.now();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Failed to create guest user:", errorData);
        return false;
      }
    } catch (error) {
      console.error("❌ Error creating guest user:", error);
      return false;
    }
  };

  const refreshUser = async (force: boolean = false) => {
    if (isRefreshingRef.current) return;

    const userToken = await AsyncStorage.getItem("token") || "";
    if (!userToken) {
      // No token - try to create a guest user
      console.log("🔍 No token found, creating guest user...");
      isRefreshingRef.current = true;
      const success = await createGuestUser();
      setLoading(false);
      isRefreshingRef.current = false;
      return;
    }

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;

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
          lastDailyCoinClaim: apiUser.lastDailyCoinClaim || null,
        };

        setUser(updatedUser);
        await saveUserToStorage(updatedUser);
        lastFetchTime.current = Date.now();
        isStaleRef.current = false;
      } else if (response.status === 401) {
        console.warn("Unauthorized from getUserDetails. Logging out user.");
        await logoutUser();
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
    if (hasInitializedUserFetchRef.current) return;
    hasInitializedUserFetchRef.current = true;

    const init = async () => {
      const cached = await loadUserFromStorage();
      if (cached) {
        setUser(cached);
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
      markUserStale,
      logout: logoutUser
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

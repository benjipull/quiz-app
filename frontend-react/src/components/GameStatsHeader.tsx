/**
 * @fileoverview GameStatsHeader component for displaying user statistics,
 * fetching data from a base URL configured via environment variables.
 * OPTIMIZED: Fetches only once on mount, uses parent state for updates
 */
"use client";

import React, { useEffect, useState, useRef } from "react";

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface UserStats {
  coins: number;
  xp: number;
  gem1: number;
  gem2: number;
}

interface GameStatsHeaderProps {
  userToken: string;
  isParentLoading: boolean;
  onCoinsUpdate?: (coins: number) => void;
  currentCoinsFromParent: number;
}

const GameStatsHeader: React.FC<GameStatsHeaderProps> = ({
  userToken,
  isParentLoading,
  onCoinsUpdate,
  currentCoinsFromParent,
}) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [animatedXP, setAnimatedXP] = useState(0);
  const [animatedCoins, setAnimatedCoins] = useState(currentCoinsFromParent);
  const xpRef = useRef<number>(0);
  const coinsRef = useRef<number>(currentCoinsFromParent);
  const hasFetchedRef = useRef(false); // ✅ Prevent multiple fetches

  // Effect to fetch user stats ONLY ONCE on mount
  useEffect(() => {
    // Prevent multiple fetches
    if (hasFetchedRef.current || isParentLoading || !userToken) {
      return;
    }

    const fetchStats = async () => {
      console.log("📊 Fetching GameStats (ONCE)");
      hasFetchedRef.current = true; // Mark as fetched immediately
      
      try {
        const timestamp = Date.now();
        const url = `${BASE_URL}/api/getUserDetails?_t=${timestamp}`;
        
        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }
        
        const data = await res.json();
        const fetchedCoins = data.coins ?? 0;
        
        setStats({
          coins: fetchedCoins,
          xp: data.knowledgePoints ?? 0,
          gem1: data.wisdomGems ?? 0,
          gem2: data.enlightenmentCrystals ?? 0,
        });
        
        if (onCoinsUpdate && data.coins !== undefined) {
          onCoinsUpdate(fetchedCoins);
        }
        
        setError(null);
        console.log("✅ GameStats fetched successfully");
        
      } catch (err) {
        console.error("❌ Error fetching stats:", err);
        setError("Failed to load user statistics.");
        hasFetchedRef.current = false; // Allow retry on error
      }
    };
    
    fetchStats();
  }, [userToken, isParentLoading]); // ✅ Only depend on token and parent loading

  // Effect for smooth XP animation
  useEffect(() => {
    if (stats?.xp != null) {
      const start = xpRef.current;
      const end = stats.xp;
      const duration = 800;
      const startTime = performance.now();
      
      const animate = (time: number) => {
        const progress = Math.min((time - startTime) / duration, 1);
        setAnimatedXP(Math.floor(start + (end - start) * progress));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          xpRef.current = end;
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [stats?.xp]);

  // Effect for smooth Coins animation (from parent)
  useEffect(() => {
    if (currentCoinsFromParent != null) {
      const start = coinsRef.current;
      const end = currentCoinsFromParent;
      const duration = 800;
      const startTime = performance.now();
      
      if (start === end) return;
      
      const animate = (time: number) => {
        const progress = Math.min((time - startTime) / duration, 1);
        setAnimatedCoins(Math.floor(start + (end - start) * progress));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          coinsRef.current = end;
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [currentCoinsFromParent]);

  // Render logic for loading and errors
  if (isParentLoading || !userToken) {
    return (
      <div className="w-full px-2 py-2">
        <div className="flex items-center justify-center gap-2 max-w-4xl mx-auto">
          <div className="flex flex-col gap-2">
            <div className="h-12 w-32 bg-slate-700/50 rounded-full animate-pulse"></div>
            <div className="h-12 w-32 bg-slate-700/50 rounded-full animate-pulse"></div>
          </div>
          <div className="h-20 w-20 bg-slate-700/50 rounded-full animate-pulse"></div>
          <div className="flex flex-col gap-2">
            <div className="h-12 w-32 bg-slate-700/50 rounded-full animate-pulse"></div>
            <div className="h-12 w-32 bg-slate-700/50 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!stats) return null; 

  if (error) return <div className="text-red-400 text-center font-semibold p-4 bg-red-900/50 border border-red-700 rounded-lg max-w-md mx-auto my-4">{error}</div>;

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  return (
    <div className="w-full px-2 py-1.5 sm:py-2">
      <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto">
        {/* Left Stats - Coins & Gem1 */}
        <div className="flex flex-col gap-1.5 sm:gap-2 flex-1">
          {/* Coins */}
          <div 
            data-coin-header=""
            className="flex items-center justify-end gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full border-2 border-blue-300 shadow-lg w-full transition-all hover:scale-105"
          >
            <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate">
              {formatNumber(animatedCoins)}
            </div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 flex-shrink-0 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="10" fill="#f59e0b" />
                <circle cx="12" cy="12" r="8" fill="#fbbf24" />
                <text
                  x="12"
                  y="16"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#d97706"
                  textAnchor="middle"
                >
                  $
                </text>
              </svg>
            </div>
          </div>

          {/* Gem 1 (Wisdom Gems) */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full border-2 border-green-300 shadow-lg w-full transition-all hover:scale-105">
            <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate">
              {formatNumber(stats.gem1)}
            </div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 flex-shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-full h-full text-pink-500 drop-shadow-lg"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M6 3h12l4 6-10 12L2 9l4-6z" fill="currentColor" />
                <path d="m6 3 6 6 6-6" />
                <path d="m2 9 10 12 10-12" />
              </svg>
            </div>
          </div>
        </div>

        {/* Center Logo */}
        <div className="relative flex-shrink-0 mx-1 sm:mx-2 md:mx-3">
          <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-yellow-600 p-0.5 shadow-2xl shadow-yellow-500/50 transition-transform hover:scale-110 hover:rotate-12">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center overflow-hidden border-2 border-orange-400">
              <img 
                src="/q.jpg" 
                alt="Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-yellow-400">Q</div>';
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Stats - XP & Gem2 */}
        <div className="flex flex-col gap-1.5 sm:gap-2 flex-1">
          {/* XP */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full border-2 shadow-lg w-full transition-all hover:scale-105">
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 flex-shrink-0 bg-white rounded-full flex items-center justify-center shadow-md">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-500"
              >
                <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.4 1-1v-1H9v1z" />
                <path d="M12 2C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.2 3-3.3 3-5.7 0-3.9-3.1-7-7-7z" />
                <circle cx="12" cy="9" r="2" fill="#fff" />
              </svg>
            </div>
            <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate">
              {formatNumber(animatedXP)}
            </div>
          </div>

          {/* Gem 2 (Enlightenment Crystals) */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full border-2 border-green-300 shadow-lg w-full transition-all hover:scale-105">
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 flex-shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-full h-full text-yellow-400 drop-shadow-lg"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
                <path d="m6 3 6 6 6-6" fill="#fff" fillOpacity="0.3" />
                <path d="m2 9 10 12 10-12" fill="#fff" fillOpacity="0.2" />
              </svg>
            </div>
            <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate">
              {formatNumber(stats.gem2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStatsHeader;
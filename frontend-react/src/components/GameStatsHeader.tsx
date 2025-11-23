/**
 * @fileoverview GameStatsHeader component for displaying user statistics,
 * fetching data from a base URL configured via environment variables.
 */
"use client";

import React, { useEffect, useState, useRef } from "react";

// Retrieve the base URL from environment variables as specified by the user
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
}

const GameStatsHeader: React.FC<GameStatsHeaderProps> = ({
  userToken,
  isParentLoading,
}) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  // State for animating XP changes
  const [animatedXP, setAnimatedXP] = useState(0);
  // Ref to hold the current XP value for animation starting point
  const xpRef = useRef<number>(0);

  // Effect to fetch user stats
  useEffect(() => {
    // Guard against fetching if still loading or userToken is missing
    if (isParentLoading || !userToken) return;

    const fetchStats = async () => {
      // Basic implementation of exponential backoff for retries
      const maxRetries = 3;
      let attempt = 0;
      let success = false;
      
      while (attempt < maxRetries && !success) {
        attempt++;
        try {
          // Add timestamp to prevent aggressive caching
          const timestamp = Date.now();
          // Use the dynamically defined BASE_URL
          const url = `${BASE_URL}/api/getUserDetails?_t=${timestamp}`;
          
          const res = await fetch(url, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userToken}`,
            },
            // Ensure no-store for fresh data
            cache: 'no-store',
          });

          if (!res.ok) {
            // Throw error to trigger the catch block and retry logic
            throw new Error(`Error ${res.status}`);
          }
          
          const data = await res.json();
          setStats({
            coins: data.coins ?? 0,
            xp: data.knowledgePoints ?? 0,
            gem1: data.wisdomGems ?? 0,
            gem2: data.enlightenmentCrystals ?? 0,
          });
          setError(null); // Clear any previous errors
          success = true; // Mark as successful
          
        } catch (err) {
          console.error(`Attempt ${attempt}: Error fetching stats:`, err);
          
          if (attempt === maxRetries) {
            setError("Failed to load user statistics.");
          } else {
            // Exponential backoff: wait 2^attempt seconds before retrying
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    };
    
    fetchStats();
  }, [userToken, isParentLoading]);

  // Effect for smooth XP animation
  useEffect(() => {
    if (stats?.xp != null) {
      const start = xpRef.current;
      const end = stats.xp;
      const duration = 800;
      const startTime = performance.now();
      
      const animate = (time: number) => {
        const progress = Math.min((time - startTime) / duration, 1);
        // Animate the value smoothly
        setAnimatedXP(Math.floor(start + (end - start) * progress));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          xpRef.current = end; // Update ref with final value
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [stats?.xp]);

  // Render logic for loading and errors
  if (isParentLoading || !userToken) {
    return (
      <div className="w-full px-4 mb-3 mt-2">
        <div className="flex items-center justify-between w-full max-w-lg mx-auto p-4 bg-slate-800/60 rounded-xl border-2 border-slate-600 backdrop-blur-sm">
          <div className="h-6 w-1/4 bg-slate-700 rounded animate-pulse"></div>
          <div className="h-6 w-1/4 bg-slate-700 rounded animate-pulse"></div>
          <div className="h-6 w-1/4 bg-slate-700 rounded animate-pulse"></div>
          <div className="h-6 w-1/4 bg-slate-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }
  
  if (!stats) return null; 

  if (error) return <div className="text-red-400 text-center font-semibold p-4 bg-red-900/50 border border-red-700 rounded-lg max-w-md mx-auto my-4">{error}</div>;


  // Increased icon size — smaller bg
  const statItems = [
    {
      value: stats.coins ?? 0,
      color: "cyan",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-[22px] w-[22px] sm:h-7 sm:w-7"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="8" cy="9" r="5" fill="#f59e0b" />
          <circle cx="8" cy="9" r="4" fill="#fbbf24" />
          <circle cx="8" cy="9" r="2.5" fill="#f59e0b" opacity="0.4" />
          <circle cx="14" cy="13" r="6" fill="#f59e0b" />
          <circle cx="14" cy="13" r="5" fill="#fbbf24" />
          <circle cx="14" cy="13" r="3" fill="#f59e0b" opacity="0.4" />
          <text
            x="14"
            y="15.5"
            fontSize="6"
            fontWeight="bold"
            fill="#d97706"
            textAnchor="middle"
          >
            $
          </text>
        </svg>
      ),
    },
    {
      value: animatedXP,
      color: "yellow",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          className="h-[22px] w-[22px] sm:h-7 sm:w-7 text-amber-500"
        >
          <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.4 1-1v-1H9v1z" />
          <path d="M12 2C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.2 3-3.3 3-5.7 0-3.9-3.1-7-7-7z" />
          <circle cx="12" cy="9" r="2" fill="#fff" />
        </svg>
      ),
    },
    {
      value: stats.gem1 ?? 0,
      color: "cyan",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[22px] w-[22px] sm:h-7 sm:w-7 text-cyan-400"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
          <path d="m6 3 6 6 6-6" />
          <path d="m2 9 10 12 10-12" />
        </svg>
      ),
    },
    {
      value: stats.gem2 ?? 0,
      color: "purple",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-[22px] w-[22px] sm:h-7 sm:w-7 text-purple-500"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
          <path d="m6 3 6 6 6-6" fill="#fff" fillOpacity="0.3" />
          <path d="m2 9 10 12 10-12" fill="#fff" fillOpacity="0.2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full px-2 sm:px-4 mb-3 animate-fade-in-down mt-2">
      <div
        className="
          flex items-center justify-between 
          w-full max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl 
          p-2 sm:p-3 md:p-4 
          bg-slate-800/60 rounded-xl border-2 border-slate-600 backdrop-blur-sm mx-auto
        "
      >
        {statItems.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-1 sm:gap-2 justify-center flex-1 min-w-0"
          >
            {/* Smaller bg, bigger icon */}
            <div
              className={`
                w-8 h-8 sm:w-10 sm:h-10
                rounded-lg 
                bg-${item.color}-500/30 
                border border-${item.color}-500/50 
                flex items-center justify-center
              `}
            >
              {item.icon}
            </div>

            <div className="text-base sm:text-xl font-bold text-slate-200 tabular-nums truncate">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameStatsHeader;

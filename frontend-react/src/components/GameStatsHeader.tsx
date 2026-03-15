import React, { useEffect, useState, useRef } from "react";

interface UserStatsDisplay {
  xp: number;
  gem1: number;
  gem2: number;
}

interface GameStatsHeaderProps {
  userToken: string;
  isParentLoading: boolean;
  currentCoinsFromParent: number;
  userXP: number;
  userGem1: number;
  userGem2: number;
  compactMode?: boolean;
}

const GameStatsHeader: React.FC<GameStatsHeaderProps> = ({
  userToken,
  isParentLoading,
  currentCoinsFromParent,
  userXP,
  userGem1,
  userGem2,
  compactMode = false,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [animatedXP, setAnimatedXP] = useState(userXP);
  const [animatedCoins, setAnimatedCoins] = useState(currentCoinsFromParent);

  // Refs to track the previous values
  const prevCoinsRef = useRef<number>(currentCoinsFromParent);
  const prevXPRef = useRef<number>(userXP);
  const isAnimatingCoinsRef = useRef(false);
  const isAnimatingXPRef = useRef(false);

  // ✅ FIX: Faster coin animation that starts from current value
  useEffect(() => {
    // Skip if value hasn't changed or if we're already animating
    if (currentCoinsFromParent === prevCoinsRef.current || isAnimatingCoinsRef.current) {
      return;
    }

    isAnimatingCoinsRef.current = true;
    const start = prevCoinsRef.current; // Start from previous value, not animatedCoins
    const end = currentCoinsFromParent;
    const duration = 400; // ✅ Reduced from 800ms to 400ms for faster animation
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic for smoother end
      
      setAnimatedCoins(Math.floor(start + (end - start) * easeProgress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevCoinsRef.current = end;
        isAnimatingCoinsRef.current = false;
      }
    };

    requestAnimationFrame(animate);
  }, [currentCoinsFromParent]); // ✅ FIXED: Removed animatedCoins from dependencies

  // ✅ FIX: Faster XP animation that starts from current value
  useEffect(() => {
    // Skip if value hasn't changed or if we're already animating
    if (userXP === prevXPRef.current || isAnimatingXPRef.current) {
      return;
    }

    isAnimatingXPRef.current = true;
    const start = prevXPRef.current; // Start from previous value, not animatedXP
    const end = userXP;
    const duration = 400; // ✅ Reduced from 800ms to 400ms
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      
      setAnimatedXP(Math.floor(start + (end - start) * easeProgress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevXPRef.current = end;
        isAnimatingXPRef.current = false;
      }
    };

    requestAnimationFrame(animate);
  }, [userXP]); // ✅ FIXED: Removed animatedXP from dependencies

  // ✅ Initialize on mount to prevent 0 flash
  useEffect(() => {
    setAnimatedCoins(currentCoinsFromParent);
    setAnimatedXP(userXP);
    prevCoinsRef.current = currentCoinsFromParent;
    prevXPRef.current = userXP;
  }, []); // Run once on mount

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

  if (error) {
    return (
      <div className="text-red-400 text-center font-semibold p-4 bg-red-900/50 border border-red-700 rounded-lg max-w-md mx-auto my-4">
        {error}
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  const compact = compactMode;

  return (
    <div className={`w-full px-2 ${compact ? "py-0.5" : "py-1.5 sm:py-2"}`}>
      <div className={`flex items-center justify-between ${compact ? "gap-1.5 max-w-sm" : "gap-2 sm:gap-3 md:gap-4 max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl"} mx-auto`}>
        {/* Left Stats - Coins & Gem1 */}
        <div className={`flex flex-col ${compact ? "gap-1" : "gap-1.5 sm:gap-2"} flex-1`}>
          {/* Coins */}
          <div 
            data-coin-header=""
            className={`flex items-center justify-end ${
              compact
                ? "gap-1 px-2 py-1"
                : "gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5"
            } bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full border-2 border-blue-300 shadow-lg w-full transition-all hover:scale-105`}
          >
            <div className={`${compact ? "text-sm" : "text-base sm:text-lg md:text-xl lg:text-2xl"} font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate`}>
              {formatNumber(animatedCoins)}
            </div>
            <div className={`${compact ? "w-5 h-5" : "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9"} flex-shrink-0 bg-yellow-400 rounded-full flex items-center justify-center shadow-md`}>
              <svg
                viewBox="0 0 24 24"
                className={compact ? "w-3 h-3" : "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"}
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
          <div className={`flex items-center justify-end ${
            compact
              ? "gap-1 px-2 py-1"
              : "gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5"
          } bg-gradient-to-r from-emerald-400 to-green-400 rounded-full border-2 border-green-300 shadow-lg w-full transition-all hover:scale-105`}>
            <div className={`${compact ? "text-sm" : "text-base sm:text-lg md:text-xl lg:text-2xl"} font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate`}>
              {formatNumber(userGem1)}
            </div>
            <div className={`${compact ? "w-5 h-5" : "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9"} flex-shrink-0 bg-green-400 rounded-full flex items-center justify-center shadow-md`}>
              <svg
                viewBox="0 0 24 24"
                className={compact ? "w-3 h-3 text-slate-800" : "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-800"}
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2L5 21l7-3 7 3L12 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Middle - User Icon  */}
        <div className={`flex-shrink-0 ${compact ? "w-12 h-12 border-2" : "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 border-4"} rounded-full border-slate-300 shadow-2xl overflow-hidden`}>
          <img
            src="/q.jpg"
            alt="center icon"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right Stats - XP & Gem2 */}
        <div className={`flex flex-col ${compact ? "gap-1" : "gap-1.5 sm:gap-2"} flex-1`}>
          {/* XP (Knowledge Points) */}
          <div className={`flex items-center justify-start ${
            compact
              ? "gap-1 px-2 py-1"
              : "gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5"
          } bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full border-2 border-blue-300 shadow-lg w-full transition-all hover:scale-105`}>
            <div className={`${compact ? "w-5 h-5" : "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9"} flex-shrink-0 bg-amber-200 rounded-full flex items-center justify-center shadow-md`}>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                className={compact ? "w-3 h-3 text-amber-500" : "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-500"}
              >
                <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.4 1-1v-1H9v1z" />
                <path d="M12 2C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.2 3-3.3 3-5.7 0-3.9-3.1-7-7-7z" />
                <circle cx="12" cy="9" r="2" fill="#fff" />
              </svg>
            </div>
            <div className={`${compact ? "text-sm" : "text-base sm:text-lg md:text-xl lg:text-2xl"} font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate`}>
              {formatNumber(animatedXP)}
            </div>
          </div>

          {/* Gem 2 (Enlightenment Crystals) */}
          <div className={`flex items-center justify-start ${
            compact
              ? "gap-1 px-2 py-1"
              : "gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5"
          } bg-gradient-to-r from-emerald-400 to-green-400 rounded-full border-2 border-green-300 shadow-lg w-full transition-all hover:scale-105`}>
            <div className={`${compact ? "w-5 h-5" : "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9"} flex-shrink-0 bg-emerald-500 rounded-full flex items-center justify-center shadow-md`}>
              <svg
                viewBox="0 0 24 24"
                className={compact ? "w-3 h-3 text-slate-800" : "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-800"}
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
            </div>
            <div className={`${compact ? "text-sm" : "text-base sm:text-lg md:text-xl lg:text-2xl"} font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate`}>
              {formatNumber(userGem2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStatsHeader;

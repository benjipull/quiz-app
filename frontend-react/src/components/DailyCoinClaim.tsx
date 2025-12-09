// DailyCoinClaim.tsx - OPTIMIZED VERSION
// Uses cached daily bonus amount from UserContext

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Sparkles } from "lucide-react";
import { apiClient } from "@/utils/apiClient";
import { preloadSounds } from "@/utils/soundCache"; 

const BASE_URL = import.meta.env.VITE_BASE_URL;
const DEFAULT_BONUS = 1000;
const COOLDOWN_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface DailyCoinClaimProps {
  userToken: string;
  onCoinsEarned: (amount: number) => void;
  isClaimAvailable: boolean;
  updateUserLocally: (updates: { dailyClaimAvailable: boolean; coins?: number }) => void;
  cachedBonusAmount?: number; // ✅ NEW: Get from UserContext cache
}

export default function DailyCoinClaim({ 
  userToken, 
  onCoinsEarned, 
  isClaimAvailable, 
  updateUserLocally,
  cachedBonusAmount = DEFAULT_BONUS // ✅ Use cached value
}: DailyCoinClaimProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(
    isClaimAvailable ? 0 : COOLDOWN_DURATION
  );
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState<boolean>(false);
  const [coinTokens, setCoinTokens] = useState<Array<{ id: number; delay: number }>>([]);
  
  // ✅ Use cached bonus amount from props (already in UserContext)
  const [dailyBonusAmount] = useState<number>(cachedBonusAmount);

  const [showDailyOverlay, setShowDailyOverlay] = useState(false);
  const earnedCoinsRef = useRef<HTMLDivElement>(null);
  const claimButtonRef = useRef<HTMLButtonElement>(null);

  // ✅ REMOVED: fetchDailyBonusAmount - now comes from cache

  useEffect(() => {
    // Get initial time remaining if not claimable
    const getInitialTimeRemaining = async () => {
      if (isClaimAvailable) {
        setTimeRemaining(0);
        return;
      }
      
      try {
        const response = await apiClient(`${BASE_URL}/api/getUserDetails`, {
          method: "GET",
        });

        if (!response || !response.ok) return;

        const userData = await response.json();

        if (userData.lastDailyCoinClaim) {
          const lastClaim = new Date(userData.lastDailyCoinClaim).getTime();
          const now = Date.now();
          const remaining = COOLDOWN_DURATION - (now - lastClaim);

          if (remaining > 0) {
            setTimeRemaining(remaining);
          } else {
            updateUserLocally({ dailyClaimAvailable: true }); 
            setTimeRemaining(0);
          }
        }
      } catch (error) {
        console.error("Error fetching initial time remaining:", error);
      }
    };
    
    getInitialTimeRemaining();

    let interval: ReturnType<typeof setInterval>;

    if (!isClaimAvailable && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1000;
          if (newTime <= 1000) {
            updateUserLocally({ dailyClaimAvailable: true });
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [userToken, isClaimAvailable, timeRemaining, updateUserLocally]);

  const handleClaimClick = async () => {
    if (!isClaimAvailable || isClaiming) return; 

    setIsClaiming(true);

    try {
      const response = await apiClient(`${BASE_URL}/api/claimDailyCoins`, {
        method: "POST",
      });

      if (!response) {
        setIsClaiming(false);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        const coinsEarned = data.coinsEarned || dailyBonusAmount;

        updateUserLocally({ dailyClaimAvailable: false });

        setShowDailyOverlay(true);
        setTimeout(() => {
          startCoinAnimation(coinsEarned);
        }, 900);

        setTimeRemaining(COOLDOWN_DURATION);
      } else {
        if (data.timeRemainingMs) {
          setTimeRemaining(data.timeRemainingMs);
          updateUserLocally({ dailyClaimAvailable: false }); 
        } else {
          setIsClaiming(false);
        }
      }
    } catch (error) {
      console.error("Error claiming coins:", error);
      setIsClaiming(false);
    }
  };

  const startCoinAnimation = (coinsEarned: number) => {
    const overlayRect = earnedCoinsRef.current?.getBoundingClientRect();
    const headerCoinElement = document.querySelector("[data-coin-header]");
    const headerRect = headerCoinElement?.getBoundingClientRect();

    if (!overlayRect || !headerRect) {
      if (onCoinsEarned) onCoinsEarned(coinsEarned);
      setIsClaiming(false);
      setShowDailyOverlay(false);
      return;
    }

    const startX = overlayRect.left + overlayRect.width / 2;
    const startY = overlayRect.top + overlayRect.height / 2;
    const endX = headerRect.left + headerRect.width / 2;
    const endY = headerRect.top + headerRect.height / 2;

    const tokenCount = Math.min(15, Math.max(8, coinsEarned / 50));
    const newTokens = Array.from({ length: Math.floor(tokenCount) }, (_, i) => ({
      id: i,
      delay: i * 80,
    }));

    setCoinTokens(newTokens);
    setShowFlyingCoins(true);

    document.documentElement.style.setProperty("--daily-coin-start-x", `${startX}px`);
    document.documentElement.style.setProperty("--daily-coin-start-y", `${startY}px`);
    document.documentElement.style.setProperty("--daily-coin-end-x", `${endX}px`);
    document.documentElement.style.setProperty("--daily-coin-end-y", `${endY}px`);

    let coinsAdded = 0;
    const coinsPerToken = Math.ceil(coinsEarned / tokenCount);

    const coinTimer = setInterval(() => {
      // ✅ Use cached sound system
      preloadSounds("/knowledge-point.mp3", 0.2);
        
      coinsAdded += coinsPerToken;
      if (coinsAdded >= coinsEarned) {
        coinsAdded = coinsEarned;
        clearInterval(coinTimer);

        setTimeout(() => {
          setShowFlyingCoins(false);
          setShowDailyOverlay(false);
          setIsClaiming(false);
        }, 250);
      }

      if (onCoinsEarned && coinsAdded <= coinsEarned) {
        onCoinsEarned(coinsPerToken);
      }
    }, 150);
  };

  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return "Ready!";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <>
      {isClaiming && showDailyOverlay && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
          <div
            ref={earnedCoinsRef}
            className="py-4 sm:py-8 text-center space-y-3 sm:space-y-4 animate-pop-in"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-amber-500/50 animate-pulse-glow">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-12 w-12">
                <circle cx="8" cy="9" r="5" fill="#f59e0b" />
                <circle cx="8" cy="9" r="4" fill="#fbbf24" />
                <circle cx="8" cy="9" r="2.5" fill="#f59e0b" opacity="0.4" />
                <circle cx="14" cy="13" r="6" fill="#f59e0b" />
                <circle cx="14" cy="13" r="5" fill="#fbbf24" />
                <circle cx="14" cy="13" r="3" fill="#f59e0b" opacity="0.4" />
              </svg>
            </div>

            <div className="coin-text-aura text-5xl sm:text-6xl font-black bg-gradient-to-b from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tabular-nums animate-number-grow">
              +{dailyBonusAmount}
            </div>
          </div>
        </div>
      )}

      <Card className="w-full max-w-8xl rounded-[30px] bg-transparent border-none p-2 sm:p-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className="w-full h-full">
                  <circle cx="10" cy="11" r="7" fill="#d97706" />
                  <circle cx="10" cy="11" r="6" fill="#fcd34d" />
                  <circle cx="10" cy="11" r="3.5" fill="#d97706" opacity="0.4" />
                  <circle cx="17" cy="16" r="8" fill="#d97706" />
                  <circle cx="17" cy="16" r="7" fill="#fcd34d" />
                  <circle cx="17" cy="16" r="4.2" fill="#d97706" opacity="0.4" />
                </svg>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-[-18px] left-2 px-2.5 sm:px-3 py-0.5 font-bold text-white pointer-events-none"
                disabled
              >
                +{dailyBonusAmount}
              </Button>
            </div>

            <div className="leading-tight min-w-0 -ml-1">
              <h3 className="text-white font-bold text-lg sm:text-2xl whitespace-nowrap">Daily Reward</h3>
            </div>
          </div>

          <Button
            ref={claimButtonRef}
            onClick={handleClaimClick}
            className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-6 sm:py-3"
            variant={isClaimAvailable ? "warning" : "purple"}
            style={{
              ...(isClaimAvailable
                ? {
                    border: "3px solid #fcd34d",
                    boxShadow: "0 0 25px rgba(255,255,0,0.5)",
                  }
                : {
                    border: "1px solid rgba(128,90,213,0.5)",
                    boxShadow: "0 0 15px rgba(240,171,240,0.4), 0 4px 15px rgba(0,0,0,0.5)",
                  }),
            }}
          >
            {isClaimAvailable ? (
              <>
                <Sparkles
                  className={`w-4 h-4 sm:w-6 sm:h-6 ${
                    isClaiming ? "text-gray-400" : "text-yellow-400"
                  }`}
                />
                <span
                  className={`font-bold text-sm sm:text-lg whitespace-nowrap ${
                    isClaiming ? "text-gray-400" : "text-yellow-400"
                  }`}
                >
                  {isClaiming ? "Claiming..." : "Claim Now"}
                </span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-[#f0abf0] opacity-90" />
                <span className="text-white font-bold text-sm sm:text-lg whitespace-nowrap">
                  {formatTimeRemaining(timeRemaining)}
                </span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {showFlyingCoins &&
        coinTokens.map((token) => (
          <div
            key={token.id}
            className="daily-coin-token"
            style={
              {
                "--daily-coin-delay": `${token.delay}ms`,
              } as any
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-full w-full p-[2px]">
              <circle cx="8" cy="9" r="5" fill="#f59e0b" />
              <circle cx="8" cy="9" r="4" fill="#fbbf24" />
              <circle cx="8" cy="9" r="2.5" fill="#f59e0b" opacity="0.4" />
              <circle cx="14" cy="13" r="6" fill="#f59e0b" />
              <circle cx="14" cy="13" r="5" fill="#fbbf24" />
              <circle cx="14" cy="13" r="3" fill="#f59e0b" opacity="0.4" />
            </svg>
          </div>
        ))}

      <style>{`
        .coin-text-aura {
          text-shadow:
            0 0 10px rgba(255, 193, 7, 0.9),
            0 0 20px rgba(255, 165, 0, 0.7),
            0 0 30px rgba(255, 140, 0, 0.5);
        }

        @keyframes pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in { animation: pop-in 0.5s ease-out forwards; }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.5); transform: scale(1); }
          50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.8); transform: scale(1.05); }
        }
        .animate-pulse-glow { animation: pulse-glow 2s infinite; }

        @keyframes number-grow {
          0% { transform: translateY(10px) scale(0.7); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-number-grow { animation: number-grow 0.7s ease-out forwards; }

        .daily-coin-token {
          position: fixed;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: #FCD34D;
          border: 2px solid #D97706;
          box-shadow:
            0 0 0 3px rgba(251, 191, 36, 0.3),
            0 0 15px rgba(251, 191, 36, 0.5),
            0 5px 20px rgba(0, 0, 0, 0.4);
          z-index: 9999;
          opacity: 0;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fly-daily-coin 1200ms cubic-bezier(0.25,0.46,0.45,0.94) var(--daily-coin-delay, 0ms) forwards;
        }

        @keyframes fly-daily-coin {
          0% {
            opacity: 0;
            left: var(--daily-coin-start-x, 50vw);
            top: var(--daily-coin-start-y, 50vh);
            transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
          }
          10% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.3) rotate(-180deg);
          }
          85% {
            opacity: 1;
            left: var(--daily-coin-end-x, 50vw);
            top: var(--daily-coin-end-y, 50vh);
            transform: translate(-50%, -50%) scale(0.8) rotate(-900deg);
          }
          100% {
            opacity: 0;
            left: var(--daily-coin-end-x, 50vw);
            top: var(--daily-coin-end-y, 50vh);
            transform: translate(-50%, -50%) scale(0.1) rotate(-1080deg);
          }
        }
      `}</style>
    </>
  );
}
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Sparkles } from "lucide-react";
import { preloadSounds } from "@/utils/soundCache";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const DEFAULT_BONUS = 1000;
const COOLDOWN_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface DailyCoinClaimProps {
  userToken: string;
  onCoinsEarned: (amount: number) => void;
  // Note: isClaimAvailable prop is no longer needed as the component now derives the state internally
  isClaimAvailable: boolean; 
  updateUserLocally: (updates: { dailyClaimAvailable: boolean; coins?: number }) => void;
  cachedBonusAmount?: number;
}

export default function DailyCoinClaim({
  userToken,
  onCoinsEarned,
  updateUserLocally,
  cachedBonusAmount = DEFAULT_BONUS,
}: DailyCoinClaimProps) {
  // ✅ FIX 1: Initialize timeRemaining to null to show a loading state initially.
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null); 
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState<boolean>(false);
  const [coinTokens, setCoinTokens] = useState<Array<{ id: number; delay: number }>>([]);
  const [dailyBonusAmount] = useState<number>(cachedBonusAmount);
  const [showDailyOverlay, setShowDailyOverlay] = useState(false);

  const earnedCoinsRef = useRef<HTMLDivElement>(null);
  const claimButtonRef = useRef<HTMLButtonElement>(null);
  
  // CRITICAL FIX: Prevent multiple simultaneous fetches
  const isFetchingTimeRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Derive isClaimAvailable internally from the timeRemaining state
  const isClaimAvailable = timeRemaining !== null && timeRemaining <= 0;


  // ✅ FIX 2: Fetch initial time remaining ONCE to get the precise cooldown time
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!userToken) return;
    if (isFetchingTimeRef.current) return;

    const getInitialTimeRemaining = async () => {
      isFetchingTimeRef.current = true;

      try {
        const response = await fetch(`${BASE_URL}/api/getUserDetails`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });

        const userData = await response.json();

        if (response.ok && userData.lastDailyCoinClaim) {
          const lastClaim = new Date(userData.lastDailyCoinClaim).getTime();
          const now = Date.now();
          const remaining = COOLDOWN_DURATION - (now - lastClaim);

          if (remaining > 0) {
            setTimeRemaining(remaining);
            updateUserLocally({ dailyClaimAvailable: false });
          } else {
            setTimeRemaining(0);
            updateUserLocally({ dailyClaimAvailable: true });
          }
        } else {
            // Default to claim available if no last claim timestamp is found (new user/first claim)
            setTimeRemaining(0);
            updateUserLocally({ dailyClaimAvailable: true });
        }
      } catch (error) {
        console.error("Error fetching initial time remaining:", error);
        // Fail safe: If fetch fails, allow claim after a brief delay
        setTimeout(() => setTimeRemaining(0), 1000); 
      } finally {
        isFetchingTimeRef.current = false;
        hasInitializedRef.current = true;
      }
    };

    getInitialTimeRemaining();
  }, [userToken]); 

  // ✅ FIX 3: Countdown timer - only runs when timeRemaining is initialized and > 0
  useEffect(() => {
    // Wait until timeRemaining is initialized by the fetch (not null) and is greater than 0
    if (timeRemaining === null || timeRemaining <= 0) return; 

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return 0; // Should not happen but for safety

        const newTime = prev - 1000;
        if (newTime <= 1000) {
          updateUserLocally({ dailyClaimAvailable: true });
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, updateUserLocally]); 

  const handleClaimClick = async () => {
    if (!isClaimAvailable || isClaiming) return;

    setIsClaiming(true);

    try {
      const response = await fetch(`${BASE_URL}/api/claimDailyCoins`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response) {
        setIsClaiming(false);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        const coinsEarned = data.coinsEarned || dailyBonusAmount;

        // ✅ CRITICAL FIX: Update state immediately to prevent re-claiming
        // Use data.newCoinsTotal if the API sends it for better SSOT consistency
        updateUserLocally({ dailyClaimAvailable: false, coins: data.newCoinsTotal }); 
        setTimeRemaining(COOLDOWN_DURATION);

        setShowDailyOverlay(true);
        setTimeout(() => {
          startCoinAnimation(coinsEarned);
        }, 900);
      } else {
        // If server says claim failed but provides remaining time, update state
        if (data.timeRemainingMs) {
          setTimeRemaining(data.timeRemainingMs);
          updateUserLocally({ dailyClaimAvailable: false });
        }
        setIsClaiming(false); // ✅ Reset if claim failed
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
        onCoinsEarned(coinsPerToken); // <-- This calls the parent coin updater
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

  // ✅ FIX 4: Handle timeRemaining being null (loading state) in the render
  const renderTimeOrStatus = () => {
    if (timeRemaining === null) return "Loading...";
    if (isClaimAvailable) return isClaiming ? "Claiming..." : "Claim Now";
    return formatTimeRemaining(timeRemaining);
  }

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

      {showFlyingCoins && coinTokens.map((token) => (
        <div
          key={token.id}
          className="daily-coin-token"
          style={{ '--daily-coin-delay': `${token.delay}ms` } as React.CSSProperties}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-white"
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
      ))}

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
                  <circle cx="17" cy="16" r="4" fill="#d97706" opacity="0.4" />
                </svg>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-white text-base sm:text-lg font-bold truncate">
                Daily Bonus
              </p>
              <p className="text-yellow-400 text-sm sm:text-base font-semibold">
                +{dailyBonusAmount} Coins
              </p>
            </div>
          </div>

         <Button
  ref={claimButtonRef}
  onClick={handleClaimClick}
  disabled={!isClaimAvailable || isClaiming || timeRemaining === null}
  variant={isClaimAvailable ? "warning" : "purple"}
>
  {timeRemaining === null ? (
    <div className="flex items-center space-x-2">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2"></div>
      <span>Loading...</span>
    </div>
  ) : isClaiming ? (
    <div className="flex items-center space-x-2">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2"></div>
      <span>Claiming...</span>
    </div>
  ) : isClaimAvailable ? (
    <span>Claim Now!</span>
  ) : (
    <div className="flex items-center space-x-2">
      <Clock className="w-4 h-4" />
      <span>{formatTimeRemaining(timeRemaining)}</span>
    </div>
  )}
</Button>

        </div>
      </Card>

      <style>{`
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
            transform: translate(-50%, -50%) scale(1.1) rotate(0deg);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(30deg);
          }
          90% {
            opacity: 0.8;
            left: var(--daily-coin-end-x, 50vw);
            top: var(--daily-coin-end-y, 50vh);
            transform: translate(-50%, -50%) scale(0.5) rotate(360deg);
          }
          100% {
            opacity: 0;
            left: var(--daily-coin-end-x, 50vw);
            top: var(--daily-coin-end-y, 50vh);
            transform: translate(-50%, -50%) scale(0) rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
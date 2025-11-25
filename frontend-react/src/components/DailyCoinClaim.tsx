import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Sparkles } from "lucide-react";
import { apiClient } from "@/utils/apiClient";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const DEFAULT_BONUS = 500;
const COINS_GAIN_SOUND_SRC = "/knowledge-point.mp3"; 


interface DailyCoinClaimProps {
userToken: string;
onCoinsEarned?: (amount: number) => void;
}

export default function DailyCoinClaim({ userToken, onCoinsEarned }: DailyCoinClaimProps) {
const [timeRemaining, setTimeRemaining] = useState<number>(0);
const [canClaim, setCanClaim] = useState<boolean>(false);
const [isClaiming, setIsClaiming] = useState<boolean>(false);

const [showFlyingCoins, setShowFlyingCoins] = useState<boolean>(false);
const [coinTokens, setCoinTokens] = useState<Array<{ id: number; delay: number }>>([]);

const [dailyBonusAmount, setDailyBonusAmount] = useState<number>(DEFAULT_BONUS);

// Overlay state + ref (we'll start the flying coins from this element)
const [showDailyOverlay, setShowDailyOverlay] = useState(false);
const earnedCoinsRef = useRef<HTMLDivElement>(null);

// ADDITION: Initialize the Audio object
const [coinGainAudio] = useState(
    typeof Audio !== "undefined" ? new Audio(COINS_GAIN_SOUND_SRC) : null
);

const claimButtonRef = useRef<HTMLDivElement>(null);

const fetchDailyBonusAmount = useCallback(async () => {
try {
const response = await apiClient(`${BASE_URL}/api/claimDailyCoins/amount`, {
method: "GET",
});

  if (response && response.ok) {
    const data = await response.json();
    if (data.dailyBonusAmount) {
      setDailyBonusAmount(data.dailyBonusAmount);
    }
  }
} catch (error) {
  console.error("Error fetching daily bonus amount:", error);
}

}, []);

useEffect(() => {
if (!userToken) return;

fetchDailyBonusAmount();
checkClaimStatus();

const interval = setInterval(() => {
  setTimeRemaining((prev) => {
    if (prev <= 1000) {
      if (!canClaim) setCanClaim(true);
      return 0;
    }
    return prev - 1000;
  });
}, 1000);

return () => clearInterval(interval);

}, [userToken, canClaim, fetchDailyBonusAmount]);

const checkClaimStatus = async () => {
try {
const response = await apiClient(`${BASE_URL}/api/getUserDetails`, {
method: "GET",
});

  if (!response || !response.ok) return;

  const userData = await response.json();

  if (userData.lastDailyCoinClaim) {
    const lastClaim = new Date(userData.lastDailyCoinClaim).getTime();
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    const remaining = cooldown - (now - lastClaim);

    if (remaining > 0) {
      setTimeRemaining(remaining);
      setCanClaim(false);
    } else {
      setTimeRemaining(0);
      setCanClaim(true);
    }
  } else {
    setTimeRemaining(0);
    setCanClaim(true);
  }
} catch (error) {
  console.error("Error checking claim status:", error);
  if (timeRemaining <= 0) setCanClaim(true);
}

};

const handleClaimClick = async () => {
if (!canClaim || isClaiming) return;

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

    // Show overlay (center) and then start coin animation from that overlay icon
    setShowDailyOverlay(true);

    // Delay briefly so the overlay/pop animation is visible before coins fly
    setTimeout(() => {
      startCoinAnimation(coinsEarned);
    }, 900);

    setCanClaim(false);
    setTimeRemaining(24 * 60 * 60 * 1000);

    // NOTE: intentionally no toast / notification so user can watch the animation
  } else {
    // Server returned an error (e.g. still on cooldown). Update UI quietly.
    if (data.timeRemainingMs) {
      setTimeRemaining(data.timeRemainingMs);
      setCanClaim(false);
    } else {
      checkClaimStatus();
    }
    setIsClaiming(false);
  }
} catch (error) {
  console.error("Error claiming coins:", error);
  setIsClaiming(false);
}

};

// START COIN ANIMATION: start from overlay icon center (earnedCoinsRef) -> header coin
const startCoinAnimation = (coinsEarned: number) => {
const overlayRect = earnedCoinsRef.current?.getBoundingClientRect();
const headerCoinElement = document.querySelector("[data-coin-header]");
const headerRect = headerCoinElement?.getBoundingClientRect();


// If either rect is missing, fallback to notifying parent and end gracefully
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

// set CSS vars used by the token animation
document.documentElement.style.setProperty("--daily-coin-start-x", `${startX}px`);
document.documentElement.style.setProperty("--daily-coin-start-y", `${startY}px`);
document.documentElement.style.setProperty("--daily-coin-end-x", `${endX}px`);
document.documentElement.style.setProperty("--daily-coin-end-y", `${endY}px`);

// progressively notify parent about coins being added so header increments smoothly
let coinsAdded = 0;
const coinsPerToken = Math.ceil(coinsEarned / tokenCount);

const coinTimer = setInterval(() => {
  // ADDITION: Play coin gain sound
  if (coinGainAudio) {
      const audioClone = coinGainAudio.cloneNode(true) as HTMLAudioElement;
      audioClone.volume = 0.2; // Lower volume slightly for repeated ticks
      audioClone.play().catch(e => console.log("Audio play failed:", e));
  }
    
  coinsAdded += coinsPerToken;
  if (coinsAdded >= coinsEarned) {
    coinsAdded = coinsEarned;
    clearInterval(coinTimer);

    // Give the last tokens a moment to finish their animation before hiding overlay
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
{/* DAILY REWARD OVERLAY (coins will start from the center icon) */}
{isClaiming && showDailyOverlay && ( <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none"> <div
         ref={earnedCoinsRef}
         className="py-4 sm:py-8 text-center space-y-3 sm:space-y-4 animate-pop-in"
       >
{/* Center coin icon - coins will originate from the center of this element */} <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-amber-500/50 animate-pulse-glow"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-12 w-12"> <circle cx="8" cy="9" r="5" fill="#f59e0b" /> <circle cx="8" cy="9" r="4" fill="#fbbf24" /> <circle cx="8" cy="9" r="2.5" fill="#f59e0b" opacity="0.4" /> <circle cx="14" cy="13" r="6" fill="#f59e0b" /> <circle cx="14" cy="13" r="5" fill="#fbbf24" /> <circle cx="14" cy="13" r="3" fill="#f59e0b" opacity="0.4" /> </svg> </div>

        {/* Large number (keeps visual feedback) */}
        <div className="coin-text-aura text-5xl sm:text-6xl font-black bg-gradient-to-b from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tabular-nums animate-number-grow">
          +{dailyBonusAmount}
        </div>

        {/* NOTE: no extra notifications or toasts are shown */}
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

          <span className="absolute bottom-[-18px] left-2 bg-emerald-500 rounded-full border-2 border-white/80 px-2.5 sm:px-3 py-0.5 text-xs sm:text-sm font-bold text-white shadow-lg whitespace-nowrap">
            +{dailyBonusAmount}
          </span>
        </div>

        <div className="leading-tight min-w-0 -ml-1">
          <h3 className="text-white font-bold text-lg sm:text-2xl whitespace-nowrap">Daily Reward</h3>
        </div>
      </div>

      <div
        ref={claimButtonRef}
        className={`
          flex items-center gap-1 sm:gap-2
          px-3 py-1.5 sm:px-6 sm:py-3
          rounded-full
          ${
            canClaim
              ? "bg-yellow-500/10 border-[3px] border-yellow-400 shadow-[0_0_25px_rgba(255,255,0,0.5)] cursor-pointer hover:bg-yellow-500/20 transition-colors"
              : "bg-[#501b9b] shadow-[0_0_15px_rgba(240,171,240,0.4),_0_4px_15px_rgba(0,0,0,0.5)] border border-purple-800/50"
          }
        `}
        onClick={handleClaimClick}
      >
        {canClaim ? (
          <>
            <Sparkles className={`w-4 h-4 sm:w-6 sm:h-6 ${isClaiming ? "text-gray-400" : "text-yellow-400"}`} />
            <span className={`font-bold text-sm sm:text-lg whitespace-nowrap ${isClaiming ? "text-gray-400" : "text-yellow-400"}`}>
              {isClaiming ? "Claiming..." : "Claim Now"}
            </span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-[#f0abf0] opacity-90" />
            <span className="text-white font-bold text-sm sm:text-lg whitespace-nowrap">{formatTimeRemaining(timeRemaining)}</span>
          </>
        )}
      </div>
    </div>
  </Card>

  {/* Flying coin tokens */}
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

  {/* Styles */}
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
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getApiBaseUrl } from "@/utils/baseUrl";
import { trackEvent, trackFirstSessionInteraction } from "@/utils/analytics";
import { playSound } from "@/utils/soundCache";

const BASE_URL = getApiBaseUrl();
const DEFAULT_BONUS = 100;
const COOLDOWN_DURATION = 24 * 60 * 60 * 1000;
const COIN_GIFT_IMAGE_SRC = "/assets/images/icons/coin%20gift.png";

interface DailyCoinClaimProps {
  userToken: string;
  onCoinsEarned: (amount: number) => void;
  isClaimAvailable: boolean;
  updateUserLocally: (updates: {
    dailyClaimAvailable?: boolean;
    coins?: number;
    lastDailyCoinClaim?: string | null;
  }) => void;
  cachedBonusAmount?: number;
  lastDailyCoinClaim?: string | null;
  variant?: "default" | "sagaBubble";
  className?: string;
}

export default function DailyCoinClaim({
  userToken,
  onCoinsEarned,
  updateUserLocally,
  cachedBonusAmount = DEFAULT_BONUS,
  lastDailyCoinClaim,
  variant = "default",
  className = "",
}: DailyCoinClaimProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState<boolean>(false);
  const [coinTokens, setCoinTokens] = useState<Array<{ id: number; delay: number }>>([]);
  const [dailyBonusAmount] = useState<number>(cachedBonusAmount);
  const [showDailyOverlay, setShowDailyOverlay] = useState(false);

  const earnedCoinsRef = useRef<HTMLDivElement>(null);
  const claimButtonRef = useRef<HTMLButtonElement>(null);
  const lastInitKeyRef = useRef<string | null>(null);

  const isClaimAvailable = timeRemaining !== null && timeRemaining <= 0;
  const isSagaBubbleVariant = variant === "sagaBubble";

  useEffect(() => {
    if (!userToken) return;

    const initKey = `${userToken}:${lastDailyCoinClaim ?? "none"}`;
    if (lastInitKeyRef.current === initKey) return;
    lastInitKeyRef.current = initKey;

    if (lastDailyCoinClaim) {
      const lastClaim = new Date(lastDailyCoinClaim).getTime();
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
      setTimeRemaining(0);
      updateUserLocally({ dailyClaimAvailable: true });
    }
  }, [userToken, lastDailyCoinClaim, updateUserLocally]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((previous) => {
        if (previous === null) return 0;

        const nextTime = previous - 1000;
        if (nextTime <= 1000) {
          updateUserLocally({ dailyClaimAvailable: true });
          return 0;
        }
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, updateUserLocally]);

  const handleClaimClick = async (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (!isClaimAvailable || isClaiming) return;

    const resolvedUserId = (() => {
      if (typeof window === "undefined") return undefined;
      try {
        const rawUser = localStorage.getItem("user");
        if (!rawUser) return undefined;
        const parsedUser = JSON.parse(rawUser);
        return parsedUser?._id as string | undefined;
      } catch {
        return undefined;
      }
    })();

    trackFirstSessionInteraction({
      user_id: resolvedUserId,
      event_label: "Claim",
      location: "home",
      cta: "daily_reward_claim",
    });
    trackEvent("home_cta_click", { user_id: resolvedUserId, cta: "daily_reward_claim" });

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
        const updatedCoinTotal = data.totalCoins ?? data.newCoinsTotal;
        const claimedAt = new Date().toISOString();

        updateUserLocally({
          dailyClaimAvailable: false,
          coins: updatedCoinTotal,
          lastDailyCoinClaim: claimedAt,
        });
        setTimeRemaining(COOLDOWN_DURATION);

        setShowDailyOverlay(true);
        setTimeout(() => {
          startCoinAnimation(coinsEarned);
        }, 900);
      } else {
        if (data.timeRemainingMs) {
          setTimeRemaining(data.timeRemainingMs);
          updateUserLocally({ dailyClaimAvailable: false });
        }
        setIsClaiming(false);
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
    const newTokens = Array.from({ length: Math.floor(tokenCount) }, (_, index) => ({
      id: index,
      delay: index * 80,
    }));

    setCoinTokens(newTokens);
    setShowFlyingCoins(true);

    document.documentElement.style.setProperty("--daily-coin-start-x", `${startX}px`);
    document.documentElement.style.setProperty("--daily-coin-start-y", `${startY}px`);
    document.documentElement.style.setProperty("--daily-coin-end-x", `${endX}px`);
    document.documentElement.style.setProperty("--daily-coin-end-y", `${endY}px`);

    if (onCoinsEarned) {
      onCoinsEarned(coinsEarned);
    }

    playSound("/assets/sounds/knowledge-point.mp3", 0.2);

    setTimeout(() => {
      setShowFlyingCoins(false);
      setShowDailyOverlay(false);
      setIsClaiming(false);
    }, Math.floor(tokenCount) * 150 + 250);
  };

  const formatTimeRemaining = (milliseconds: number) => {
    if (milliseconds <= 0) return "Ready!";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const buttonStatusLabel =
    timeRemaining === null
      ? "Loading..."
      : isClaiming
        ? "Claiming..."
        : isClaimAvailable
          ? "NOW"
          : formatTimeRemaining(timeRemaining);

  const renderOverlay = (node: React.ReactNode) => {
    if (typeof document === "undefined") return null;
    return createPortal(node, document.body);
  };

  return (
    <>
      {isClaiming && showDailyOverlay && renderOverlay(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
          <div
            ref={earnedCoinsRef}
            className="py-4 sm:py-8 text-center space-y-3 sm:space-y-4 animate-pop-in"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-amber-500/50 animate-pulse-glow">
              <img
                src={COIN_GIFT_IMAGE_SRC}
                alt="Coin gift"
                className="h-12 w-12 object-contain"
              />
            </div>
            <div className="coin-text-aura text-5xl sm:text-6xl font-black bg-gradient-to-b from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent tabular-nums animate-number-grow">
              {dailyBonusAmount}
            </div>
          </div>
        </div>
      )}

      {showFlyingCoins && renderOverlay(
        <>
          {coinTokens.map((token) => (
            <div
              key={token.id}
              className="daily-coin-token"
              style={{ "--daily-coin-delay": `${token.delay}ms` } as React.CSSProperties}
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
        </>
      )}

      {isSagaBubbleVariant ? (
        <Card
          className={`relative inline-flex h-[292px] w-[144px] max-w-full flex-col overflow-hidden rounded-[18px] border-[2.5px] border-[#7ee8ff] bg-gradient-to-b from-[#6428eb] via-[#0f5fe4] to-[#1240b1] p-0 shadow-[0_12px_22px_rgba(7,27,84,0.62),inset_0_1px_0_rgba(255,255,255,0.38)] ${className}`}
        >
          <div className="rounded-t-[15px] bg-gradient-to-b from-[#8d3cff] to-[#5f20d6] px-2 py-2 text-center">
            <p className="flex items-center justify-center gap-0.5 whitespace-nowrap text-[clamp(10px,2.6vw,12px)] font-black leading-none tracking-[0.02em] text-white">
              <Clock className="h-3.5 w-3.5" />
              DAILY REWARD
            </p>
          </div>

          <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-1.5">
            <p className="text-center text-[10px] font-semibold leading-[1.06] text-[#ecf6ff]">
              Come back every
              <span className="mt-0.5 block whitespace-nowrap text-[clamp(22px,6.4vw,30px)] font-black leading-[0.95] tracking-tight text-[#ffde2a]">
                24 HOURS
              </span>
              to claim your reward!
            </p>

            <div className="mt-1.5 flex justify-center">
              <img
                src={COIN_GIFT_IMAGE_SRC}
                alt="Coin gift"
                className="h-[clamp(96px,30vw,132px)] w-[clamp(96px,30vw,132px)] object-contain drop-shadow-[0_7px_10px_rgba(0,0,0,0.38)]"
              />
            </div>

            <p className="mt-0.5 text-center whitespace-nowrap text-[clamp(20px,5.8vw,26px)] font-black leading-none tracking-tight text-[#fff5cf] [text-shadow:0_2px_0_rgba(46,64,118,0.92)]">
              {dailyBonusAmount} Coins
            </p>

            <Button
              ref={claimButtonRef}
              type="button"
              onClick={(event) => {
                void handleClaimClick(event);
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              disabled={isClaiming || timeRemaining === null}
              className={`mt-auto h-auto rounded-[12px] border-2 px-2 py-1.5 ${
                isClaimAvailable
                  ? "border-[#b5f7a7] bg-gradient-to-b from-[#43db6e] to-[#239b3f] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_10px_rgba(8,72,30,0.42)] hover:brightness-105"
                  : "border-[#8adb8e] bg-gradient-to-b from-[#2fb958] to-[#1f873f] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_6px_10px_rgba(8,72,30,0.4)]"
              } ${isClaiming || timeRemaining === null ? "opacity-75" : "opacity-100"}`}
            >
              <span className="block text-[12px] font-black leading-none text-white [text-shadow:0_2px_0_rgba(8,80,40,0.75)]">
                {isClaimAvailable ? "CLAIM NOW" : "CLAIM IN"}
              </span>
              <span className="mt-0.5 flex items-center justify-center gap-1 text-[18px] font-black leading-none text-[#f1ffef] [text-shadow:0_2px_0_rgba(8,80,40,0.75)]">
                <Clock className="h-4 w-4" />
                {buttonStatusLabel}
              </span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className={`daily-reward-shell relative inline-block overflow-visible w-[310px] sm:w-[430px] lg:w-[530px] max-w-full ${className}`}>
          <div className="daily-reward-gift pointer-events-none absolute left-[-31px] top-1/2 z-20 -translate-y-1/2">
            <img
              src={COIN_GIFT_IMAGE_SRC}
              alt="Coin gift"
              className="daily-reward-gift-image w-36 h-36 sm:w-40 sm:h-40 object-contain"
            />
          </div>

          <Card className="daily-reward-card h-[74px] sm:h-[78px] overflow-hidden rounded-[14px] border-2 border-amber-300 bg-orange-500/15 p-2 sm:p-2.5 shadow-[0_0_22px_rgba(251,191,36,0.35),inset_0_0_0_1px_rgba(253,230,138,0.5)]">
            <div className="relative h-full">
              <p className="daily-reward-title pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-xl sm:text-2xl font-bold whitespace-nowrap leading-none bg-gradient-to-b from-orange-200 via-orange-400 to-orange-600 bg-clip-text text-transparent">
                Daily Reward
              </p>

              <div className="daily-reward-content flex h-full items-end justify-between gap-2 pl-20 pr-2 pb-2 pt-5 sm:pl-24 sm:pr-2.5 sm:pb-2.5">
                <p className="daily-reward-coins text-yellow-400 text-xs sm:text-sm font-semibold leading-none">
                  {dailyBonusAmount} Coins
                </p>

                <Button
                  className="daily-reward-button h-8 sm:h-9 px-4 sm:px-5 text-sm rounded-[8px]"
                  ref={claimButtonRef}
                  type="button"
                  onClick={(event) => {
                    void handleClaimClick(event);
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
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
                    <span>Claim</span>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatTimeRemaining(timeRemaining)}</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <style>{`
        .daily-coin-token {
          position: fixed;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: #fcd34d;
          border: 2px solid #d97706;
          box-shadow:
            0 0 0 3px rgba(251, 191, 36, 0.3),
            0 0 15px rgba(251, 191, 36, 0.5),
            0 5px 20px rgba(0, 0, 0, 0.4);
          z-index: 10001;
          opacity: 0;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fly-daily-coin 1200ms cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--daily-coin-delay, 0ms) forwards;
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

        @media (max-height: 520px) {
          .daily-reward-shell {
            width: 250px !important;
          }

          .daily-reward-gift {
            left: -22px !important;
          }

          .daily-reward-gift-image {
            width: 6rem !important;
            height: 6rem !important;
          }

          .daily-reward-card {
            height: 54px !important;
          }

          .daily-reward-title {
            font-size: 0.9rem !important;
            line-height: 1 !important;
          }

          .daily-reward-content {
            padding-left: 3.5rem !important;
            padding-right: 0.5rem !important;
            padding-bottom: 0.5rem !important;
            padding-top: 1.6rem !important;
          }

          .daily-reward-coins {
            font-size: 0.64rem !important;
          }

          .daily-reward-button {
            height: 1.5rem !important;
            padding-left: 0.625rem !important;
            padding-right: 0.625rem !important;
            font-size: 0.72rem !important;
            border-radius: 7px !important;
          }
        }
      `}</style>
    </>
  );
}

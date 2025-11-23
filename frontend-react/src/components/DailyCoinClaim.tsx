import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Coins, Clock, Sparkles, Star, CircleDollarSign } from "lucide-react"; // Removed Gift
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/utils/apiClient";

// Ensure BASE_URL is defined in your environment variables
const BASE_URL = import.meta.env.VITE_BASE_URL;
const DEFAULT_BONUS = 500; // Fallback value

interface DailyCoinClaimProps {
  userToken: string;
  onCoinsEarned?: (amount: number) => void;
}

export default function DailyCoinClaim({ userToken, onCoinsEarned }: DailyCoinClaimProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [canClaim, setCanClaim] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [showRewardModal, setShowRewardModal] = useState<boolean>(false);
  const [showAnimation, setShowAnimation] = useState<boolean>(false);
  const [dailyBonusAmount, setDailyBonusAmount] = useState<number>(DEFAULT_BONUS); // Dynamic coin amount
  const { toast } = useToast();
  
  // New function to fetch the daily bonus amount
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


  // Check claim status on mount and set up interval
  useEffect(() => {
    if (!userToken) return;
    
    // 👇 Fetch the bonus amount
    fetchDailyBonusAmount(); 
    checkClaimStatus();
    
    // Check every second for countdown
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        // If remaining time is less than 1 second (1000ms), switch to canClaim
        if (prev <= 1000) {
          if (!canClaim) {
            setCanClaim(true);
          }
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [userToken, canClaim, fetchDailyBonusAmount]); // Added fetchDailyBonusAmount dependency

  const checkClaimStatus = async () => {
    try {
      // NOTE: Assuming apiClient handles authorization using userToken internally
      const response = await apiClient(`${BASE_URL}/api/getUserDetails`, {
        method: "GET",
      });

      if (!response || !response.ok) return;

      const userData = await response.json();
      
      if (userData.lastDailyCoinClaim) {
        const lastClaim = new Date(userData.lastDailyCoinClaim).getTime();
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000; // 24 hours
        const remaining = cooldown - (now - lastClaim);

        if (remaining > 0) {
          setTimeRemaining(remaining);
          setCanClaim(false);
        } else {
          setTimeRemaining(0);
          setCanClaim(true);
        }
      } else {
        // New user - can claim immediately on first visit
        setTimeRemaining(0);
        setCanClaim(true);
      }
    } catch (error) {
      console.error("Error checking claim status:", error);
      // Fallback: If status check fails, allow claiming to avoid soft-lock
      if (timeRemaining <= 0) {
        setCanClaim(true);
      }
    }
  };

  const handleClaimClick = () => {
    // Only show modal if the user is allowed to claim
    if (canClaim && !isClaiming) {
      setShowRewardModal(true);
    }
  };

  const handleConfirmClaim = async () => {
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
        // Use the actual earned amount from the server, falling back to the fetched amount
        
        // Show coin animation
        setShowAnimation(true);

        // Hide modal after animation and reset state
        setTimeout(() => {
          setShowRewardModal(false);
          setShowAnimation(false);
          
          // Reset cooldown states
          setCanClaim(false);
          setTimeRemaining(24 * 60 * 60 * 1000);
          setIsClaiming(false); // Ensure claiming state is reset after delay
        }, 3000);

        // Notify parent immediately
        if (onCoinsEarned) {
          onCoinsEarned(coinsEarned);
        }

        toast({
          title: "🎉 Daily Reward Claimed!",
          description: `You earned ${coinsEarned} coins!`,
        });
      } else {
        // Handle cooldown or other errors from server
        if (data.timeRemainingMs) {
          setTimeRemaining(data.timeRemainingMs);
          setCanClaim(false);
        } else {
          // If server error, re-check status
          checkClaimStatus(); 
        }

        toast({
          title: "Already Claimed",
          description: data.message || "Please wait for the cooldown.",
          variant: "destructive",
        });
        setShowRewardModal(false);
        setIsClaiming(false);
      }
    } catch (error) {
      console.error("Error claiming coins:", error);
      toast({
        title: "Error",
        description: "Failed to claim daily reward. Please try again.",
        variant: "destructive",
      });
      setShowRewardModal(false);
      setIsClaiming(false);
    } 
  };

  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return "Ready!";

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <>
 <Card
  className="
    w-full 
    max-w-8xl
    rounded-[30px]
    bg-transparent
    border-none
    p-2 sm:p-4
  "
>
  <div className="flex items-center justify-between gap-2 sm:gap-4">

    {/* LEFT SECTION */}
    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
      
      <div className="relative flex-shrink-0"> 
          
          {/* Coin Icon - Sizing optimized for small screens */}
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 28 28"
              className="w-full h-full"
            >
              {/* Gold Coin SVG */}
              <circle cx="10" cy="11" r="7" fill="#d97706" />
              <circle cx="10" cy="11" r="6" fill="#fcd34d" />
              <circle cx="10" cy="11" r="3.5" fill="#d97706" opacity="0.4" />
              <circle cx="17" cy="16" r="8" fill="#d97706" />
              <circle cx="17" cy="16" r="7" fill="#fcd34d" />
              <circle cx="17" cy="16" r="4.2" fill="#d97706" opacity="0.4" />
            </svg>
          </div>

          <span className="
            absolute bottom-[-18px] left-2
            bg-emerald-500 rounded-full 
            border-2 border-white/80
            px-2.5 sm:px-3 py-0.5 text-xs sm:text-sm font-bold text-white 
            shadow-lg
            whitespace-nowrap
          ">
            +{dailyBonusAmount}
          </span>
      </div>


      <div className="leading-tight min-w-0 -ml-1">
        <h3 className="text-white font-bold text-lg sm:text-2xl whitespace-nowrap">
          Daily Reward
        </h3>
      </div>
    </div>

    {/* RIGHT SIDE — TIMER / CLAIM BUTTON */}
   <div
  className={`
    flex items-center gap-1 sm:gap-2
    px-3 py-1.5 sm:px-6 sm:py-3
    rounded-full
    min-w-0
    ${
      canClaim 
        ? "bg-yellow-500/10 border-[3px] border-yellow-400 shadow-[0_0_25px_rgba(255,255,0,0.5)] cursor-pointer hover:bg-yellow-500/20 transition-colors"
        : "bg-[#501b9b] shadow-[0_0_15px_rgba(240,171,240,0.4),_0_4px_15px_rgba(0,0,0,0.5)] border border-purple-800/50" // ⭐ ADDED GLOW SHADOW (f0abf0 is the clock color)
    }
  `}
  onClick={handleClaimClick}
>
  {canClaim ? (
    <>
      <Sparkles className={`w-4 h-4 sm:w-6 sm:h-6 ${isClaiming ? "text-gray-400" : "text-yellow-400"}`} /> 
      <span className={`font-bold text-sm sm:text-lg whitespace-nowrap ${isClaiming ? "text-gray-400" : "text-yellow-400"}`}>
        {isClaiming ? 'Claiming...' : 'Claim Now'}
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
</div>

  </div>
</Card>

      {/* Reward Modal Overlay */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4">
            {/* Sparkle Effects */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-sparkle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                >
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>
              ))}
            </div>

            {/* Main Modal Content */}
            <div className="bg-gradient-to-b from-gray-900 to-black rounded-3xl p-8 shadow-2xl border border-yellow-500/30 relative overflow-hidden">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-radial from-yellow-500/20 via-transparent to-transparent"></div>

              {/* Title */}
              <h2 className="text-5xl font-black text-center mb-8 text-yellow-400 tracking-wider relative z-10" style={{ textShadow: '0 0 20px rgba(234, 179, 8, 0.5)' }}>
                REWARD
              </h2>

              {/* Reward Icon */}
              <div className="relative flex justify-center mb-6">
                <div className="relative">
                  {/* Glow Background */}
                  <div className="absolute inset-0 bg-gradient-radial from-white/40 via-white/10 to-transparent blur-3xl scale-150"></div>
                  
                  {/* Main Circle */}
                  <div className="relative w-32 h-32 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl animate-bounce-slow">
                    <Star className="w-16 h-16 text-yellow-400 fill-yellow-400" />
                  </div>

                  {/* Floating Coins Animation */}
                  {showAnimation && (
                    <>
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute animate-float-coin-modal"
                          style={{
                            left: `${Math.random() * 100 - 50}px`,
                            top: `${Math.random() * 100 - 50}px`,
                            animationDelay: `${Math.random() * 0.5}s`,
                          }}
                        >
                          <Coins className="w-6 h-6 text-yellow-400" />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Points Display */}
              <div className="text-center mb-8 relative z-10">
                <p className="text-white text-2xl font-semibold mb-1">Coins</p>
                {/* 👇 Use dynamic amount */}
                <p className="text-yellow-400 text-5xl font-black">x{dailyBonusAmount}</p>
              </div>

              {/* Buttons */}
              <div className="space-y-3 relative z-10">
                <Button
                  onClick={handleConfirmClaim}
                  disabled={isClaiming || showAnimation}
                  className="w-full h-14 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-full shadow-lg"
                >
                  {isClaiming ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Claiming...</span>
                    </div>
                  ) : showAnimation ? (
                    <span>Claimed! 🎉</span>
                  ) : (
                    <span>Claim reward</span>
                  )}
                </Button>

                {!showAnimation && (
                  <button
                    onClick={() => setShowRewardModal(false)}
                    disabled={isClaiming}
                    className="w-full text-white/70 hover:text-white text-sm py-2 transition-colors"
                  >
                    Tap to continue
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS Styles for Animations - Unchanged */}
      <style>{`
        @keyframes float-coin-modal {
          0% {
            transform: translateY(0) scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(-200px) scale(1) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.05);
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-float-coin-modal {
          animation: float-coin-modal 2s ease-out forwards;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </>
  );
}
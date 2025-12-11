import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Star as StarIcon,
  Crown,
  Target,
  Zap,
  ArrowUp,
  X,
  Award,
  Trophy,
} from "lucide-react";
import Confetti from "react-confetti";

// NEW IMPORTS: Assuming these are custom hooks/utilities for preloading
import { preloadQuizSession, isQuizSessionReady } from "@/hooks/useAppPreloader";
import { useUser } from "@/contexts/UserContext"; // <-- NEW: Import useUser context hook

const KNOWLEDGE_GAIN_SOUND_SRC = "/knowledge-point.mp3"; 
const LEVEL_UP_SOUND_SRC = "/player-level-up.mp3";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const QUIZ_COST = 50;


interface QuizResultsProps {
  results: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    categoryName: string;
    categoryId: string;
    completionData: {
      percentageCorrect: number;
      knowledgeGained: number;
      coinsEarned: number; 
      totalCoins: number;   
      totalKnowledge: number;
      previousLevel: number;
      currentLevel: number;
    };
  };
  onPlayAgain: () => void;
  onClose: () => void;
}

const getPerformanceData = (percentage: number) => {
  const score = percentage;

  if (score === 100) {
    return {
      message: "FLAWLESS VICTORY!",
      rank: "LEGENDARY",
      icon: <Crown className="h-8 w-8" />,
      rankColor: "text-emerald-500",
    };
  } else if (score >= 90) {
    return {
    message: "Outstanding Performance!",
      rank: "DIAMOND",
      icon: <Trophy className="h-8 w-8" />,
      rankColor: "text-blue-400",
    };
  } else if (score >= 80) {
    return {
      message: "Excellent Performance!",
      rank: "PLATINUM",
      icon: <Award className="h-8 w-8" />,
      rankColor: "text-indigo-500",
    };
  } else if (score >= 70) {
    return {
      message: "Great Job!",
      rank: "GOLD",
      icon: <Zap className="h-8 w-8" />,
      rankColor: "text-purple-400",
    };
  } else if (score >= 50) {
    return {
      message: "Keep Pushing!",
      rank: "BRONZE",
      icon: <Target className="h-8 w-8" />,
      rankColor: "text-orange-600",
    };
  } else {
    return {
      message: "Time to Review!",
      rank: "ROOKIE",
      icon: <Target className="h-8 w-8" />,
      rankColor: "text-red-500",
    };
  }
};

// Extracted Knowledge Point Icon SVG for reuse
const KnowledgePointIcon = ({ className }: { className: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.4 1-1v-1H9v1z" />
      <path d="M12 2C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.2 3-3.3 3-5.7 0-3.9-3.1-7-7-7z" />
      <circle cx="12" cy="9" r="2" fill="#fff" />
    </svg>
);

// Extracted Coin Icon SVG for reuse
const CoinIcon = ({ className }: { className: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
    >
      <circle cx="8" cy="9" r="5" fill="#f59e0b" />
      <circle cx="8" cy="9" r="4" fill="#fbbf24" />
      <circle cx="8" cy="9" r="2.5" fill="#f59e0b" opacity="0.4" />
      <circle cx="14" cy="13" r="6" fill="#f59e0b" />
      <circle cx="14" cy="13" r="5" fill="#fbbf24" />
      <circle cx="14" cy="13" r="3" fill="#f59e0b" opacity="0.4" />
      <text x="14" y="15.5" fontSize="6" fontWeight="bold" fill="#d97706" textAnchor="middle">$</text>
    </svg>
);


export default function QuizResults({ results, onPlayAgain, onClose }: QuizResultsProps) {
  const userToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const { refreshUser } = useUser(); // <-- NEW: Access context hook to refresh stats globally

  const {
    correctAnswers,
    incorrectAnswers,
    categoryName,
    categoryId,
    totalQuestions,
    completionData,
  } = results;

  const {
    percentageCorrect,
    knowledgeGained,
    coinsEarned,
    totalCoins,   
    totalKnowledge,
    previousLevel,
    currentLevel,
  } = completionData;

  // NEW STATE FOR PRELOADING
  const [nextCategoryId, setNextCategoryId] = useState<string | null>(null);
  const [hasPreloadedNext, setHasPreloadedNext] = useState(false);

  const percentage = Math.min(Math.max(percentageCorrect, 0), 100);
  const hasLeveledUp = currentLevel > previousLevel;

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [mounted, setMounted] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  
  // XP STATE
  const [animatedKnowledge, setAnimatedKnowledge] = useState(0);
  const [animatedTotalXP, setAnimatedTotalXP] = useState(totalKnowledge - knowledgeGained);
  const [showXPOverlay, setShowXPOverlay] = useState(false); // Changed to false by default
  const [showFlyingTokens, setShowFlyingTokens] = useState(false);
  const [tokens, setTokens] = useState<Array<{id: number; delay: number}>>([]);
  
  // COIN STATE
  const [showCoinOverlay, setShowCoinOverlay] = useState(false); 
  const [animatedCoins, setAnimatedCoins] = useState(0);
  const [animatedTotalCoins, setAnimatedTotalCoins] = useState(totalCoins - coinsEarned);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);
  const [coinTokens, setCoinTokens] = useState<Array<{id: number; delay: number}>>([]);

  const [showLevelUp, setShowLevelUp] = useState(false);
  
  const earnedPointsRef = useRef<HTMLDivElement>(null);
  const earnedCoinsRef = useRef<HTMLDivElement>(null); 
  const headerXPRef = useRef<HTMLDivElement>(null);
  const headerCoinRef = useRef<HTMLDivElement>(null); 

  const [knowledgeGainAudio] = useState(
    typeof Audio !== "undefined" ? new Audio(KNOWLEDGE_GAIN_SOUND_SRC) : null
  );
  
  const [levelUpAudio] = useState(
    typeof Audio !== "undefined" ? new Audio(LEVEL_UP_SOUND_SRC) : null
  );

  useEffect(() => {
    // Scroll to top when the component mounts
    if (typeof window !== "undefined") {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    setMounted(true);
    // Setup for dynamic window size tracking, essential for the Confetti component
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  // NEW EFFECT: Start preloading the next quiz after a delay
  useEffect(() => {
    // Start preloading the next quiz after a short delay
    const timer = setTimeout(() => {
      fetchAndPreloadNextCategory();
    }, 2000); // Wait 2 seconds to let animations settle

    return () => clearTimeout(timer);
  }, [userToken, categoryId]);

  // NEW FUNCTION: Fetch and preload the next category
  const fetchAndPreloadNextCategory = async () => {
    if (!userToken || hasPreloadedNext) return;
    
    try {
      console.log("🎯 Fetching next category for preload...");
      const response = await fetch(`${BASE_URL}/api/getGetegoryToPlay?exclude=${categoryId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.categoryId) {
          setNextCategoryId(data.categoryId);
          console.log("✅ Next category ID:", data.categoryId);
          
          // Preload the quiz session
          const success = await preloadQuizSession(data.categoryId);
          if (success) {
            setHasPreloadedNext(true);
            console.log("✅ Next quiz preloaded successfully!");
          }
        }
      }
    } catch (error) {
      console.error("❌ Error preloading next quiz:", error);
    }
  };

  // Animated score counter
  useEffect(() => {
    const scoreTimer = setTimeout(() => {
      const interval = setInterval(() => {
        setAnimatedScore(prev => {
          if (prev >= percentage) {
            clearInterval(interval);
            
            // Start the XP reward animation sequence immediately after score is done
            if (knowledgeGained > 0) {
                startXPAnimation();
            } else {
                // If no XP, jump directly to coin animation check
                startCoinAnimation(); 
            }
            return percentage;
          }
          return prev + Math.ceil((percentage - prev) / 10);
        });
      }, 30);
      return () => clearInterval(interval);
    }, 300);

    return () => clearTimeout(scoreTimer);
  }, [percentage, knowledgeGained]); 
  
  // NEW FUNCTION: Updates the global user context with the final stats
  const updateGameStats = () => {
       console.log("🚀 Refreshing global user stats after quiz completion.");
       // The refreshUser function will re-fetch the user's latest data from the backend
       // and update the useUser context, which GameStatsHeader in Home.tsx consumes.
       refreshUser(); 
  };
  
  // ----------------------------------------------------
  // REWARD ANIMATION SEQUENCE FUNCTIONS
  // ----------------------------------------------------

  const startXPAnimation = () => {
    // 1. Show XP Overlay
    setShowXPOverlay(true); 

    // Points earned animation
    const earnedTimer = setTimeout(() => {
      let count = 0;
      const interval = setInterval(() => {
        count += Math.ceil(knowledgeGained / 15);
        if (count >= knowledgeGained) {
          count = knowledgeGained;
          clearInterval(interval);
          
          setTimeout(() => {
            startXPTokenAnimation(); // <-- CALL XP TOKEN ANIMATION
          }, 800);
        }
        setAnimatedKnowledge(count);
      }, 60);
      return () => clearInterval(interval);
    }, 500);

    return () => clearTimeout(earnedTimer);
  }

  // XP Token flying animation - Refactored from startTokenAnimation
  const startXPTokenAnimation = () => {
    const earnedRect = earnedPointsRef.current?.getBoundingClientRect();
    const headerRect = headerXPRef.current?.getBoundingClientRect();

    if (!earnedRect || !headerRect) {
      setAnimatedTotalXP(totalKnowledge);
      startCoinAnimation(); // If refs fail, skip token animation and move to Coins
      return;
    }

    const startX = earnedRect.left + earnedRect.width / 2;
    const startY = earnedRect.top + earnedRect.height / 2;
    const endX = headerRect.left + headerRect.width / 2;
    const endY = headerRect.top + headerRect.height / 2;
    
    const tokenCount = Math.min(15, Math.max(8, knowledgeGained / 8));
    const newTokens = Array.from({ length: Math.floor(tokenCount) }, (_, i) => ({
      id: i,
      delay: i * 80,
    }));

    setTokens(newTokens);
    setShowFlyingTokens(true);

    const startXP = totalKnowledge - knowledgeGained;
    let currentXP = startXP;
    const per = Math.max(1, Math.round(knowledgeGained / tokenCount));
    let tokenIndex = 0;
    
    const xpTimer = setInterval(() => {
      if (tokenIndex < tokenCount) {
        currentXP += per;
        tokenIndex++;
      } else {
        currentXP = totalKnowledge;
        clearInterval(xpTimer);
        
        // Trigger Coin Animation after XP is done
        setTimeout(() => {
            setShowFlyingTokens(false);
            setShowXPOverlay(false); // Hide XP overlay permanently
            startCoinAnimation(); // <-- TRIGGER COIN ANIMATION
        }, 200); 

      }

      setAnimatedTotalXP(Math.min(currentXP, totalKnowledge));
      
      if (knowledgeGainAudio) {
        const audioClone = knowledgeGainAudio.cloneNode(true) as HTMLAudioElement;
        audioClone.volume = 0.2;
        audioClone.play().catch(e => console.log("Audio play failed:", e));
      }
    }, 150);

    // Set CSS variables for XP token animation
    document.documentElement.style.setProperty('--xp-token-start-x', `${startX}px`);
    document.documentElement.style.setProperty('--xp-token-start-y', `${startY}px`);
    document.documentElement.style.setProperty('--xp-token-end-x', `${endX}px`);
    document.documentElement.style.setProperty('--xp-token-end-y', `${endY}px`);
  };

  // New function to handle the coin animation sequence
  const startCoinAnimation = () => {
    // If no coins were earned, skip to the level up check
    if (coinsEarned <= 0) {
        finishRewardSequence();
        return;
    }
    
    // 1. Show Coin Overlay
    setShowCoinOverlay(true); 

    // 2. Animate Coin Count
    const earnedTimer = setTimeout(() => {
        let count = 0;
        const interval = setInterval(() => {
            count += Math.ceil(coinsEarned / 15);
            if (count >= coinsEarned) {
                count = coinsEarned;
                clearInterval(interval);
                
                setTimeout(() => {
                    startCoinTokenAnimation(); // <-- TRIGGER COIN TOKEN ANIMATION
                }, 800);
            }
            setAnimatedCoins(count);
        }, 60);
        return () => clearInterval(interval);
    }, 300); // Wait a short time to start coin count

    return () => clearTimeout(earnedTimer);
  };


// New function for coin flying tokens
  const startCoinTokenAnimation = () => {
    const earnedRect = earnedCoinsRef.current?.getBoundingClientRect();
    const headerRect = headerCoinRef.current?.getBoundingClientRect();

    if (!earnedRect || !headerRect) {
      setAnimatedTotalCoins(totalCoins);
      finishRewardSequence(); // If refs fail, skip token animation and finish
      return;
    }

    const startX = earnedRect.left + earnedRect.width / 2;
    const startY = earnedRect.top + earnedRect.height / 2;
    const endX = headerRect.left + headerRect.width / 2;
    const endY = headerRect.top + headerRect.height / 2;
    
    // Coin token count is based on coinsEarned
    const tokenCount = Math.min(15, Math.max(8, coinsEarned / 8));
    const newTokens = Array.from({ length: Math.floor(tokenCount) }, (_, i) => ({
      id: i,
      delay: i * 80,
    }));

    setCoinTokens(newTokens);
    setShowFlyingCoins(true);

    const startCoins = totalCoins - coinsEarned;
    let currentCoins = startCoins;
    const per = Math.max(1, Math.round(coinsEarned / tokenCount));
    let tokenIndex = 0;
    
    const coinTimer = setInterval(() => {
      if (tokenIndex < tokenCount) {
        currentCoins += per;
        tokenIndex++;
      } else {
        currentCoins = totalCoins;
        clearInterval(coinTimer);
        
        // Finish Sequence after Coins are done
        setTimeout(() => {
            setShowFlyingCoins(false);
            setShowCoinOverlay(false); // Hide coin overlay permanently
            finishRewardSequence(); // <-- FINAL STEP
        }, 200); 

      }

      setAnimatedTotalCoins(Math.min(currentCoins, totalCoins));
      
      // Re-use knowledge gain sound for coins for simplicity
      if (knowledgeGainAudio) {
        const audioClone = knowledgeGainAudio.cloneNode(true) as HTMLAudioElement;
        audioClone.volume = 0.2;
        audioClone.play().catch(e => console.log("Audio play failed:", e));
      }
    }, 150);

    // Set CSS variables for Coin token animation
    document.documentElement.style.setProperty('--coin-token-start-x', `${startX}px`);
    document.documentElement.style.setProperty('--coin-token-start-y', `${startY}px`);
    document.documentElement.style.setProperty('--coin-token-end-x', `${endX}px`);
    document.documentElement.style.setProperty('--coin-token-end-y', `${endY}px`);
  };

  // New function to handle the final check after all rewards
  const finishRewardSequence = () => {
      // Level up check
      if (hasLeveledUp) {
        setTimeout(() => {
          setShowLevelUp(true);
          if (levelUpAudio) {
            levelUpAudio.volume = 0.5;
            levelUpAudio.play().catch(e => console.log("Level Up Audio failed:", e));
          }
        }, 300);
      }
      
      // CALL THE UPDATE FUNCTION HERE TO REFRESH THE USER STATS
      updateGameStats(); 
  };
  
  // ----------------------------------------------------
  // END REWARD ANIMATION SEQUENCE FUNCTIONS
  // ----------------------------------------------------
  
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState<boolean>(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingMessage, setRatingMessage] = useState<string | null>(null);
  const [playButtonLoading, setPlayButtonLoading] = useState(false);

  // REPLACED handleNextQuiz function with the one supporting preloading logic
  const handleNextQuiz = async () => {
    if (!userToken) {
      console.error("User must be logged in to play the next quiz.");
      setRatingMessage("You must be logged in to play the next quiz.");
      return;
    }

    // If we have a preloaded category, use it immediately
    if (nextCategoryId && isQuizSessionReady(nextCategoryId)) {
      console.log("🚀 Using preloaded next quiz - Instant navigation!");
      window.location.href = `/quiz/${nextCategoryId}`;
      return;
    }

    // Fallback: Fetch and navigate normally
    console.log("⚠️ No preloaded quiz, fetching...");
    setPlayButtonLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/getGetegoryToPlay?exclude=${categoryId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get category to play: ${response.status}`);
      }

      const data = await response.json();

      if (data.categoryId) {
        window.location.href = `/quiz/${data.categoryId}`;
      } else {
        throw new Error("No category ID returned from server");
      }
    }catch (error: unknown) {
  if (error instanceof Error) {
    console.error("Error getting category to play:", error);
    setRatingMessage(`Error playing next quiz: ${error.message}`);
  } else {
    console.error("Unknown error:", error);
    setRatingMessage("An unknown error occurred while playing the next quiz.");
  }
} finally {
  setPlayButtonLoading(false);
}
  };

  const handleRatingSubmit = async (value: number) => {
    if (!userToken) {
      setRatingMessage("You must be logged in to submit a rating.");
      return;
    }
    if (hasRated || isSubmittingRating) return;

    setIsSubmittingRating(true);
    setRatingMessage(null);

    try {
      const res = await fetch(`${BASE_URL}/api/categories/${categoryId}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ rating: value }),
      });

      if (res.ok) {
        setRating(value);
        setHasRated(true);
        setRatingMessage("Thanks for your feedback!");
        
        if (navigator.vibrate) {
          navigator.vibrate([50, 30, 50]);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setRatingMessage(err?.message || "Failed to submit rating.");
        console.error("Rating error:", err);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      setRatingMessage("Network error while submitting rating.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const performanceData = useMemo(() => getPerformanceData(percentage), [percentage]);
  
  if (!mounted) {
    return null;
  }

  return (
    <div className="h-screen w-full z-50 flex flex-col items-center p-2 sm:p-4 font-sans bg-gradient-to-br from-[#100221] via-[#4f187a] to-[#380d67] overflow-hidden">
      
      {/* Header with Stats (The XP target) */}
      <div className="w-full max-w-lg flex-shrink-0 animate-fade-in-down">
        <div className="flex items-center justify-between p-2 sm:p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 backdrop-blur-sm">
          {/* Stat Item: Coins - TARGET FOR COIN TOKENS */}
          <div ref={headerCoinRef} className="flex items-center gap-1 sm:gap-1.5 relative">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <CoinIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-slate-200 tabular-nums">{animatedTotalCoins}</div>
            </div>
          </div>

           {/* Stat Item - XP - TARGET FOR XP TOKENS */}
           <div ref={headerXPRef} className="flex items-center gap-1 sm:gap-1.5 relative">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center transition-all duration-300">
              <KnowledgePointIcon className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-yellow-400 tabular-nums">{animatedTotalXP}</div>
            </div>
          </div>
          
          {/* Stat Item: Badges */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-cyan-400"
              >
                <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
                <path d="m6 3 6 6 6-6" />
                <path d="m2 9 10 12 10-12" />
              </svg>
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-slate-200">0</div>
            </div>
          </div>
                
          {/* Stat Item: Gems */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4 text-purple-500"
              >
                <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
                <path d="m6 3 6 6 6-6" fill="#fff" fillOpacity="0.3" />
                <path d="m2 9 10 12 10-12" fill="#fff" fillOpacity="0.2" />
              </svg>
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-slate-200">0</div>
            </div>
          </div>
        </div>
      </div>

      {/* Confetti */}
      {(percentage >= 80 || hasLeveledUp) && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={percentage === 100 ? 300 : hasLeveledUp ? 200 : 100}
          gravity={0.08}
          colors={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#fbbf24']}
        />
      )}

      {/* Level Up Modal */}
      {showLevelUp && hasLeveledUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <Card className="bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 border-4 border-purple-300 p-6 text-center max-w-xs mx-2 animate-level-up-popup shadow-2xl shadow-purple-500/50">
            <div className="space-y-4">
              <Crown className="h-14 w-14 sm:h-16 sm:w-16 mx-auto text-yellow-300 animate-crown-bounce drop-shadow-glow" />
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-1 animate-text-glow">
                  LEVEL UP!
                </h2>
                <p className="text-lg sm:text-xl font-bold text-white mb-2">
                  Congratulations!
                </p>
                <div className="flex items-center justify-center gap-2 text-xl sm:text-2xl font-bold text-white">
                  <span className="text-base opacity-60">{previousLevel}</span>
                  <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6 animate-bounce" />
                  <span className="animate-scale-up">{currentLevel}</span>
                </div>
              </div>
              <Button
              variant="default"
                onClick={() => setShowLevelUp(false)} >
                AWESOME!
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main Results Card Container - Takes remaining space */}
      <div className="relative z-10 w-full max-w-lg mx-auto flex-1 flex flex-col min-h-0 mt-3">
        <Card className="relative overflow-hidden bg-gradient-to-br from-[#100321] via-[#2d1b4e] to-[#380d67] backdrop-blur-xl border-2 border-slate-700/50 shadow-2xl animate-scale-in flex-1 flex flex-col">
          
          {/* Close Button */}
          <Link
            to={"/"}
            className="absolute top-3 right-3 z-20 h-8 w-8 bg-red-600 hover:bg-red-700 rounded-full transition-colors flex items-center justify-center shadow-lg"
            aria-label="Close Results and go to Categories"
          >
            <X className="h-5 w-5 text-white" />
          </Link>
          
          {/* Content Wrapper - Scrollable */}
          <div className="relative z-10 p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
            
            {/* Header */}
            <div className="text-center space-y-2 sm:space-y-3 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700/40 border border-slate-600/30 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-bold text-slate-300">{categoryName}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-wide">
                MISSION COMPLETE!
              </h1>
            </div>

            {/* Results Content */}
            <div className="space-y-3 sm:space-y-4 animate-fade-in pt-8">
              {/* Results Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {/* Correct/Incorrect */}
                <Card className="bg-slate-800/40 border border-slate-700/50 p-3 sm:p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1 sm:mb-2">Result</div>
                  <div className="space-y-2 sm:space-y-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                      <div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-400">{correctAnswers}</div>
                        <div className="text-xs text-emerald-500/70">CORRECT</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                      <div>
                        <div className="text-xl sm:text-2xl font-black text-red-400">{incorrectAnswers}</div>
                        <div className="text-xs text-red-500/70">INCORRECT</div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Accuracy Circle */}
                <Card className="bg-slate-800/40 border border-slate-700/50 p-3 sm:p-4 flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative inline-block mb-2">
                      <svg className="w-14 h-14 sm:w-18 sm:h-18 transform -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r="24"
                          stroke="currentColor"
                          className="text-slate-700"
                          strokeWidth="6"
                          fill="none"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r="24"
                          stroke="url(#accuracyGradient)"
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 24}`}
                          strokeDashoffset={`${2 * Math.PI * 24 * (1 - animatedScore / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                        <defs>
                          <linearGradient id="accuracyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg sm:text-xl font-black text-slate-100">{animatedScore}%</span>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Accuracy</div>
                    <div className="text-xs text-slate-600 font-bold">{performanceData.rank}</div>
                  </div>
                </Card>
              </div>

              {/* Level Badge */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 p-2 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                <Crown className="h-5 w-5 sm:h-6 text-purple-400" />
                <div className="flex flex-row gap-3 items-center">
                  <div className="text-xs text-slate-500 uppercase">Level</div>
                  <div className="text-xl sm:text-2xl font-black text-slate-200">{currentLevel}</div>
                </div>
                {hasLeveledUp && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-0.5 animate-pulse">
                    UP!
                  </Badge>
                )}
              </div>

              {/* Rating */}
              <Card className="bg-slate-800/40 border border-slate-700/50 p-2 sm:p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-bold text-slate-500 uppercase">
                    Rate This Quiz
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        disabled={hasRated || isSubmittingRating}
                        onClick={() => handleRatingSubmit(star)}
                        onMouseEnter={() => !hasRated && setHoveredRating(star)}
                        onMouseLeave={() => !hasRated && setHoveredRating(0)}
                        className={`transition-all duration-200 transform ${
                          hasRated || isSubmittingRating ? "cursor-default" : "cursor-pointer hover:scale-125"
                        }`}
                      >
                        <StarIcon
                          className={`h-4 w-4 transition-all ${
                            star <= (hoveredRating || rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-slate-600 hover:text-yellow-400/60"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                {ratingMessage && (
                  <div className={`text-xs ${
                    ratingMessage.includes("Thanks") ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {ratingMessage}
                  </div>
                )}
              </Card>

              {/* Next Quiz Button - UPDATED for preloading */}
            <Button
              onClick={handleNextQuiz}
              onMouseEnter={fetchAndPreloadNextCategory} // ADDED: Trigger preload on hover
              disabled={playButtonLoading}
              className="w-full flex items-center justify-between px-6 h-16 sm:h-20 text-white shadow-lg transition-all duration-300 hover:scale-[1.02]"
            >
              {playButtonLoading ? (
                <div className="flex items-center text-xl sm:text-2xl justify-center w-full gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white leading-none">
                      Next Quiz
                    </span>
                    <span className="text-base sm:text-lg font-semibold text-yellow-300 flex items-center gap-1.5 bg-gray-700/70 px-3 py-1.5 rounded-full">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="8" fill="#f59e0b" />
                        <circle cx="12" cy="12" r="7" fill="#fbbf24" />
                        <circle cx="12" cy="12" r="4" fill="#f59e0b" opacity="0.4" />
                      </svg>
                      {QUIZ_COST}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <svg
                      className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </>
              )}
            </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* XP EARNED OVERLAY (Reference style) */}
      {showXPOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
            <div 
                ref={earnedPointsRef} 
                className="py-4 sm:py-8 text-center space-y-3 sm:space-y-4 animate-pop-in"
            >
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full
                 bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-300/50 animate-pulse-glow">
                  <KnowledgePointIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <div className="
                    text-5xl sm:text-6xl font-black
                    tabular-nums animate-number-grow
                    text-amber-400 outlined-text amber-glow
                  ">
                    {animatedKnowledge}
                  </div>

                  <div className="text-yellow-400/80 font-bold text-sm sm:text-base mt-1 sm:mt-2">
                    XP EARNED
                  </div>
                </div>
            </div>
        </div>
      )}
      
      {/* COIN EARNED OVERLAY (MODIFIED to match XP style) */}
      {showCoinOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
            <div 
                ref={earnedCoinsRef} 
                className="py-4 sm:py-8 text-center space-y-3 sm:space-y-4 animate-pop-in"
            >
                {/* ICON CONTAINER: Changed to use gold gradient and the existing yellow glow animation */}
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-amber-500/50 animate-pulse-glow">
                  {/* Icon size remains the same, but the inner CoinIcon SVG is already gold/yellow */}
                  <CoinIcon className="h-7 w-7 sm:h-8 sm:w-8" />
                </div>
                <div>
                  {/* COIN COUNT: Changed gradient to gold/yellow and uses the modified coin-text-aura */}
                  <div className="
                  text-5xl sm:text-6xl font-extrabold
                  tabular-nums animate-number-grow
                  text-amber-400 outlined-text amber-glow
                ">
                  {animatedCoins}
                </div>

                  {/* SUBTITLE: Changed color to amber-400 */}
                  <div className="text-amber-400/80 font-bold text-sm sm:text-base mt-1 sm:mt-2">
                    COINS EARNED
                  </div>
                </div>
            </div>
        </div>
      )}

    {/* Flying XP Tokens */}
    {showFlyingTokens && tokens.map((token) => (
      <div
        key={token.id}
        className="xp-token"
        style={{
          ['--xp-token-delay']: `${token.delay}ms`,
        } as Record<string, string>}
      />
    ))}


        {/* Flying Coin Tokens */}
    {showFlyingCoins && coinTokens.map((token) => (
      <div
        key={token.id}
        className="coin-token"
        style={{
          '--coin-token-delay': `${token.delay}ms`,
        } as Record<string, string>}
      >
        {/* Embed the Coin Icon inside the flying div */}
        <CoinIcon className="h-full w-full p-[2px] transition-all duration-700" />
      </div>
    ))}


      {/* CSS Animations and Styles */}
      <style>{`
        /* ... existing keyframes ... */
        @keyframes scale-in {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fade-in-down {
          0% { transform: translateY(-20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes fade-in-up {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        @keyframes level-up-popup {
          0% { transform: scale(0.4) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.05) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        
        @keyframes crown-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(-5deg); }
          75% { transform: translateY(-10px) rotate(5deg); }
        }
        
        @keyframes text-glow {
          0%, 100% { text-shadow: 0 0 20px rgba(255, 255, 255, 0.5); }
          50% { text-shadow: 0 0 30px rgba(255, 255, 255, 0.8); }
        }
        
        @keyframes scale-up {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1.2); opacity: 1; }
        }
        
        /* Gold/Yellow Pulse Glow (Reused for both XP and Coins) */
        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 40px rgba(251, 191, 36, 0.8);
            transform: scale(1.05);
          }
        }
        
        /* Removed pulse-glow-cyan keyframes, using pulse-glow instead */

        @keyframes number-grow {
          0% { 
            transform: scale(0.5);
            opacity: 0;
          }
          60% { 
            transform: scale(1.1);
          }
          100% { 
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .animate-number-grow {
          animation: number-grow 0.8s ease-out forwards;
        }
        
        /* XP Text Aura (Yellow/Orange Glow) - IMPROVED READABILITY */
        .xp-text-aura {
          text-shadow: 
            -1px -1px 0 #000, 
            1px -1px 0 #000, 
            -1px 1px 0 #000, 
            1px 1px 0 #000, /* Strong Black Outline */
            0 0 10px rgba(255, 193, 7, 0.9),
            0 0 20px rgba(255, 165, 0, 0.7),
            0 0 30px rgba(255, 140, 0, 0.5);
        }
        
        /* Coin Text Aura (MODIFIED to match XP's Gold/Yellow Glow) - IMPROVED READABILITY */
        .coin-text-aura { 
          text-shadow: 
            -1px -1px 0 #000, 
            1px -1px 0 #000, 
            -1px 1px 0 #000, 
            1px 1px 0 #000, /* Strong Black Outline */
            0 0 10px rgba(255, 193, 7, 0.9), /* Yellow */
            0 0 20px rgba(255, 165, 0, 0.7), /* Orange */
            0 0 30px rgba(255, 140, 0, 0.5); /* Dark Orange */
        }

        /* Flying Token Animation - XP Tokens */
        .xp-token { 
          position: fixed;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #FFF 0%, #FCD34D 25%, #F59E0B 50%, #D97706 75%);
          box-shadow: 
            0 0 0 3px rgba(251, 191, 36, 0.4),
            0 0 20px rgba(251, 191, 36, 0.6),
            0 10px 30px rgba(0, 0, 0, 0.4);
          z-index: 60;
          opacity: 0;
          pointer-events: none;
          animation: fly-token-xp 1200ms cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--xp-token-delay, 0ms) forwards; 
        }
        
       @keyframes fly-token-xp { 
          0% {
            opacity: 0;
            left: var(--xp-token-start-x, 50vw);
            top: var(--xp-token-start-y, 50vh);
            transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
          }
          
          10% {
            opacity: 1;
            left: var(--xp-token-start-x, 50vw);
            top: var(--xp-token-start-y, 50vh);
            transform: translate(-50%, -50%) scale(1.2) rotate(180deg);
          }
          
          15% {
            left: var(--xp-token-start-x, 50vw);
            top: var(--xp-token-start-y, 50vh);
            transform: translate(-50%, -50%) scale(1) rotate(180deg);
          }
          
          85% {
            opacity: 1;
            left: var(--xp-token-end-x, 50vw);
            top: var(--xp-token-end-y, 50vh);
            transform: translate(-50%, -50%) scale(0.8) rotate(900deg);
          }
          
          95% {
            opacity: 0.8;
            left: var(--xp-token-end-x, 50vw);
            top: var(--xp-token-end-y, 50vh);
            transform: translate(-50%, -50%) scale(1.3) rotate(1080deg);
          }
          
          100% {
            opacity: 0;
            left: var(--xp-token-end-x, 50vw);
            top: var(--xp-token-end-y, 50vh);
            transform: translate(-50%, -50%) scale(0.1) rotate(1080deg);
          }
        }
        
        /* Flying Token Animation - Coin Tokens */
        .coin-token { 
          position: fixed;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          
          /* Gold/Yellow background for consistency */
          background-color: #FCD34D; 
          border: 1px solid #D97706; 
          box-shadow: 
            0 0 0 3px rgba(251, 191, 36, 0.2),
            0 0 10px rgba(251, 191, 36, 0.4),
            0 5px 15px rgba(0, 0, 0, 0.3);
            
          z-index: 60;
          opacity: 0;
          pointer-events: none;
          
          display: flex; 
          align-items: center; 
          justify-content: center; 
          
          animation: fly-token-coin 1200ms cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--coin-token-delay, 0ms) forwards; 
        }
        
        @keyframes fly-token-coin { 
          0% {
            opacity: 0;
            left: var(--coin-token-start-x, 50vw);
            top: var(--coin-token-start-y, 50vh);
            transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
          }
          
          10% {
            opacity: 1;
            left: var(--coin-token-start-x, 50vw);
            top: var(--coin-token-start-y, 50vh);
            transform: translate(-50%, -50%) scale(1.2) rotate(-180deg);
          }
          
          15% {
            left: var(--coin-token-start-x, 50vw);
            top: var(--coin-token-start-y, 50vh);
            transform: translate(-50%, -50%) scale(1) rotate(-180deg);
          }
          
          85% {
            opacity: 1;
            left: var(--coin-token-end-x, 50vw);
            top: var(--coin-token-end-y, 50vh);
            transform: translate(-50%, -50%) scale(0.8) rotate(-900deg);
          }
          
          95% {
            opacity: 0.8;
            left: var(--coin-token-end-x, 50vw);
            top: var(--coin-token-end-y, 50vh);
            transform: translate(-50%, -50%) scale(1.3) rotate(-1080deg);
          }
          
          100% {
            opacity: 0;
            left: var(--coin-token-end-x, 50vw);
            top: var(--coin-token-end-y, 50vh);
            transform: translate(-50%, -50%) scale(0.1) rotate(-1080deg);
          }
        }
        
        .animate-fade-in-down { animation: fade-in-down 0.6s ease-out; }
        .animate-scale-in { animation: scale-in 0.5s ease-out; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out; }
        .animate-pop-in { animation: pop-in 0.6s ease-out; }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-level-up-popup { animation: level-up-popup 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        .animate-crown-bounce { animation: crown-bounce 2s ease-in-out infinite; }
        .animate-text-glow { animation: text-glow 2s ease-in-out infinite; }
        .animate-scale-up { animation: scale-up 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}
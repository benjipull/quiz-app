import { useState, useEffect, useMemo, useRef } from "react";
// Assuming you use react-router-dom for navigation:
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

const KNOWLEDGE_GAIN_SOUND_SRC = "/knowledge-point.mp3"; 
const LEVEL_UP_SOUND_SRC = "/player-level-up.mp3";

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

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
      message: "Nearly Perfect!",
      rank: "DIAMOND",
      icon: <Trophy className="h-8 w-8" />,
      rankColor: "text-cyan-500",
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

export default function QuizResults({ results, onPlayAgain, onClose }: QuizResultsProps) {
  const userToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;

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
    totalKnowledge,
    previousLevel,
    currentLevel,
  } = completionData;

  const percentage = Math.min(Math.max(percentageCorrect, 0), 100);
  const hasLeveledUp = currentLevel > previousLevel;

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [mounted, setMounted] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedKnowledge, setAnimatedKnowledge] = useState(0);
  const [animatedTotalXP, setAnimatedTotalXP] = useState(totalKnowledge - knowledgeGained);
  const [showPointsCenter, setShowPointsCenter] = useState(true);
  const [showFlyingTokens, setShowFlyingTokens] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [tokens, setTokens] = useState<Array<{id: number; delay: number}>>([]);
  
  const earnedPointsRef = useRef<HTMLDivElement>(null);
  const headerXPRef = useRef<HTMLDivElement>(null);

  const [knowledgeGainAudio] = useState(
    typeof Audio !== "undefined" ? new Audio(KNOWLEDGE_GAIN_SOUND_SRC) : null
  );
  
  const [levelUpAudio] = useState(
    typeof Audio !== "undefined" ? new Audio(LEVEL_UP_SOUND_SRC) : null
  );

  useEffect(() => {
    setMounted(true);
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Animated score counter
  useEffect(() => {
    const scoreTimer = setTimeout(() => {
      const interval = setInterval(() => {
        setAnimatedScore(prev => {
          if (prev >= percentage) {
            clearInterval(interval);
            return percentage;
          }
          return prev + Math.ceil((percentage - prev) / 10);
        });
      }, 30);
      return () => clearInterval(interval);
    }, 300);

    return () => clearTimeout(scoreTimer);
  }, [percentage]);

  // Points earned animation
  useEffect(() => {
    const earnedTimer = setTimeout(() => {
      let count = 0;
      const interval = setInterval(() => {
        count += Math.ceil(knowledgeGained / 15);
        if (count >= knowledgeGained) {
          count = knowledgeGained;
          clearInterval(interval);
          
          setTimeout(() => {
            setShowPointsCenter(false);
            startTokenAnimation();
          }, 800);
        }
        setAnimatedKnowledge(count);
      }, 60);
      return () => clearInterval(interval);
    }, 500);

    return () => clearTimeout(earnedTimer);
  }, [knowledgeGained]);

  // Token flying animation
  const startTokenAnimation = () => {
    const earnedRect = earnedPointsRef.current?.getBoundingClientRect();
    const headerRect = headerXPRef.current?.getBoundingClientRect();

    if (!earnedRect || !headerRect) {
      setAnimatedTotalXP(totalKnowledge);
      if (hasLeveledUp) {
        setTimeout(() => setShowLevelUp(true), 300);
      }
      return;
    }

    const startX = earnedRect.left + earnedRect.width / 2;
    const startY = earnedRect.top + earnedRect.height / 2;
    const endX = headerRect.left + headerRect.width / 2;
    const endY = headerRect.top + headerRect.height / 2;
    
    const tokenCount = Math.min(12, Math.max(6, knowledgeGained / 10));
    const newTokens = Array.from({ length: Math.floor(tokenCount) }, (_, i) => ({
      id: i,
      delay: 50 + i * 40
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
        
        setTimeout(() => setShowFlyingTokens(false), 200);

        if (hasLeveledUp) {
          setTimeout(() => {
            setShowLevelUp(true);
            if (levelUpAudio) {
              levelUpAudio.volume = 0.5;
              levelUpAudio.play().catch(e => console.log("Level Up Audio failed:", e));
            }
          }, 300);
        }
      }

      setAnimatedTotalXP(Math.min(currentXP, totalKnowledge));
      
      if (knowledgeGainAudio) {
        const audioClone = knowledgeGainAudio.cloneNode(true) as HTMLAudioElement;
        audioClone.volume = 0.15;
        audioClone.play().catch(e => console.log("Audio play failed:", e));
      }
    }, 120);

    document.documentElement.style.setProperty('--token-start-x', `${startX}px`);
    document.documentElement.style.setProperty('--token-start-y', `${startY}px`);
    document.documentElement.style.setProperty('--token-end-x', `${endX}px`);
    document.documentElement.style.setProperty('--token-end-y', `${endY}px`);
  };

  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState<boolean>(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingMessage, setRatingMessage] = useState<string | null>(null);
  const [playButtonLoading, setPlayButtonLoading] = useState(false);

  const handleNextQuiz = async () => {
    if (!userToken) {
      alert("You must be logged in to play.");
      return;
    }

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
    } catch (error: any) {
      console.error("Error getting category to play:", error);
      alert(`Error: ${error.message}`);
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
    // Main container ensures scrollability for smaller screens
    <div className="fixed inset-0 z-50 flex flex-col items-center p-3 sm:p-4 font-sans bg-slate-900/100 overflow-y-auto">
      
      {/* Header with Stats (max-w-lg for better mobile fit) */}
      <div className="w-full max-w-lg mb-4 animate-fade-in-down">
        <div className="flex items-center justify-between p-3 sm:p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 backdrop-blur-sm">
          {/* Stat Item: Hearts */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Hearts</div>
              <div className="text-base sm:text-lg font-bold text-slate-200">0</div>
            </div>
          </div>
          
          {/* Stat Item - XP */}
          <div ref={headerXPRef} className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Total XP</div>
              <div className="text-base sm:text-lg font-bold text-yellow-400 tabular-nums">{animatedTotalXP}</div>
            </div>
          </div>
          
          {/* Stat Item: Gems */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Gems</div>
              <div className="text-base sm:text-lg font-bold text-slate-200">0</div>
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

      {/* Flying Tokens */}
      {showFlyingTokens && tokens.map((token) => (
        <div
          key={token.id}
          className="token"
          style={{
            '--token-delay': `${token.delay}ms`,
            '--token-angle': `${(Math.PI * 2) * (token.id / tokens.length)}`,
          } as any}
        />
      ))}

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
                onClick={() => setShowLevelUp(false)}
                className="bg-white text-purple-600 hover:bg-purple-50 font-black px-6 py-2 text-md"
              >
                AWESOME!
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main Results Card */}
      <div className="relative z-10 w-full max-w-lg mx-auto flex-1 flex flex-col justify-center min-h-0 pb-12 sm:pb-0">
        <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-2 border-slate-700/50 shadow-2xl animate-scale-in">
          
          {/* Close Button - Updated to Red Circle Link */}
          <Link
            to={"/categories"}
            // Combines the required red background, rounded shape, size, and centering
            className="absolute top-3 right-3 z-20 h-8 w-8 bg-red-600 hover:bg-red-700 
                       rounded-full transition-colors flex items-center justify-center shadow-lg"
            onClick={onClose} // Keep the onClose functionality if it's needed for state cleanup
            aria-label="Close Results and go to Categories"
          >
            <X className="h-5 w-5 text-white" />
          </Link>
          
          {/* Content Wrapper */}
          <div className="relative z-10 p-5 sm:p-8 space-y-5 sm:space-y-6">
            
            {/* Header */}
            <div className="text-center space-y-2 sm:space-y-3 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-700/40 border border-slate-600/30 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-bold text-slate-300">{categoryName}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-wide">
                MISSION COMPLETE!
              </h1>
            </div>

            {/* Center Content - Points Earned or Results */}
            {showPointsCenter ? (
              <div ref={earnedPointsRef} className="py-8 sm:py-12 text-center space-y-3 sm:space-y-4 animate-pop-in">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50">
                  <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <div>
                  <div className="text-6xl sm:text-7xl font-black bg-gradient-to-b from-yellow-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent tabular-nums">
                    +{animatedKnowledge}
                  </div>
                  <div className="text-yellow-400/80 font-bold text-base sm:text-lg mt-1 sm:mt-2">
                    XP EARNED
                  </div>
                </div>
              </div>
            ) : (
              // Use slightly reduced vertical spacing for compact mobile view
              <div className="space-y-4 sm:space-y-6 animate-fade-in">
                {/* Results Grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {/* Correct/Incorrect */}
                  <Card className="bg-slate-800/40 border border-slate-700/50 p-4 sm:p-5">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2 sm:mb-3">Result</div>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                        <div>
                          <div className="text-2xl sm:text-3xl font-black text-emerald-400">{correctAnswers}</div>
                          <div className="text-xs text-emerald-500/70">CORRECT</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                        <div>
                          <div className="text-2xl sm:text-3xl font-black text-red-400">{incorrectAnswers}</div>
                          <div className="text-xs text-red-500/70">INCORRECT</div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Accuracy Circle (Scaled Down for Mobile) */}
                  <Card className="bg-slate-800/40 border border-slate-700/50 p-4 sm:p-5 flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative inline-block mb-3">
                        {/* Reduced SVG size: w-16 h-16 (64px) for mobile, w-20 h-20 (80px) for sm+ */}
                        <svg className="w-16 h-16 sm:w-20 sm:h-20 transform -rotate-90">
                          <circle
                            cx="32" // Adjusted center x
                            cy="32" // Adjusted center y
                            r="28"  // Adjusted radius
                            stroke="currentColor"
                            className="text-slate-700"
                            strokeWidth="8"
                            fill="none"
                          />
                          <circle
                            cx="32" // Adjusted center x
                            cy="32" // Adjusted center y
                            r="28"  // Adjusted radius
                            stroke="url(#accuracyGradient)"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 28}`} // Updated dash array calculation
                            strokeDashoffset={`${2 * Math.PI * 28 * (1 - animatedScore / 100)}`} // Updated dash offset calculation
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
                        {/* Adjusting the center number position based on the smaller SVG size */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl sm:text-2xl font-black text-slate-100">{animatedScore}%</span>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-slate-400 uppercase">Accuracy</div>
                      <div className="text-xs text-slate-600 font-bold">{performanceData.rank}</div>
                    </div>
                  </Card>
                </div>

                {/* Level Badge */}
                <div className="flex items-center justify-center gap-3 sm:gap-4 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                  <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
                  <div className="flex flex-row gap-3 items-center">
                    <div className="text-xs text-slate-500 uppercase">Level</div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-200">{currentLevel}</div>
                  </div>
                  {hasLeveledUp && (
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 animate-pulse">
                      UP!
                    </Badge>
                  )}
                </div>

                {/* Rating */}
                <Card className="bg-slate-800/40 border border-slate-700/50 p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
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
                            className={`h-4 w-4 sm:h-5 sm:w-5 transition-all ${
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

                {/* Next Quiz Button */}
                <Button
                  onClick={handleNextQuiz}
                  disabled={playButtonLoading}
                  size="lg"
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-black bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-[1.02]"
                >
                  {playButtonLoading ? "LOADING..." : "NEXT QUIZ"}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* CSS Animations (No changes needed here) */}
      <style>{`
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
        
        /* Flying Token Animation */
        .token {
          position: fixed;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #FFF, #FCD34D 35%, #F59E0B 65%, #D97706);
          box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.5), 0 10px 25px rgba(0, 0, 0, 0.35);
          z-index: 60;
          opacity: 0;
          pointer-events: none;
          animation: fly-token 900ms cubic-bezier(0.17, 0.67, 0.29, 1.01) var(--token-delay, 0ms) forwards;
        }
        
        @keyframes fly-token {
          0% {
            opacity: 0;
            transform: translate(
              calc(var(--token-start-x, 50vw) - 8px + cos(var(--token-angle, 0)) * 40px),
              calc(var(--token-start-y, 50vh) - 8px + sin(var(--token-angle, 0)) * 40px)
            ) scale(0.5);
          }
          15% {
            opacity: 1;
            transform: translate(
              calc(var(--token-start-x, 50vw) - 8px + cos(var(--token-angle, 0)) * 25px),
              calc(var(--token-start-y, 50vh) - 8px + sin(var(--token-angle, 0)) * 25px)
            ) scale(1.1);
          }
          85% {
            transform: translate(
              calc(var(--token-end-x, 50vw) - 8px),
              calc(var(--token-end-y, 50vh) - 8px)
            ) scale(0.6);
            opacity: 1;
          }
          100% {
            transform: translate(
              calc(var(--token-end-x, 50vw) - 8px),
              calc(var(--token-end-y, 50vh) - 8px)
            ) scale(0.1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
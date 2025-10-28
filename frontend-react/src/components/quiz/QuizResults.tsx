import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  TrendingUp,
  Star as StarIcon,
  RefreshCw,
  Crown,
  Flame,
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
      icon: <Crown className="h-6 w-6 sm:h-8 sm:w-8" />,
      rankColor: "text-emerald-500",
      bgGradient: "from-emerald-500/20 via-green-500/10 to-teal-500/5",
      borderColor: "border-emerald-500/50",
      badgeColor: "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
      glowColor: "shadow-emerald-500/50"
    };
  } else if (score >= 90) {
    return {
      message: "Nearly Perfect!",
      rank: "DIAMOND",
      icon: <Trophy className="h-6 w-6 sm:h-8 sm:w-8" />,
      rankColor: "text-cyan-500",
      bgGradient: "from-cyan-500/20 via-blue-500/10 to-cyan-500/5",
      borderColor: "border-cyan-500/50",
      badgeColor: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white",
      glowColor: "shadow-cyan-500/50"
    };
  } else if (score >= 80) {
    return {
      message: "Excellent Performance!",
      rank: "PLATINUM",
      icon: <Award className="h-6 w-6 sm:h-8 sm:w-8" />,
      rankColor: "text-indigo-500",
      bgGradient: "from-indigo-500/20 via-purple-500/10 to-indigo-500/5",
      borderColor: "border-indigo-500/50",
      badgeColor: "bg-gradient-to-r from-indigo-500 to-purple-500 text-white",
      glowColor: "shadow-indigo-500/50"
    };
  } else if (score >= 70) {
    return {
      message: "Great Job!",
      rank: "GOLD",
      icon: <Zap className="h-6 w-6 sm:h-8 sm:w-8" />,
      rankColor: "text-purple-400",
      bgGradient: "from-purple-400/20 via-purple-300/10 to-purple-400/5",
      borderColor: "border-purple-400/50",
      badgeColor: "bg-gradient-to-r from-purple-400 to-purple-300 text-white",
      glowColor: "shadow-purple-400/50"
    };
  } else if (score >= 50) {
    return {
      message: "Keep Pushing!",
      rank: "BRONZE",
      icon: <Target className="h-6 w-6 sm:h-8 sm:w-8" />,
      rankColor: "text-orange-600",
      bgGradient: "from-orange-600/20 via-orange-500/10 to-orange-600/5",
      borderColor: "border-orange-600/50",
      badgeColor: "bg-gradient-to-r from-orange-600 to-orange-500 text-white",
      glowColor: "shadow-orange-600/50"
    };
  } else {
    return {
      message: "Time to Review!",
      rank: "ROOKIE",
      icon: <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8" />,
      rankColor: "text-red-500",
      bgGradient: "from-red-500/20 via-red-400/10 to-red-500/5",
      borderColor: "border-red-500/50",
      badgeColor: "bg-gradient-to-r from-red-500 to-red-400 text-white",
      glowColor: "shadow-red-500/50"
    };
  }
};

export default function QuizResults({ results, onPlayAgain, onClose }: QuizResultsProps) {
  const navigate = useNavigate();
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
  const [showPointsOverlay, setShowPointsOverlay] = useState(true);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [tokens, setTokens] = useState<Array<{id: number; delay: number}>>([]);

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

  // Points earned overlay animation
  useEffect(() => {
    const earnedTimer = setTimeout(() => {
      let count = 0;
      const interval = setInterval(() => {
        count += Math.ceil(knowledgeGained / 15);
        if (count >= knowledgeGained) {
          count = knowledgeGained;
          clearInterval(interval);
          
          // Hide overlay and start token animation
          setTimeout(() => {
            setShowPointsOverlay(false);
            startTokenAnimation();
          }, 600);
        }
        setAnimatedKnowledge(count);
      }, 60);
      return () => clearInterval(interval);
    }, 400);

    return () => clearTimeout(earnedTimer);
  }, [knowledgeGained]);

  // Token flying animation
  const startTokenAnimation = () => {
    const tokenCount = Math.min(12, Math.max(6, knowledgeGained / 10));
    const newTokens = Array.from({ length: Math.floor(tokenCount) }, (_, i) => ({
      id: i,
      delay: 150 + i * 45
    }));
    setTokens(newTokens);

    // Animate XP increase in sync with tokens
    const startXP = totalKnowledge - knowledgeGained;
    let currentXP = startXP;
    const per = Math.max(1, Math.round(knowledgeGained / tokenCount));
    
    const xpTimer = setInterval(() => {
      currentXP += per;
      if (currentXP >= totalKnowledge) {
        currentXP = totalKnowledge;
        clearInterval(xpTimer);
        
        // Check for level up after XP animation
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
      setAnimatedTotalXP(currentXP);
      
      // Play sound
      if (knowledgeGainAudio) {
        const audioClone = knowledgeGainAudio.cloneNode(true) as HTMLAudioElement;
        audioClone.volume = 0.15;
        audioClone.play().catch(e => console.log("Audio play failed:", e));
      }
    }, 120);
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
        setRatingMessage("Thanks for your feedback! It helps us improve.");
        
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

  // KEY CHANGES ARE HERE:
  return (
    // Change 1: Use 'fixed inset-0' and 'overflow-hidden' to make the entire component fixed and prevent body scroll.
    // The previous 'min-h-screen' and 'relative' only ensured it was full-height in the flow, not fixed to the viewport.
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans overflow-hidden bg-slate-900/100">
      
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
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

      {/* Points Earned Overlay */}
      {showPointsOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none animate-fade-in">
          <Card className="bg-gradient-to-br from-slate-900 via-blue-950/50 to-slate-900 border-2 border-blue-500/40 p-8 text-center shadow-2xl shadow-blue-500/30 animate-pop-in">
            <div className="space-y-3">
              <div className="text-blue-300/80 font-bold text-xs tracking-[0.2em] uppercase">
                Points Earned
              </div>
              <div className="text-6xl font-black bg-gradient-to-b from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-count-up">
                +{animatedKnowledge}
              </div>
              <div className="text-slate-400 text-sm">
                {performanceData.message}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Flying Tokens */}
      {tokens.map((token) => (
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
              <Crown className="h-16 w-16 mx-auto text-yellow-300 animate-crown-bounce drop-shadow-glow" />
              <div>
                <h2 className="text-3xl font-black text-white mb-1 animate-text-glow">
                  LEVEL UP!
                </h2>
                <p className="text-xl font-bold text-white mb-2">
                  Congratulations!
                </p>
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white">
                  <span className="text-lg opacity-60">{previousLevel}</span>
                  <ArrowUp className="h-6 w-6 animate-bounce" />
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

      {/* Main Results Card Container */}
      {/* Change 2: Apply 'max-h-full' and 'overflow-y-auto' to the inner container. 
          This ensures the card is never taller than the viewport and will scroll 
          internally if its content is too large (especially on mobile). 
          The 'p-4' on the outer fixed div creates necessary padding around the card. */}
      <div className="relative z-10 w-full max-w-xl mx-auto max-h-full overflow-y-auto">
        <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-2 border-blue-500/30 shadow-2xl shadow-blue-500/20 animate-scale-in">
          
          {/* Gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${performanceData.bgGradient} opacity-30`} />
          
          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 z-20 h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="relative z-10 p-6 space-y-5">
            
            {/* Header */}
            <div className="text-center space-y-2 animate-fade-in-up">
              <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-wider">
                MISSION COMPLETE!
              </h1>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30">
                <span className="text-sm font-bold text-blue-300">{categoryName}</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 animate-slide-in-up">
              
              {/* Results Card */}
              <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-cyan-500/20 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-bold text-slate-400 tracking-[0.15em] mb-3 uppercase">
                  Result
                </h4>
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-1" />
                    <div>
                      <div className="text-3xl font-black text-emerald-400">{correctAnswers}</div>
                      <div className="text-xs font-bold text-emerald-500/80 uppercase">Correct</div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-1" />
                    <div>
                      <div className="text-3xl font-black text-red-400">{incorrectAnswers}</div>
                      <div className="text-xs font-bold text-red-500/80 uppercase">Incorrect</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Accuracy Card */}
              <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-cyan-500/20 p-4 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="relative inline-block">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="currentColor"
                        className="text-slate-700"
                        strokeWidth="6"
                        fill="none"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="url(#accuracyGradient)"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 36}`}
                        strokeDashoffset={`${2 * Math.PI * 36 * (1 - animatedScore / 100)}`}
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
                      <span className="text-xl font-black text-slate-100">{animatedScore}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-300 uppercase">Accuracy</div>
                    <div className="text-[10px] text-slate-500">{performanceData.rank}</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* XP Pill */}
            <Card className="bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 border border-purple-400/30 p-4 backdrop-blur-sm animate-slide-in-left shadow-lg shadow-blue-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 tracking-[0.12em] uppercase mb-1">
                    Total XP
                  </div>
                  <div className="text-4xl font-black bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent tabular-nums">
                    {animatedTotalXP}
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/60 rounded-xl border border-slate-700/50">
                  <Crown className="h-5 w-5 text-purple-400" />
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Level</div>
                    <div className="text-2xl font-black text-slate-200">{currentLevel}</div>
                  </div>
                  {hasLeveledUp && (
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-2 py-0.5 animate-pulse">
                      NEW!
                    </Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* Rating Section */}
            <Card className="bg-slate-800/40 border border-slate-700/50 p-4 backdrop-blur-sm animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-400 tracking-[0.12em] uppercase">
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
                        className={`h-5 w-5 transition-all ${
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
                <div className={`text-xs mt-2 ${
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
              className="w-full h-12 text-base font-black bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-[1.02] animate-button-glow"
            >
              {playButtonLoading ? "LOADING..." : "NEXT QUIZ"}
            </Button>
          </div>
        </Card>
      </div>

      {/* CSS Animations - (No changes needed here) */}
      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fade-in-up {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slide-in-up {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slide-in-left {
          0% { transform: translateX(-30px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes count-up {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        
        @keyframes pulse-delayed {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
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
        
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        @keyframes button-glow {
          0%, 100% { box-shadow: 0 4px 20px rgba(147, 51, 234, 0.4); }
          50% { box-shadow: 0 6px 30px rgba(147, 51, 234, 0.6); }
        }
        
        /* Flying Token Animation */
        .token {
          position: fixed;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #FFFFFF, #A9F0FF 35%, #46CFFF 65%, #5F7CFF);
          box-shadow: 0 0 0 2px rgba(94, 164, 255, 0.35), 0 10px 25px rgba(0, 0, 0, 0.35);
          z-index: 60;
          opacity: 0;
          pointer-events: none;
          animation: fly-token 900ms cubic-bezier(0.17, 0.67, 0.29, 1.01) var(--token-delay, 0ms) forwards;
        }
        
        @keyframes fly-token {
          0% {
            opacity: 0;
            transform: translate(
              calc(50vw + cos(var(--token-angle, 0)) * 60px),
              calc(50vh + sin(var(--token-angle, 0)) * 60px)
            ) scale(0.6);
          }
          8% {
            opacity: 1;
          }
          55% {
            transform: translate(
              calc(50vw + cos(var(--token-angle, 0)) * 30px),
              calc(50vh + sin(var(--token-angle, 0)) * 30px)
            ) scale(1);
          }
          100% {
            transform: translate(50vw, 50vh) scale(0.2);
            opacity: 0;
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out 0.1s both;
        }
        
        .animate-slide-in-up {
          animation: slide-in-up 0.6s ease-out 0.2s both;
        }
        
        .animate-slide-in-left {
          animation: slide-in-left 0.6s ease-out 0.3s both;
        }
        
        .animate-pop-in {
          animation: pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-count-up {
          animation: count-up 0.3s ease-in-out infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animate-pulse-delayed {
          animation: pulse-delayed 4s ease-in-out infinite 2s;
        }
        
        .animate-level-up-popup {
          animation: level-up-popup 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-crown-bounce {
          animation: crown-bounce 1s ease-in-out infinite;
        }
        
        .animate-text-glow {
          animation: text-glow 2s ease-in-out infinite;
        }
        
        .animate-scale-up {
          animation: scale-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
        
        .animate-button-glow {
          animation: button-glow 2s ease-in-out infinite;
        }
        
        .drop-shadow-glow {
          filter: drop-shadow(0 0 8px currentColor);
        }
      `}</style>
    </div>
  );
}
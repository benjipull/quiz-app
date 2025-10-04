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

// A single-point sound effect for knowledge gain (XP)
const KNOWLEDGE_GAIN_SOUND_SRC = "/sounds/xp-gain.mp3"; // Assuming a sound file exists at this path

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

// --- NEW/UPDATED RANKING LOGIC (KEEP AS IS) ---
const getPerformanceData = (percentage: number) => {
  const score = percentage;

  // New color scheme: Purple -> Blue -> Emerald -> Cyan -> Gray -> Orange -> Red
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
// ------------------------------------

export default function QuizResults({ results, onPlayAgain, onClose }: QuizResultsProps) {
  const navigate = useNavigate(); // Not used, but kept in case
  const userToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const {
    correctAnswers,
    incorrectAnswers,
    categoryName,
    categoryId,
    totalQuestions, // Not used in the render, but kept in case
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
  const [showLevelUp, setShowLevelUp] = useState(false);

  const [knowledgeGainAudio] = useState(
    typeof Audio !== "undefined" ? new Audio(KNOWLEDGE_GAIN_SOUND_SRC) : null
  );

  // --- HOOKS FOR SIZE AND ANIMATION (KEPT AS IS) ---
  useEffect(() => {
    setMounted(true);
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Animated score counter effect
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
  
  // Animated knowledge counter with sound effect
  useEffect(() => {
    const knowledgeTimer = setTimeout(() => {
      let currentKnowledge = 0;
      const interval = setInterval(() => {
        if (currentKnowledge >= knowledgeGained) {
          clearInterval(interval);
          setAnimatedKnowledge(knowledgeGained);
          return;
        }

        // Increment the display value
        const nextValue = Math.min(knowledgeGained, currentKnowledge + Math.ceil((knowledgeGained - currentKnowledge) / 8));
        currentKnowledge = nextValue;
        setAnimatedKnowledge(nextValue);
        
        // Play sound on each increment (subtle, non-blocking)
        if (knowledgeGainAudio && nextValue % 1 === 0 && nextValue > 0) {
            const audioClone = knowledgeGainAudio.cloneNode(true) as HTMLAudioElement;
            audioClone.volume = 0.2; // Keep volume low for continuous play
            audioClone.play().catch(e => console.log("Audio play failed:", e));
        }

      }, 50);
      return () => clearInterval(interval);
    }, 600);

    const levelUpTimer = hasLeveledUp ? setTimeout(() => {
      setShowLevelUp(true);
    }, 1500) : undefined;

    return () => {
      clearTimeout(knowledgeTimer);
      if (levelUpTimer) clearTimeout(levelUpTimer);
    };
  }, [knowledgeGained, hasLeveledUp, knowledgeGainAudio]);

  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState<boolean>(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingMessage, setRatingMessage] = useState<string | null>(null);

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

  // Performance data (cached with useMemo)
  const performanceData = useMemo(() => getPerformanceData(percentage), [percentage]);
  
  if (!mounted) {
    return null;
  }

  // Circular Progress Metrics - Reduced max size for better fit on small vertical screens
  // progressSize is now max 144px on mobile and 180px on larger screens
  const progressSize = windowSize.width >= 768 ? 180 : 130; 
  const progressRadius = progressSize / 2 - 8; // Reduced stroke for compactness
  const progressCenter = progressSize / 2;
  const progressStroke = 8; // Reduced stroke width
  // ------------------------------------

  return (
    // PRIMARY FIX: h-screen (or min-h-screen) is critical. Use p-2 for minimal padding.
    // **overflow-hidden** on the main container prevents external scroll.
    <div className="h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-2 md:p-4 font-sans overflow-hidden relative">
      
      {/* Animated background elements (KEEP AS IS) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse-slow md:w-48 md:h-48" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse-delayed md:w-48 md:h-48" />
      </div>

      {/* Confetti for achievements (KEEP AS IS) */}
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

      {/* Level Up Celebration Modal (KEEP AS IS) */}
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
                  <span className="text-lg animate-fade-out">{previousLevel}</span>
                  <ArrowUp className="h-6 w-6 animate-bounce" />
                  <span className="animate-scale-up">{currentLevel}</span>
                </div>
              </div>
              <Button
                onClick={() => setShowLevelUp(false)}
                className="bg-white text-purple-600 hover:bg-purple-50 font-black px-6 py-2 text-md"
              >
                OKAY!
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main Results Card Container (h-full is key here to let it stretch within the parent flex) */}
      <div className="relative z-10 w-full max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto h-full flex items-center justify-center"> 
        
        {/* 💡 FIX 1: Added flex-col to the Card to enable proper height management for inner content */}
        <Card className={`
          relative overflow-hidden bg-card/95 backdrop-blur-xl border-2 ${performanceData.borderColor}
          shadow-2xl ${performanceData.glowColor} transition-all duration-700 animate-scale-in w-full max-h-[95vh] md:max-h-[90vh] flex flex-col
        `}>
          
          {/* Gradient overlay (KEEP AS IS) */}
          <div className={`absolute inset-0 bg-gradient-to-br ${performanceData.bgGradient} opacity-40`} />
          
          {/* Close Button (KEEP AS IS) */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-20 h-8 w-8 text-foreground/70 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
            aria-label="Close results"
          >
            <X className="h-5 w-5" />
          </Button>
          
          {/* 💡 FIX 2: Changed h-full to flex-grow. This ensures the content DIV takes up all remaining space within the flex-col Card. */}
          {/* overflow-y-auto is now correctly scoped to this inner content, preventing main page scroll. */}
          <div className="relative z-10 p-4 md:p-6 space-y-4 md:grid md:grid-cols-2 md:gap-4 lg:gap-8 md:space-y-0 flex-grow overflow-y-auto"> 
            
            {/* LEFT COLUMN: Header, Score, and Rank */}
            <div className="md:col-span-1 flex flex-col items-center text-center space-y-3 md:space-y-4">
              
              {/* Header Section with Rank Badge */}
              <div className="space-y-1 animate-fade-in-up flex-shrink-0"> 
                <div className="flex flex-col items-center gap-1">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-foreground tracking-wider drop-shadow-lg">
                    MISSION COMPLETE!
                  </h1>
                  <p className="text-sm text-muted-foreground font-bold">
                    {performanceData.message}
                  </p>
                </div>
                <div className="inline-block bg-primary/10 dark:bg-white/10 backdrop-blur-sm px-3 py-0.5 rounded-full border border-primary/20 dark:border-white/20 mt-1">
                  <h2 className="text-sm md:text-md font-bold text-foreground truncate max-w-full">
                    {categoryName}
                  </h2>
                </div>
              </div>

              {/* Circular Progress Score - Hero Element (Dynamic Size) */}
              <div className="flex justify-center py-2 md:py-4 animate-slide-in-up flex-shrink-0">
                <div className="relative">
                  <svg className={`transform -rotate-90`} style={{ width: progressSize, height: progressSize }}>
                    {/* Background Circle */}
                    <circle
                      cx={progressCenter} 
                      cy={progressCenter}
                      r={progressRadius}
                      stroke="currentColor"
                      className="text-muted/20"
                      strokeWidth={progressStroke}
                      fill="none"
                    />
                    {/* Foreground Circle */}
                    <circle
                      cx={progressCenter}
                      cy={progressCenter}
                      r={progressRadius}
                      stroke="url(#gradient)"
                      strokeWidth={progressStroke}
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * progressRadius}`}
                      strokeDashoffset={`${2 * Math.PI * progressRadius * (1 - animatedScore / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      {/* Gradient for the progress bar (Updated to blue/purple/cyan) */}
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" /> {/* Purple */}
                        <stop offset="50%" stopColor="#3b82f6" /> {/* Blue */}
                        <stop offset="100%" stopColor="#06b6d4" /> {/* Cyan */}
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl md:text-5xl font-black text-foreground drop-shadow-lg">
                      {animatedScore}%
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">ACCURACY</span>
                  </div>
                  {percentage === 100 && (
                    <Flame className="absolute -top-4 left-1/2 -translate-x-1/2 h-6 w-6 text-emerald-500 animate-flame-flicker" />
                  )}
                </div>
              </div>

              {/* Action Buttons - Only "Next Quiz" remains */}
              <div className="pt-1 w-full max-w-xs flex-shrink-0">
                <Button
                  onClick={onPlayAgain}
                  size="lg" // Use lg for mobile too for tap target size
                  className="w-full h-10 text-sm md:text-md font-black bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white transform transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-purple-500/50 animate-button-glow-purple"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  NEXT QUIZ
                </Button>
              </div>

            </div>
            
            {/* RIGHT COLUMN: Stats Grid and Rating */}
            {/* Added flex-grow to this column to ensure it uses vertical space if the screen is tall. */}
            <div className="md:col-span-1 space-y-3 flex flex-col justify-between flex-grow"> 
              
              {/* Answer Breakdown */}
              <Card className="bg-card/50 border border-border p-3 animate-slide-in-left backdrop-blur-sm flex-shrink-0">
                <h3 className="text-xs font-bold text-foreground mb-2 flex items-center justify-center gap-1">
                  <Target className="h-3 w-3 text-cyan-500" />
                  ANSWER BREAKDOWN
                </h3>
                <div className="flex justify-around gap-2">
                  <div className="flex flex-col items-center">
                    <CheckCircle className="h-6 w-6 text-emerald-500 animate-check-pulse" />
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{correctAnswers}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-300 font-semibold uppercase">Correct</div>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <XCircle className="h-6 w-6 text-red-500 animate-x-pulse" />
                    <div className="text-2xl font-black text-red-600 dark:text-red-400">{incorrectAnswers}</div>
                    <div className="text-xs text-red-600 dark:text-red-300 font-semibold uppercase">Incorrect</div>
                  </div>
                  
                </div>
              </Card>

              {/* Progress Stats (XP and Level) */}
              <div className="space-y-2 animate-slide-in-right flex-grow">
                
                {/* Knowledge Gained - Enhanced */}
                <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-400/30 p-3 backdrop-blur-sm animate-glow-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-400/30 flex-shrink-0">
                        <TrendingUp className="h-4 w-4 text-blue-500 animate-float" />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-blue-600 dark:text-blue-300 text-xs uppercase">XP Earned</div>
                        <div className="text-xs text-blue-600/80 dark:text-blue-200 truncate">
                          Total XP: <span className="text-blue-600 dark:text-blue-300 font-bold">{totalKnowledge}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="text-lg font-black bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-0.5 shadow-lg animate-badge-bounce flex-shrink-0">
                      +{animatedKnowledge}
                    </Badge>
                  </div>
                </Card>

                {/* Current Level Display */}
                <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-2 border-purple-400/30 p-3 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-500/20 rounded-lg border border-purple-400/30 flex-shrink-0">
                        <Crown className="h-4 w-4 text-purple-500" />
                      </div>
                      <div>
                        <div className="font-bold text-purple-600 dark:text-purple-300 text-xs uppercase">Current Level</div>
                        <div className="text-xl font-black text-purple-700 dark:text-purple-200">{currentLevel}</div>
                      </div>
                    </div>
                    {hasLeveledUp && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-emerald-500 text-white font-bold text-xs px-2 py-0.5 animate-pulse flex-shrink-0">
                        NEW LEVEL!
                      </Badge>
                    )}
                  </div>
                </Card>
              </div>

              {/* Rating Section */}
              <Card className="bg-card/50 border border-border p-3 flex-shrink-0 animate-fade-in backdrop-blur-sm">
                <div className="text-center space-y-2">
                  <h3 className="text-xs font-bold text-foreground flex items-center justify-center gap-1">
                    <StarIcon className="h-3 w-3 text-purple-500" />
                    RATE THIS QUIZ
                  </h3>
                  
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        disabled={hasRated || isSubmittingRating}
                        onClick={() => handleRatingSubmit(star)}
                        onMouseEnter={() => !hasRated && setHoveredRating(star)}
                        onMouseLeave={() => !hasRated && setHoveredRating(0)}
                        className={`
                          p-0.5 transition-all duration-200 transform
                          ${hasRated || isSubmittingRating ? "cursor-default" : "cursor-pointer hover:scale-125"}
                        `}
                      >
                        <StarIcon
                          className={`h-6 w-6 transition-all duration-200 ${
                            star <= (hoveredRating || rating)
                              ? "fill-purple-500 text-purple-500 drop-shadow-glow"
                              : "text-muted-foreground hover:text-purple-500/60"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {isSubmittingRating && (
                    <div className="text-xs text-muted-foreground animate-pulse">Submitting...</div>
                  )}
                  
                  {ratingMessage && (
                    <div className={`text-[10px] font-bold animate-message ${ // Very small font size
                      ratingMessage.includes("Thanks") 
                        ? "text-purple-600 dark:text-purple-400" 
                        : "text-red-600 dark:text-red-400"
                    }`}>
                      {ratingMessage}
                    </div>
                  )}
                </div>
              </Card>
              
            </div>
            
          </div>
        </Card>
      </div>

      {/* Enhanced CSS Animations (KEEP AS IS) */}
      <style>{`
        /* Existing CSS animations retained and slightly adjusted for mobile feel */
        @keyframes scale-in {
          0% { transform: scale(0.8) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        
        @keyframes fade-in-up {
          0% { transform: translateY(15px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slide-in-up {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slide-in-left {
          0% { transform: translateX(-20px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slide-in-right {
          0% { transform: translateX(20px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes icon-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-5px) scale(1.1); }
        }
        
        @keyframes badge-pop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes badge-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes pop-in-delayed {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes check-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        @keyframes x-pulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(90deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.03); }
        }
        
        @keyframes pulse-delayed {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.03); }
        }
        
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.2); }
          50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
        }
        
        @keyframes level-up-popup {
          0% { transform: scale(0.4) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.05) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        @keyframes crown-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(-5deg); }
          75% { transform: translateY(-10px) rotate(5deg); }
        }
        
        @keyframes text-glow {
          0%, 100% { text-shadow: 0 0 10px rgba(255, 255, 255, 0.4); }
          50% { text-shadow: 0 0 20px rgba(255, 255, 255, 0.6); }
        }
        
        @keyframes fade-out {
          0% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        
        @keyframes scale-up {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1.1); opacity: 1; }
        }
        
        @keyframes button-glow-purple {
          0%, 100% { box-shadow: 0 2px 10px rgba(147, 51, 234, 0.4); } /* Adjusted to purple glow */
          50% { box-shadow: 0 4px 20px rgba(147, 51, 234, 0.7); }
        }
        
        @keyframes flame-flicker {
          0%, 100% { opacity: 1; transform: translateY(0) scale(1); }
          25% { opacity: 0.8; transform: translateY(-3px) scale(1.05); }
          50% { opacity: 1; transform: translateY(-1px) scale(0.95); }
          75% { opacity: 0.9; transform: translateY(-4px) scale(1.03); }
        }
        
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        @keyframes message {
          0% { transform: translateY(-5px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        .drop-shadow-glow {
          filter: drop-shadow(0 0 4px currentColor);
        }
        
      `}</style>
    </div>
  );
}
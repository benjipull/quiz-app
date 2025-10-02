import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  TrendingUp,
  Star as StarIcon,
  Home,
  RefreshCw,
  Award,
  Trophy,
  Target,
  Zap,
  Crown,
  Flame,
  Medal,
  Sparkles,
  ArrowUp,
} from "lucide-react";
import Confetti from "react-confetti";

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
}

export default function QuizResults({ results, onPlayAgain }: QuizResultsProps) {
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
  const [showAchievements, setShowAchievements] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedKnowledge, setAnimatedKnowledge] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Animated counter effects
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

    const knowledgeTimer = setTimeout(() => {
      const interval = setInterval(() => {
        setAnimatedKnowledge(prev => {
          if (prev >= knowledgeGained) {
            clearInterval(interval);
            return knowledgeGained;
          }
          return prev + Math.ceil((knowledgeGained - prev) / 8);
        });
      }, 50);
      return () => clearInterval(interval);
    }, 600);

    const achievementTimer = setTimeout(() => {
      setShowAchievements(true);
    }, 1000);

    const levelUpTimer = hasLeveledUp ? setTimeout(() => {
      setShowLevelUp(true);
    }, 1500) : undefined;

    return () => {
      clearTimeout(scoreTimer);
      clearTimeout(knowledgeTimer);
      clearTimeout(achievementTimer);
      if (levelUpTimer) clearTimeout(levelUpTimer);
    };
  }, [percentage, knowledgeGained, hasLeveledUp]);

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

  // Get achievements based on performance
  const getAchievements = () => {
    const achievements = [];
    
    if (percentage === 100) {
      achievements.push({ 
        icon: <Trophy className="h-5 w-5" />, 
        title: "Perfect Score", 
        description: "Flawless Victory!",
        color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30"
      });
    }
    
    if (percentage >= 90) {
      achievements.push({ 
        icon: <Award className="h-5 w-5" />, 
        title: "Top Performer", 
        description: "90%+ Accuracy",
        color: "text-blue-500 bg-blue-500/10 border-blue-500/30"
      });
    }
    
    if (correctAnswers >= 5) {
      achievements.push({ 
        icon: <Target className="h-5 w-5" />, 
        title: "Sharp Shooter", 
        description: `${correctAnswers} Correct Answers`,
        color: "text-purple-500 bg-purple-500/10 border-purple-500/30"
      });
    }
    
    if (hasLeveledUp) {
      achievements.push({ 
        icon: <ArrowUp className="h-5 w-5" />, 
        title: "Level Breakthrough", 
        description: `Reached Level ${currentLevel}`,
        color: "text-purple-500 bg-purple-500/10 border-purple-500/30"
      });
    }
    
    if (knowledgeGained >= 50) {
      achievements.push({ 
        icon: <Sparkles className="h-5 w-5" />, 
        title: "Knowledge Master", 
        description: `+${knowledgeGained} XP Earned`,
        color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30"
      });
    }

    if (percentage >= 80 && percentage < 90) {
      achievements.push({ 
        icon: <Medal className="h-5 w-5" />, 
        title: "Gold Standard", 
        description: "Excellent Performance",
        color: "text-amber-500 bg-amber-500/10 border-amber-500/30"
      });
    }
    
    return achievements;
  };

  // Performance data
  const getPerformanceData = (score: number) => {
    if (score === 100) {
      return {
        message: "LEGENDARY! FLAWLESS VICTORY!",
        rank: "LEGENDARY",
        icon: <Crown className="h-8 w-8 sm:h-10 sm:w-10" />,
        rankColor: "text-yellow-500",
        bgGradient: "from-yellow-500/20 via-amber-500/10 to-orange-500/5",
        borderColor: "border-yellow-500/50",
        badgeColor: "bg-gradient-to-r from-yellow-500 to-amber-500 text-white",
        glowColor: "shadow-yellow-500/50"
      };
    } else if (score >= 90) {
      return {
        message: "DIAMOND RANK! Nearly Perfect!",
        rank: "DIAMOND",
        icon: <Trophy className="h-8 w-8 sm:h-10 sm:w-10" />,
        rankColor: "text-blue-500",
        bgGradient: "from-blue-500/20 via-cyan-500/10 to-blue-500/5",
        borderColor: "border-blue-500/50",
        badgeColor: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
        glowColor: "shadow-blue-500/50"
      };
    } else if (score >= 80) {
      return {
        message: "GOLD TIER! Excellent Performance!",
        rank: "GOLD",
        icon: <Award className="h-8 w-8 sm:h-10 sm:w-10" />,
        rankColor: "text-amber-500",
        bgGradient: "from-amber-500/20 via-yellow-500/10 to-amber-500/5",
        borderColor: "border-amber-500/50",
        badgeColor: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white",
        glowColor: "shadow-amber-500/50"
      };
    } else if (score >= 70) {
      return {
        message: "SILVER RANK! Great Job!",
        rank: "SILVER",
        icon: <Zap className="h-8 w-8 sm:h-10 sm:w-10" />,
        rankColor: "text-gray-400",
        bgGradient: "from-gray-400/20 via-gray-300/10 to-gray-400/5",
        borderColor: "border-gray-400/50",
        badgeColor: "bg-gradient-to-r from-gray-400 to-gray-300 text-white",
        glowColor: "shadow-gray-400/50"
      };
    } else if (score >= 50) {
      return {
        message: "BRONZE LEVEL! Keep Pushing!",
        rank: "BRONZE",
        icon: <Target className="h-8 w-8 sm:h-10 sm:w-10" />,
        rankColor: "text-orange-600",
        bgGradient: "from-orange-600/20 via-orange-500/10 to-orange-600/5",
        borderColor: "border-orange-600/50",
        badgeColor: "bg-gradient-to-r from-orange-600 to-orange-500 text-white",
        glowColor: "shadow-orange-600/50"
      };
    } else {
      return {
        message: "ROOKIE TIER! Training Mode!",
        rank: "ROOKIE",
        icon: <RefreshCw className="h-8 w-8 sm:h-10 sm:w-10" />,
        rankColor: "text-red-500",
        bgGradient: "from-red-500/20 via-red-400/10 to-red-500/5",
        borderColor: "border-red-500/50",
        badgeColor: "bg-gradient-to-r from-red-500 to-red-400 text-white",
        glowColor: "shadow-red-500/50"
      };
    }
  };

  const performanceData = getPerformanceData(percentage);
  const achievements = getAchievements();

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-2 sm:p-4 lg:p-6 font-sans overflow-hidden relative">
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-40 right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse-delayed" />
        <div className="absolute bottom-20 left-32 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-40 right-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse-delayed" />
      </div>

      {/* Confetti for achievements */}
      {(percentage >= 80 || hasLeveledUp) && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={percentage === 100 ? 500 : hasLeveledUp ? 300 : 200}
          gravity={0.08}
          colors={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#fbbf24']}
        />
      )}

      <div className="relative z-10 w-full max-w-5xl mx-auto">
        
        {/* Level Up Celebration Modal */}
        {showLevelUp && hasLeveledUp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <Card className="bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 border-4 border-purple-300 p-8 text-center max-w-md mx-4 animate-level-up-popup shadow-2xl shadow-purple-500/50">
              <div className="space-y-6">
                <Crown className="h-20 w-20 mx-auto text-yellow-300 animate-crown-bounce drop-shadow-glow" />
                <div>
                  <h2 className="text-4xl font-black text-white mb-2 animate-text-glow">
                    LEVEL UP!
                  </h2>
                  <div className="flex items-center justify-center gap-4 text-3xl font-bold text-white">
                    <span className="animate-fade-out">{previousLevel}</span>
                    <ArrowUp className="h-8 w-8 animate-bounce" />
                    <span className="animate-scale-up">{currentLevel}</span>
                  </div>
                </div>
                <p className="text-lg text-purple-100 font-semibold">
                  You've reached new heights! 🎉
                </p>
                <Button
                  onClick={() => setShowLevelUp(false)}
                  className="bg-white text-purple-600 hover:bg-purple-50 font-black px-8 py-3 text-lg"
                >
                  AWESOME!
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Main Results Card */}
        <Card className={`
          relative overflow-hidden bg-card/95 backdrop-blur-xl border-2 ${performanceData.borderColor}
          shadow-2xl ${performanceData.glowColor} transition-all duration-700 animate-scale-in
        `}>
          
          {/* Gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${performanceData.bgGradient} opacity-40`} />
          
          <div className="relative z-10 p-4 sm:p-6 lg:p-8 space-y-6">
            
            {/* Header Section with Rank Badge */}
            <div className="text-center space-y-4 animate-fade-in-up">
              <div className="flex flex-col items-center gap-4">
                <div className={`${performanceData.rankColor} animate-icon-bounce`}>
                  {performanceData.icon}
                </div>
                <div>
                  <Badge className={`${performanceData.badgeColor} text-lg sm:text-2xl font-black px-6 py-2 mb-3 animate-badge-pop shadow-lg`}>
                    {performanceData.rank}
                  </Badge>
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-wider mb-2 drop-shadow-lg">
                    MISSION COMPLETE!
                  </h1>
                  <p className="text-lg sm:text-xl text-muted-foreground font-bold">
                    {performanceData.message}
                  </p>
                </div>
              </div>
              
              <div className="inline-block bg-primary/10 dark:bg-white/10 backdrop-blur-sm px-6 py-2 rounded-full border border-primary/20 dark:border-white/20">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  {categoryName}
                </h2>
              </div>
            </div>

            {/* Circular Progress Score - Hero Element */}
            <div className="flex justify-center py-6 animate-slide-in-up">
              <div className="relative">
                <svg className="transform -rotate-90 w-48 h-48">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    className="text-muted/20"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="url(#gradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - animatedScore / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-foreground drop-shadow-lg">
                    {animatedScore}%
                  </span>
                  <span className="text-sm text-muted-foreground font-semibold">ACCURACY</span>
                </div>
                {percentage === 100 && (
                  <Flame className="absolute -top-8 left-1/2 -translate-x-1/2 h-12 w-12 text-orange-500 animate-flame-flicker" />
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Answer Breakdown */}
              <Card className="bg-card/50 border border-border p-6 animate-slide-in-left backdrop-blur-sm">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-cyan-500" />
                  ANSWER BREAKDOWN
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-500/10 border-2 border-purple-500/30 rounded-xl p-4 text-center animate-pop-in backdrop-blur-sm">
                    <CheckCircle className="h-8 w-8 text-purple-500 mx-auto mb-2 animate-check-pulse" />
                    <div className="text-4xl font-black text-purple-600 dark:text-purple-400 mb-1">{correctAnswers}</div>
                    <div className="text-xs text-purple-600 dark:text-purple-300 font-semibold uppercase">Correct</div>
                    <div className="text-2xl text-purple-500 font-bold mt-1">✓</div>
                  </div>
                  
                  <div className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-4 text-center animate-pop-in-delayed backdrop-blur-sm">
                    <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2 animate-x-pulse" />
                    <div className="text-4xl font-black text-red-600 dark:text-red-400 mb-1">{incorrectAnswers}</div>
                    <div className="text-xs text-red-600 dark:text-red-300 font-semibold uppercase">Incorrect</div>
                    <div className="text-2xl text-red-500 font-bold mt-1">✗</div>
                  </div>
                </div>
              </Card>

              {/* Progress Stats */}
              <div className="space-y-4 animate-slide-in-right">
                
                {/* Knowledge Gained - Enhanced */}
                <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-400/30 p-4 backdrop-blur-sm animate-glow-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-400/30">
                        <TrendingUp className="h-6 w-6 text-blue-500 animate-float" />
                      </div>
                      <div>
                        <div className="font-bold text-blue-600 dark:text-blue-300 text-sm uppercase">XP Earned</div>
                        <div className="text-xs text-blue-600/80 dark:text-blue-200">
                          Total: <span className="text-blue-600 dark:text-blue-300 font-bold">{totalKnowledge}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="text-2xl font-black bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 shadow-lg animate-badge-bounce">
                      +{animatedKnowledge}
                    </Badge>
                  </div>
                </Card>

                {/* Current Level Display */}
                <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-2 border-purple-400/30 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-400/30">
                        <Crown className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <div className="font-bold text-purple-600 dark:text-purple-300 text-sm uppercase">Current Level</div>
                        <div className="text-2xl font-black text-purple-700 dark:text-purple-200">{currentLevel}</div>
                      </div>
                    </div>
                    {hasLeveledUp && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-emerald-500 text-white font-bold px-3 py-1 animate-pulse">
                        NEW!
                      </Badge>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {showAchievements && achievements.length > 0 && (
              <Card className="bg-card/50 border border-yellow-500/30 p-6 backdrop-blur-sm animate-achievement-reveal">
                <h3 className="text-xl font-black text-yellow-600 dark:text-yellow-400 mb-4 flex items-center gap-2">
                  <Trophy className="h-6 w-6" />
                  ACHIEVEMENTS UNLOCKED
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className={`${achievement.color} border-2 rounded-xl p-4 text-center animate-achievement-pop backdrop-blur-sm`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex justify-center mb-2">
                        {achievement.icon}
                      </div>
                      <div className="font-bold text-sm mb-1">{achievement.title}</div>
                      <div className="text-xs opacity-80">{achievement.description}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Rating Section */}
            <Card className="bg-card/50 border border-border p-4 animate-fade-in backdrop-blur-sm">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
                  <StarIcon className="h-5 w-5 text-yellow-500" />
                  RATE THIS QUIZ
                </h3>
                
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={hasRated || isSubmittingRating}
                      onClick={() => handleRatingSubmit(star)}
                      onMouseEnter={() => !hasRated && setHoveredRating(star)}
                      onMouseLeave={() => !hasRated && setHoveredRating(0)}
                      className={`
                        p-2 transition-all duration-200 transform
                        ${hasRated || isSubmittingRating ? "cursor-default" : "cursor-pointer hover:scale-125"}
                      `}
                    >
                      <StarIcon
                        className={`h-8 w-8 transition-all duration-200 ${
                          star <= (hoveredRating || rating)
                            ? "fill-yellow-500 text-yellow-500 drop-shadow-glow"
                            : "text-muted-foreground hover:text-yellow-500/60"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {isSubmittingRating && (
                  <div className="text-sm text-muted-foreground animate-pulse">Submitting...</div>
                )}
                
                {ratingMessage && (
                  <div className={`text-sm font-bold animate-message ${
                    ratingMessage.includes("Thanks") 
                      ? "text-purple-600 dark:text-purple-400" 
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    {ratingMessage}
                  </div>
                )}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Button
                onClick={onPlayAgain}
                size="lg"
                className="h-14 text-lg font-black bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white transform transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-purple-500/50 animate-button-glow-purple"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                REPLAY MISSION
              </Button>

              <Button
                onClick={() => navigate("/categories")}
                variant="outline"
                size="lg"
                className="h-14 text-lg font-black border-2 border-slate-600 text-white bg-slate-800/50 hover:bg-slate-700/50 transform transition-all duration-300 hover:scale-105 shadow-lg backdrop-blur-sm"
              >
                <Home className="h-5 w-5 mr-2" />
                BACK TO HUB
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Enhanced CSS Animations */}
      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0.8) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        
        @keyframes fade-in-up {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slide-in-up {
          0% { transform: translateY(50px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slide-in-left {
          0% { transform: translateX(-40px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slide-in-right {
          0% { transform: translateX(40px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes icon-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.1); }
        }
        
        @keyframes badge-pop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes badge-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        @keyframes pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes pop-in-delayed {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes check-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        
        @keyframes x-pulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.2) rotate(180deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        
        @keyframes pulse-delayed {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
        }
        
        @keyframes achievement-reveal {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes achievement-pop {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(10deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        @keyframes level-up-popup {
          0% { transform: scale(0.5) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.05) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        @keyframes crown-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-15px) rotate(-10deg); }
          75% { transform: translateY(-15px) rotate(10deg); }
        }
        
        @keyframes text-glow {
          0%, 100% { text-shadow: 0 0 20px rgba(255, 255, 255, 0.5); }
          50% { text-shadow: 0 0 40px rgba(255, 255, 255, 0.8), 0 0 60px rgba(255, 255, 255, 0.6); }
        }
        
        @keyframes fade-out {
          0% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        
        @keyframes scale-up {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1.2); opacity: 1; }
        }
        
        @keyframes button-glow-purple {
          0%, 100% { box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4); }
          50% { box-shadow: 0 8px 40px rgba(34, 197, 94, 0.6); }
        }
        
        @keyframes flame-flicker {
          0%, 100% { opacity: 1; transform: translateY(0) scale(1); }
          25% { opacity: 0.8; transform: translateY(-5px) scale(1.1); }
          50% { opacity: 1; transform: translateY(-2px) scale(0.9); }
          75% { opacity: 0.9; transform: translateY(-7px) scale(1.05); }
        }
        
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        @keyframes message {
          0% { transform: translateY(-10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        .animate-scale-in { animation: scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out; }
        .animate-slide-in-up { animation: slide-in-up 0.8s ease-out 0.3s both; }
        .animate-slide-in-left { animation: slide-in-left 0.6s ease-out 0.4s both; }
        .animate-slide-in-right { animation: slide-in-right 0.6s ease-out 0.4s both; }
        .animate-icon-bounce { animation: icon-bounce 1s ease-in-out 0.2s both; }
        .animate-badge-pop { animation: badge-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both; }
        .animate-badge-bounce { animation: badge-bounce 0.8s ease-in-out 0.6s both; }
        .animate-pop-in { animation: pop-in 0.5s ease-out 0.6s both; }
        .animate-pop-in-delayed { animation: pop-in-delayed 0.5s ease-out 0.7s both; }
        .animate-check-pulse { animation: check-pulse 1s ease-in-out infinite; }
        .animate-x-pulse { animation: x-pulse 1s ease-in-out infinite; }
        .animate-float { animation: float 2s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-pulse-delayed { animation: pulse-delayed 4s ease-in-out infinite 2s; }
        .animate-glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }
        .animate-achievement-reveal { animation: achievement-reveal 0.6s ease-out 1s both; }
        .animate-achievement-pop { animation: achievement-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .animate-level-up-popup { animation: level-up-popup 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-crown-bounce { animation: crown-bounce 2s ease-in-out infinite; }
        .animate-text-glow { animation: text-glow 2s ease-in-out infinite; }
        .animate-fade-out { animation: fade-out 0.5s ease-out forwards; }
        .animate-scale-up { animation: scale-up 0.5s ease-out forwards; }
        .animate-button-glow-purple { animation: button-glow-purple 2s ease-in-out infinite; }
        .animate-flame-flicker { animation: flame-flicker 1.5s ease-in-out infinite; }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-message { animation: message 0.4s ease-out; }
        
        .drop-shadow-glow {
          filter: drop-shadow(0 0 8px currentColor);
        }
        
        /* Responsive adjustments */
        @media (max-width: 640px) {
          .animate-scale-in { animation-duration: 0.4s; }
          .animate-icon-bounce { animation-duration: 0.8s; }
        }
      `}</style>
    </div>
  );
}
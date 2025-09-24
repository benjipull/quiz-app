"use client";

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

  useEffect(() => {
    setMounted(true);
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

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

  // Performance data with theme-aware colors
  const getPerformanceData = (score: number) => {
    if (score === 100) {
      return {
        message: "🏆 LEGENDARY! FLAWLESS VICTORY!",
        rank: "LEGENDARY",
        icon: <Crown className="h-6 w-6 sm:h-8 sm:w-8 animate-spin-slow text-accent" />,
        rankColor: "text-accent",
        bgColor: "from-accent/10 to-accent/5",
        borderColor: "border-accent/30",
        badgeColor: "bg-accent text-accent-foreground"
      };
    } else if (score >= 90) {
      return {
        message: "💎 DIAMOND RANK! Nearly Perfect!",
        rank: "DIAMOND",
        icon: <Trophy className="h-6 w-6 sm:h-8 sm:w-8 animate-bounce-slow text-primary" />,
        rankColor: "text-primary",
        bgColor: "from-primary/10 to-primary/5",
        borderColor: "border-primary/30",
        badgeColor: "bg-primary text-primary-foreground"
      };
    } else if (score >= 80) {
      return {
        message: "🔥 GOLD TIER! Excellent Performance!",
        rank: "GOLD",
        icon: <Award className="h-6 w-6 sm:h-8 sm:w-8 animate-pulse-slow text-success" />,
        rankColor: "text-success",
        bgColor: "from-success/10 to-success/5",
        borderColor: "border-success/30",
        badgeColor: "bg-success text-white"
      };
    } else if (score >= 70) {
      return {
        message: "⚡ SILVER RANK! Great Job!",
        rank: "SILVER",
        icon: <Zap className="h-6 w-6 sm:h-8 sm:w-8 animate-pulse text-muted-foreground" />,
        rankColor: "text-muted-foreground",
        bgColor: "from-muted/20 to-muted/10",
        borderColor: "border-muted/30",
        badgeColor: "bg-muted text-muted-foreground"
      };
    } else if (score >= 50) {
      return {
        message: "🎯 BRONZE LEVEL! Keep Pushing!",
        rank: "BRONZE",
        icon: <Target className="h-6 w-6 sm:h-8 sm:w-8 animate-pulse text-warning" />,
        rankColor: "text-warning",
        bgColor: "from-warning/10 to-warning/5",
        borderColor: "border-warning/30",
        badgeColor: "bg-warning text-warning-foreground"
      };
    } else {
      return {
        message: "🛡️ ROOKIE TIER! Training Mode!",
        rank: "ROOKIE",
        icon: <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin-slow text-destructive" />,
        rankColor: "text-destructive",
        bgColor: "from-destructive/10 to-destructive/5",
        borderColor: "border-destructive/30",
        badgeColor: "bg-destructive text-destructive-foreground"
      };
    }
  };

  const performanceData = getPerformanceData(percentage);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background flex items-center justify-center p-2 sm:p-4 lg:p-6 font-sans overflow-hidden relative">
      
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(var(--foreground-rgb), 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(var(--foreground-rgb), 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px'
        }} />
      </div>

      {/* Floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-16 h-16 bg-primary/10 rounded-full blur-xl animate-floating" />
        <div className="absolute top-32 right-20 w-24 h-24 bg-accent/10 rounded-full blur-2xl animate-floating-delayed" />
        <div className="absolute bottom-20 left-32 w-20 h-20 bg-success/10 rounded-full blur-xl animate-floating-slow" />
        <div className="absolute bottom-32 right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-floating" />
      </div>

      {/* Confetti for achievements */}
      {(percentage === 100 || hasLeveledUp) && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={percentage === 100 ? 400 : 200}
          gravity={0.06}
          colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']}
        />
      )}

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        {/* Main Results Card */}
        <Card className={`
          relative overflow-hidden bg-card/95 backdrop-blur-sm border-2 ${performanceData.borderColor}
          shadow-lg hover:shadow-xl transition-all duration-700 animate-scale-in
        `}>
          
          {/* Subtle gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${performanceData.bgColor} opacity-50`} />
          
          <div className="relative z-10 p-4 sm:p-6 lg:p-8 space-y-6">
            
            {/* Header Section */}
            <div className="text-center space-y-4 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                {performanceData.icon}
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-wider">
                    MISSION COMPLETE!
                  </h1>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${performanceData.badgeColor} animate-pulse-fast mt-2`}>
                    {performanceData.rank} RANK
                  </div>
                </div>
              </div>
              
              <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground font-bold">
                {performanceData.message}
              </p>
              
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                {categoryName}
              </h2>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Score Section */}
              <Card className="bg-card border border-border p-4 sm:p-6 animate-slide-in-left">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground">ACCURACY SCORE</h3>
                    <Badge className={`text-lg sm:text-xl font-black px-3 py-1 ${performanceData.badgeColor} animate-number-count`}>
                      {percentage}%
                    </Badge>
                  </div>
                  
                  <div className="relative">
                    <Progress 
                      value={percentage} 
                      className="h-4 bg-muted border border-border overflow-hidden"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/10 to-transparent animate-shimmer" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-center animate-slide-in-left delay-200">
                      <CheckCircle className="h-6 w-6 text-success mx-auto mb-2 animate-check-mark" />
                      <div className="text-2xl font-black text-success animate-number-count">{correctAnswers}</div>
                      <div className="text-xs text-success/80 font-semibold">CORRECT</div>
                    </div>
                    
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center animate-slide-in-right delay-200">
                      <XCircle className="h-6 w-6 text-destructive mx-auto mb-2 animate-x-mark" />
                      <div className="text-2xl font-black text-destructive animate-number-count">{incorrectAnswers}</div>
                      <div className="text-xs text-destructive/80 font-semibold">INCORRECT</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Progress & Achievements */}
              <div className="space-y-4 animate-slide-in-right">
                
                {/* Knowledge Gained */}
                <Card className="bg-card border border-primary/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-primary animate-trend-up" />
                      </div>
                      <div>
                        <div className="font-bold text-primary">KNOWLEDGE GAINED</div>
                        <div className="text-sm text-muted-foreground">
                          Total: <span className="text-primary font-bold">{totalKnowledge}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="text-lg font-black bg-primary text-primary-foreground animate-bounce-in px-3 py-1">
                      +{knowledgeGained}
                    </Badge>
                  </div>
                </Card>

                {/* Level Up Achievement */}
                {hasLeveledUp && (
                  <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-2 border-accent/30 p-4 animate-level-up-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent/20 rounded-lg">
                          <Crown className="h-6 w-6 text-accent animate-crown-float" />
                        </div>
                        <div>
                          <div className="font-black text-accent text-lg animate-neon-glow">
                            LEVEL UP!
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Level {previousLevel} → <span className="text-accent font-bold">Level {currentLevel}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className="text-lg font-black bg-accent text-accent-foreground animate-level-badge px-3 py-1">
                        +{currentLevel - previousLevel}
                      </Badge>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            {/* Rating Section */}
            <Card className="bg-card border border-border p-4 animate-fade-in delay-500">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-bold text-foreground">
                  ⭐ RATE THIS MISSION ⭐
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
                        ${hasRated || isSubmittingRating ? "cursor-default" : "cursor-pointer hover:scale-125 hover:rotate-12"}
                        ${isSubmittingRating ? "animate-pulse" : ""}
                      `}
                    >
                      <StarIcon
                        className={`h-6 w-6 sm:h-8 sm:w-8 transition-all duration-200 ${
                          star <= (hoveredRating || rating)
                            ? "fill-accent text-accent animate-star-glow"
                            : "text-muted-foreground hover:text-accent/60"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {isSubmittingRating && (
                  <div className="text-sm text-muted-foreground animate-pulse">Transmitting feedback...</div>
                )}
                
                {ratingMessage && (
                  <div className={`text-sm font-bold animate-message ${
                    ratingMessage.includes("Thanks") 
                      ? "text-success animate-success-message" 
                      : "text-destructive animate-error-shake"
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
                className="h-12 sm:h-14 text-base font-black bg-success hover:bg-success/90 text-white transform transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl animate-button-glow"
              >
                <RefreshCw className="h-5 w-5 mr-2 group-hover:animate-spin" />
                REPLAY MISSION
              </Button>

              <Button
                onClick={() => navigate("/categories")}
                variant="outline"
                size="lg"
                className="h-12 sm:h-14 text-base font-black border-2 border-border text-foreground bg-background hover:bg-muted transform transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Home className="h-5 w-5 mr-2" />
                BACK TO CATEGORIES
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Enhanced CSS Animations */}
      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0.9) rotateY(-5deg); opacity: 0; }
          100% { transform: scale(1) rotateY(0deg); opacity: 1; }
        }
        
        @keyframes fade-in-up {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slide-in-left {
          0% { transform: translateX(-30px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slide-in-right {
          0% { transform: translateX(30px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes floating {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(180deg); }
        }
        
        @keyframes floating-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(-180deg); }
        }
        
        @keyframes floating-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(90deg); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes neon-glow {
          0%, 100% { text-shadow: 0 0 5px currentColor; }
          50% { text-shadow: 0 0 10px currentColor, 0 0 15px currentColor; }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse-fast {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        
        @keyframes level-up-card {
          0% { transform: scale(0.95); opacity: 0; }
          50% { transform: scale(1.02); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes crown-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-3px) rotate(3deg); }
          75% { transform: translateY(3px) rotate(-3deg); }
        }
        
        @keyframes star-glow {
          0%, 100% { filter: drop-shadow(0 0 3px currentColor); }
          50% { filter: drop-shadow(0 0 8px currentColor); }
        }
        
        @keyframes check-mark {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes x-mark {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes trend-up {
          0% { transform: translateY(2px); }
          50% { transform: translateY(-2px); }
          100% { transform: translateY(0px); }
        }
        
        @keyframes bounce-in {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        @keyframes level-badge {
          0% { transform: scale(0.8) rotateZ(90deg); opacity: 0; }
          50% { transform: scale(1.1) rotateZ(0deg); opacity: 0.8; }
          100% { transform: scale(1) rotateZ(0deg); opacity: 1; }
        }
        
        @keyframes number-count {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes button-glow {
          0%, 100% { box-shadow: 0 4px 15px rgba(var(--success-rgb), 0.3); }
          50% { box-shadow: 0 6px 20px rgba(var(--success-rgb), 0.4); }
        }
        
        @keyframes success-message {
          0% { transform: translateY(-5px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes error-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        
        .animate-scale-in { animation: scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out; }
        .animate-slide-in-left { animation: slide-in-left 0.6s ease-out; }
        .animate-slide-in-right { animation: slide-in-right 0.6s ease-out; }
        .animate-floating { animation: floating 6s ease-in-out infinite; }
        .animate-floating-delayed { animation: floating-delayed 8s ease-in-out infinite; }
        .animate-floating-slow { animation: floating-slow 10s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-neon-glow { animation: neon-glow 2s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .animate-pulse-fast { animation: pulse-fast 1.5s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animate-level-up-card { animation: level-up-card 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-crown-float { animation: crown-float 2s ease-in-out infinite; }
        .animate-star-glow { animation: star-glow 1.5s ease-in-out infinite; }
        .animate-check-mark { animation: check-mark 0.5s ease-out 0.2s both; }
        .animate-x-mark { animation: x-mark 0.5s ease-out 0.2s both; }
        .animate-trend-up { animation: trend-up 1s ease-in-out infinite; }
        .animate-bounce-in { animation: bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both; }
        .animate-level-badge { animation: level-badge 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both; }
        .animate-number-count { animation: number-count 0.6s ease-out 0.2s both; }
        .animate-button-glow { animation: button-glow 2s ease-in-out infinite; }
        .animate-success-message { animation: success-message 0.4s ease-out; }
        .animate-error-shake { animation: error-shake 0.4s ease-in-out; }
        .animate-fade-in { animation: fade-in-up 0.5s ease-out; }
        .animate-message { animation: fade-in-up 0.4s ease-out; }
        
        .delay-200 { animation-delay: 0.2s; }
        .delay-500 { animation-delay: 0.5s; }
        
        /* Responsive adjustments */
        @media (max-width: 640px) {
          .animate-scale-in { animation-duration: 0.4s; }
          .animate-floating, .animate-floating-delayed, .animate-floating-slow {
            animation-duration: 4s;
          }
        }
      `}</style>
    </div>
  );
}
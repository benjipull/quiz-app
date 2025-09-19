"use client";

import { useState } from "react";
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
} from "lucide-react";

// Assuming a custom component for cool effects
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
      percentageCorrect: string;
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

  const percentage = parseInt(percentageCorrect.replace('%', ''), 10);
  let performanceMessage = "Good effort! Keep practicing to improve.";
  if (percentage === 100) {
    performanceMessage = "🌟 Perfect score! You're a true master!";
  } else if (percentage >= 80) {
    performanceMessage = "🎉 Excellent job! You're almost at the top!";
  } else if (percentage >= 50) {
    performanceMessage = "👍 Solid performance! You're on the right track.";
  }

  const hasLeveledUp = currentLevel > previousLevel;

  return (
    <div className="min-h-screen bg-gradient-to-br from-quiz-background to-background flex items-center justify-center p-6 font-display overflow-hidden relative">
      {/* Confetti effect for perfect score or level up */}
      {(percentage === 100 || hasLeveledUp) && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={percentage === 100 ? 500 : 200}
          gravity={0.05}
        />
      )}

      {/* Background grid/pattern for a gaming vibe */}
      <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: "url('/path/to/gaming-grid.svg')" }}></div>
      <div className="absolute inset-0 z-0 bg-black/50 backdrop-blur-sm"></div>

      <Card className="z-10 p-8 w-full max-w-xl space-y-6 text-center shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] border-4 border-primary/50 transform transition-transform duration-500 animate-fade-in-up bg-background-light dark:bg-background-dark">
        {/* Animated Header with Icon */}
        <div className="flex flex-col items-center space-y-2">
          {percentage === 100 ? (
            <Award className="h-16 w-16 text-yellow-400 animate-award-spin drop-shadow-lg" />
          ) : hasLeveledUp ? (
            <TrendingUp className="h-16 w-16 text-purple-500 animate-pulse-slow drop-shadow-lg" />
          ) : (
            <TrendingUp className="h-16 w-16 text-blue-500 animate-pulse-slow drop-shadow-lg" />
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary tracking-wide leading-tight">
            MISSION COMPLETE!
          </h1>
          <p className="text-xl text-muted-foreground font-semibold italic">
            {performanceMessage}
          </p>
        </div>

        {/* --- */}

        {/* Results Summary Card with a more defined style */}
        <Card className="bg-card/90 border border-border-card rounded-xl p-4 transform transition-transform duration-300 hover:scale-[1.02] shadow-inner-strong">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold text-accent">{categoryName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Animated Progress Bar for Accuracy */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Accuracy</span>
                <Badge variant="default" className="text-lg font-bold bg-primary text-primary-foreground animate-pulse-fast">
                  {percentageCorrect}
                </Badge>
              </div>
              <Progress value={percentage} className="h-5 bg-gray-700 dark:bg-gray-800 animate-progress-fill" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="flex flex-col items-center space-y-1 p-2 bg-green-900/20 rounded-lg animate-slide-in-left">
                <CheckCircle className="h-8 w-8 text-green-400" />
                <div className="font-bold text-2xl text-green-300">{correctAnswers}</div>
                <div className="text-xs text-muted-foreground uppercase">Correct</div>
              </div>
              <div className="flex flex-col items-center space-y-1 p-2 bg-red-900/20 rounded-lg animate-slide-in-right">
                <XCircle className="h-8 w-8 text-red-400" />
                <div className="font-bold text-2xl text-red-300">{incorrectAnswers}</div>
                <div className="text-xs text-muted-foreground uppercase">Incorrect</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- */}

        {/* Animated Level and Knowledge Section */}
        <div className="space-y-4 pt-4">
          <Card className="p-4 bg-card/60 border border-accent/20 rounded-lg animate-fade-in-fast">
            <div className="flex justify-between items-center text-left">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-6 w-6 text-blue-400 animate-scale-up" />
                <div>
                  <div className="font-bold text-lg text-blue-300">Knowledge Gained</div>
                  <div className="text-sm text-muted-foreground">Your total knowledge score is now <span className="text-blue-300 font-bold">{totalKnowledge}</span>!</div>
                </div>
              </div>
              <Badge variant="outline" className="text-lg font-bold border-blue-400 text-blue-400 animate-bounce-in">
                +{knowledgeGained}
              </Badge>
            </div>
          </Card>

          {hasLeveledUp && (
            <Card className="p-4 bg-card/60 border border-purple-500/20 rounded-lg animate-fade-in-fast delay-200">
              <div className="flex justify-between items-center text-left">
                <div className="flex items-center space-x-2">
                  <Award className="h-6 w-6 text-purple-400 animate-level-up" />
                  <div>
                    <div className="font-bold text-lg text-purple-300">LEVEL UP!</div>
                    <div className="text-sm text-muted-foreground">You moved from <span className="text-purple-300 font-bold">Level {previousLevel}</span> to <span className="text-purple-300 font-bold">Level {currentLevel}</span>!</div>
                  </div>
                </div>
                <Badge variant="outline" className="text-lg font-bold border-purple-400 text-purple-400 animate-bounce-in">
                  +{currentLevel - previousLevel}
                </Badge>
              </div>
            </Card>
          )}
        </div>

        {/* --- */}

        {/* Rating Section with a more interactive feel */}
        <Card className="p-4 bg-card/60 animate-fade-in">
          <div className="text-center space-y-3">
            <div className="text-sm font-medium text-accent">Rate this mission!</div>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={hasRated || isSubmittingRating}
                  onClick={() => handleRatingSubmit(s)}
                  onMouseEnter={() => !hasRated && setHoveredRating(s)}
                  onMouseLeave={() => !hasRated && setHoveredRating(0)}
                  className={`p-1 transition-transform transform ${
                    hasRated || isSubmittingRating ? "cursor-default" : "cursor-pointer hover:scale-125"
                  } ${isSubmittingRating ? "opacity-50 animate-pulse" : ""}`}
                  aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
                >
                  <StarIcon
                    className={`h-8 w-8 transition-colors duration-200 ${
                      s <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400 drop-shadow-lg" : "text-gray-500 hover:text-yellow-400"
                    }`}
                  />
                </button>
              ))}
            </div>

            {isSubmittingRating && <div className="text-sm text-muted-foreground">Submitting rating...</div>}
            {ratingMessage && <div className={`text-sm font-bold ${ratingMessage.includes('Thanks') ? 'text-green-500 animate-fade-in' : 'text-red-500 animate-shake'}`}>{ratingMessage}</div>}
          </div>
        </Card>

        {/* --- */}

        {/* Action Buttons with glowing effects */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          <Button
            onClick={onPlayAgain}
            size="lg"
            className="h-12 text-base font-semibold bg-primary text-primary-foreground transform transition-transform hover:scale-105 border-2 border-primary-light glow-effect"
          >
            <RefreshCw className="h-5 w-5 mr-2 animate-spin-slow" />
            REPLAY MISSION
          </Button>

          <Button
            onClick={() => navigate("/categories")}
            variant="outline"
            size="lg"
            className="h-12 text-base font-semibold border-2 border-gray-400 text-gray-200 hover:bg-gray-800 glow-effect"
          >
            <Home className="h-5 w-5 mr-2" />
            BACK TO HQ
          </Button>
        </div>
      </Card>

      {/* Tailwind CSS keyframes for custom animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeIn 1s ease-out;
        }

        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin 5s linear infinite;
        }

        @keyframes progress-fill {
          from { width: 0%; }
          to { width: var(--progress-width, 100%); }
        }
        .animate-progress-fill {
          --progress-width: ${percentage}%;
          animation: progress-fill 1s ease-out forwards;
        }

        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.7s ease-out;
        }

        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.7s ease-out;
        }

        @keyframes level-up {
          0% { transform: scale(0.5) rotate(-30deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(10deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); }
        }
        .animate-level-up {
          animation: level-up 1s ease-out;
        }

        .glow-effect {
          box-shadow: 0 0 10px var(--primary-color), 0 0 20px var(--primary-color);
        }

        .glow-effect:hover {
          box-shadow: 0 0 15px var(--primary-color), 0 0 30px var(--primary-color), 0 0 50px var(--primary-color);
        }
      `}</style>
    </div>
  );
}
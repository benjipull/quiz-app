"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress"; // Assumed a component for progress bar
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  TrendingUp,
  Star as StarIcon,
  Home,
  RefreshCw,
  Award, // A new icon for a trophy or award
} from "lucide-react";

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

  // Rating state
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

  // Determine message based on performance
  const percentage = parseInt(percentageCorrect.replace('%', ''), 10);
  let performanceMessage = "Good effort! Keep practicing to improve.";
  if (percentage === 100) {
    performanceMessage = "🌟 Perfect score! You're a true master!";
  } else if (percentage >= 80) {
    performanceMessage = "🎉 Excellent job! You're almost at the top!";
  } else if (percentage >= 50) {
    performanceMessage = "👍 Solid performance! You're on the right track.";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-quiz-background to-background flex items-center justify-center p-6">
      <Card className="p-8 w-full max-w-xl space-y-6 text-center shadow-2xl border-4 border-primary/20 animate-fade-in-up">
        {/* Animated Header with Icon */}
        <div className="flex flex-col items-center space-y-2">
          {percentage === 100 ? (
            <Award className="h-16 w-16 text-yellow-500 animate-bounce-in" />
          ) : (
            <TrendingUp className="h-16 w-16 text-blue-500 animate-pulse-slow" />
          )}
          <h1 className="text-3xl md:text-4xl font-extrabold text-primary tracking-wide">
            Quiz Completed!
          </h1>
          <p className="text-xl text-muted-foreground font-semibold italic">
            {performanceMessage}
          </p>
        </div>

        {/* Results Summary Card */}
        <Card className="bg-card/70 border-none">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{categoryName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar for Accuracy */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-muted-foreground">Accuracy:</span>
                <Badge variant="default" className="text-lg font-bold bg-primary text-primary-foreground">
                  {percentageCorrect}
                </Badge>
              </div>
              <Progress value={percentage} className="h-4 bg-gray-200 dark:bg-gray-800 [&::-webkit-progress-value]:bg-green-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center space-y-1">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div className="font-semibold text-lg">{correctAnswers}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div className="flex flex-col items-center space-y-1">
                <XCircle className="h-8 w-8 text-red-500" />
                <div className="font-semibold text-lg">{incorrectAnswers}</div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Level and Knowledge Section */}
        <div className="space-y-4 pt-4">
          <Card className="p-4 bg-card/60">
            <div className="flex justify-between items-center text-left">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-6 w-6 text-blue-500" />
                <div>
                  <div className="font-bold text-lg">Knowledge Gained</div>
                  <div className="text-sm text-muted-foreground">Your total knowledge score is now **{totalKnowledge}**</div>
                </div>
              </div>
              <Badge variant="outline" className="text-lg font-bold border-blue-500 text-blue-500">
                +{knowledgeGained}
              </Badge>
            </div>
          </Card>

          <Card className="p-4 bg-card/60">
            <div className="flex justify-between items-center text-left">
              <div className="flex items-center space-x-2">
                <Award className="h-6 w-6 text-purple-500" />
                <div>
                  <div className="font-bold text-lg">Level Up!</div>
                  <div className="text-sm text-muted-foreground">You moved from **Level {previousLevel}** to **Level {currentLevel}**!</div>
                </div>
              </div>
              <Badge variant="outline" className="text-lg font-bold border-purple-500 text-purple-500">
                +{currentLevel - previousLevel}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Rating Section - Improved with state-based rendering */}
        <Card className="p-4 bg-card/60 animate-fade-in">
          <div className="text-center space-y-3">
            <div className="text-sm font-medium">How was this quiz?</div>
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
                    hasRated || isSubmittingRating ? "cursor-default" : "cursor-pointer hover:scale-110"
                  }`}
                  aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
                >
                  <StarIcon
                    className={`h-8 w-8 transition-colors ${
                      s <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>

            {isSubmittingRating && <div className="text-sm text-muted-foreground">Submitting rating...</div>}
            {ratingMessage && <div className={`text-sm ${ratingMessage.includes('Thanks') ? 'text-green-500' : 'text-red-500'}`}>{ratingMessage}</div>}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          <Button
            onClick={onPlayAgain}
            size="lg"
            className="h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transform transition-transform hover:scale-105"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Play Again
          </Button>

          <Button
            onClick={() => navigate("/categories")}
            variant="outline"
            size="lg"
            className="h-12 text-base font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Home className="h-5 w-5 mr-2" />
            Back to Categories
          </Button>
        </div>
      </Card>
    </div>
  );
}
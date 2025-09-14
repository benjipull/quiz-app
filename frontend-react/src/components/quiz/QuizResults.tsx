"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  TrendingUp,
  Star as StarIcon,
  Home,
  RefreshCw
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
  } = results as any; // keep flexible

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
        setRatingMessage("Thanks for your feedback!");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-quiz-background to-background flex items-center justify-center p-6">
      <Card className="p-8 w-full max-w-xl space-y-6 text-center shadow-lg border border-border/40">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">
          Quiz Results — {categoryName}
        </h1>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center space-y-2">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="font-semibold text-lg">{correctAnswers}</div>
            <div className="text-sm text-muted-foreground">Correct</div>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <XCircle className="h-8 w-8 text-red-500" />
            <div className="font-semibold text-lg">{incorrectAnswers}</div>
            <div className="text-sm text-muted-foreground">Incorrect</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center space-y-1">
            <Badge variant="outline" className="px-4 py-1 text-lg font-semibold">
              {percentageCorrect}
            </Badge>
            <div className="text-sm text-muted-foreground">Accuracy</div>
          </div>
          <div className="flex flex-col items-center space-y-1">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            <div className="font-semibold">{knowledgeGained} gained</div>
            <div className="text-sm text-muted-foreground">Knowledge</div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Total Knowledge: <span className="font-semibold">{totalKnowledge}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Previous Level: <span className="font-semibold">{previousLevel}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Current Level: <span className="font-semibold">{currentLevel}</span>
          </p>
        </div>

        {/* Rating */}
        <Card className="p-4 bg-card/60">
          <div className="text-center space-y-3">
            <div className="text-sm font-medium">How was this quiz?</div>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => {
                const active = s <= (hoveredRating || rating);
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={hasRated || isSubmittingRating}
                    onClick={() => handleRatingSubmit(s)}
                    onMouseEnter={() => !hasRated && setHoveredRating(s)}
                    onMouseLeave={() => !hasRated && setHoveredRating(0)}
                    className={`p-1 transition-transform ${
                      hasRated || isSubmittingRating ? "cursor-default" : "cursor-pointer hover:scale-110"
                    }`}
                    aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
                  >
                    <StarIcon
                      className={`h-8 w-8 transition-colors ${
                        active ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {isSubmittingRating && <div className="text-sm text-muted-foreground">Submitting rating...</div>}
            {ratingMessage && <div className="text-sm text-success">{ratingMessage}</div>}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <Button
            onClick={onPlayAgain}
            size="lg"
            className="h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Play Again
          </Button>

          <Button
            onClick={() => navigate("/categories")}
            variant="outline"
            size="lg"
            className="h-12 text-base font-semibold"
          >
            <Home className="h-5 w-5 mr-2" />
            Back
          </Button>
        </div>
      </Card>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Trophy, Star, RotateCcw, Home, Share2, TrendingUp, Target, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const QuizResults = ({ results, handleBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [rating, setRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);

  // Extracting results from props for consistency with the new structure
  const {
    totalQuestions = 0,
    correctAnswers = 0,
    categoryName = "Unknown Category", // Assuming categoryName will be passed or derived
    categoryId, // Assuming categoryId will be passed for retry
  } = results || {};

  const incorrectAnswers = totalQuestions - correctAnswers;
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  const getPerformanceLevel = () => {
    if (score >= 90) return { level: "Excellent!", color: "text-success", emoji: "🏆" };
    if (score >= 80) return { level: "Great Job!", color: "text-info", emoji: "🎉" };
    if (score >= 70) return { level: "Good Work!", color: "text-warning", emoji: "👍" };
    if (score >= 60) return { level: "Not Bad!", color: "text-warning", emoji: "👌" };
    return { level: "Keep Trying!", color: "text-destructive", emoji: "💪" };
  };

  const performanceDetails = getPerformanceLevel();

  useEffect(() => {
    if (score >= 70) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [score]);

  const handleRating = (stars) => {
    setRating(stars);
    setHasRated(true);
    // You would typically call an API here to save the rating
    console.log(`User rated category ${categoryName} with ${stars} stars.`);
  };

  const handleShare = () => {
    const text = `I just scored ${score}% on the ${categoryName} quiz! 🎯 Can you beat my score?`;
    if (navigator.share) {
      navigator.share({
        title: 'Quiz Results',
        text: text,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(text);
      alert("Results copied to clipboard!"); // Or use a toast notification
    }
  };

  const onPlayAgain = () => {
    // This assumes you pass categoryId as a prop or it's accessible through location.state
    navigate(`/quiz/${categoryId}`);
  };

  const onBackToCategories = () => {
    handleBack(); // Use the existing handleBack prop
  };

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Results not available yet.</p>
          <Button onClick={handleBack} className="btn-primary">Back to Categories</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg p-4 relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-10">
          {/* You'd need a CSS animation for confetti, e.g., a div that spawns confetti particles */}
          <div className="confetti-animation"></div>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-8 animate-slide-up">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-primary rounded-full flex items-center justify-center mb-4">
            <Trophy className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text">Quiz Complete!</h1>
          <p className="text-lg text-muted-foreground">Here's how you performed in {categoryName}</p>
        </div>

        {/* Score Card */}
        <div className="quiz-card text-center space-y-6">
          <div className="space-y-4">
            <div className="text-6xl md:text-8xl font-bold gradient-text">
              {score}%
            </div>
            <div className={`text-2xl font-semibold ${performanceDetails.color}`}>
              {performanceDetails.emoji} {performanceDetails.level}
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card/50 rounded-lg p-4 border border-border/50">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-muted-foreground">Correct</span>
              </div>
              <div className="text-2xl font-bold text-success">{correctAnswers}</div>
              <div className="text-sm text-muted-foreground">out of {totalQuestions}</div>
            </div>

            <div className="bg-card/50 rounded-lg p-4 border border-border/50">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Zap className="w-5 h-5 text-destructive" />
                <span className="text-sm font-medium text-muted-foreground">Incorrect</span>
              </div>
              <div className="text-2xl font-bold text-destructive">{incorrectAnswers}</div>
              <div className="text-sm text-muted-foreground">answers</div>
            </div>

            <div className="bg-card/50 rounded-lg p-4 border border-border/50">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Accuracy</span>
              </div>
              <div className="text-2xl font-bold text-primary">{score}%</div>
              <div className="text-sm text-muted-foreground">overall</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{correctAnswers}/{totalQuestions} correct</span>
            </div>
            <Progress value={score} className="h-3" />
          </div>

          {/* Achievement Badges */}
          <div className="flex justify-center space-x-2">
            {score >= 80 && (
              <Badge className="bg-success/20 text-success border-success/50">
                <TrendingUp className="w-3 h-3 mr-1" />
                High Score
              </Badge>
            )}
            {correctAnswers === totalQuestions && totalQuestions > 0 && (
              <Badge className="bg-warning/20 text-warning border-warning/50">
                🎯 Perfect Score!
              </Badge>
            )}
            {score >= 90 && (
                <div className="flex items-center justify-center space-x-2 p-4 bg-gradient-primary/10 rounded-lg border border-primary/20">
                    <Trophy className="w-5 h-5 text-primary" />
                    <Badge variant="default" className="bg-gradient-primary text-primary-foreground">
                        Perfect Performance! 🎉
                    </Badge>
                </div>
            )}
            {score >= 70 && score < 90 && (
                <div className="flex items-center justify-center space-x-2 p-4 bg-success/10 rounded-lg border border-success/20">
                    <Target className="w-5 h-5 text-success" />
                    <Badge variant="secondary" className="bg-success/20 text-success">
                        Great Job! 👏
                    </Badge>
                </div>
            )}
          </div>

          {/* Category Rating */}
          <div className="bg-card/30 backdrop-blur-sm rounded-xl p-6 border border-border/50">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Rate this category
            </h3>
            <div className="flex justify-center space-x-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  disabled={hasRated}
                  className={`transition-colors ${
                    star <= rating ? "text-warning" : "text-muted-foreground"
                  } ${hasRated ? "opacity-50 cursor-not-allowed" : "hover:text-warning"}`}
                >
                  <Star className={`w-6 h-6 ${star <= rating ? "fill-current" : ""}`} />
                </button>
              ))}
            </div>
            {hasRated && (
              <p className="text-sm text-muted-foreground">Thank you for your feedback!</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={onPlayAgain} variant="outline" size="lg" className="h-12">
            <RotateCcw className="w-5 h-5 mr-2" />
            Try Again
          </Button>
          <Button onClick={handleShare} variant="outline" size="lg" className="h-12">
            <Share2 className="w-5 h-5 mr-2" />
            Share Score
          </Button>
        </div>

        <div className="text-center">
          <Button onClick={onBackToCategories} className="btn-primary h-12 px-8">
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Motivational Message */}
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            {score >= 80
              ? "Outstanding! You're a quiz master! 🌟"
              : score >= 60
              ? "Well done! Keep up the great work! 💪"
              : "Practice makes perfect! Try another quiz! 📚"
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
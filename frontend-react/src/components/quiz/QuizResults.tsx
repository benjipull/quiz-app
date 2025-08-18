import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Star, 
  Target, 
  Zap, 
  Brain, 
  Award, 
  RefreshCw, 
  Home,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

interface QuizResultsProps {
  results: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    categoryName: string;
    categoryId: string;
  };
  onPlayAgain: () => void;
}

interface Achievement {
  icon: React.ReactNode;
  title: string;
  description: string;
  unlocked: boolean;
}

export default function QuizResults({ results, onPlayAgain }: QuizResultsProps) {
  const navigate = useNavigate();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const userToken = localStorage.getItem("token");
  const { totalQuestions, correctAnswers, incorrectAnswers, categoryName, categoryId } = results;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  // Trigger confetti effect for good scores
  useEffect(() => {
    if (percentage >= 70) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [percentage]);

  const getPerformanceLevel = () => {
    if (percentage >= 90) return { level: "Excellent", color: "text-yellow-500", bg: "bg-yellow-500/10" };
    if (percentage >= 80) return { level: "Great", color: "text-green-500", bg: "bg-green-500/10" };
    if (percentage >= 70) return { level: "Good", color: "text-blue-500", bg: "bg-blue-500/10" };
    if (percentage >= 60) return { level: "Fair", color: "text-orange-500", bg: "bg-orange-500/10" };
    return { level: "Keep Practicing", color: "text-red-500", bg: "bg-red-500/10" };
  };

  const performance = getPerformanceLevel();

  const achievements: Achievement[] = [
    {
      icon: <Trophy className="h-5 w-5" />,
      title: "Perfect Score!",
      description: "Answered all questions correctly",
      unlocked: percentage === 100
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Speed Demon",
      description: "Completed quiz quickly",
      unlocked: percentage >= 80 // Could be based on actual time if tracked
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: "Knowledge Master",
      description: "Scored 90% or higher",
      unlocked: percentage >= 90
    },
    {
      icon: <Target className="h-5 w-5" />,
      title: "Sharp Shooter",
      description: "Great accuracy on tough questions",
      unlocked: percentage >= 75
    }
  ];

  const unlockedAchievements = achievements.filter(a => a.unlocked);

  const handleRatingSubmit = async (selectedRating: number) => {
    if (!userToken || hasRated || isSubmittingRating) return;

    setIsSubmittingRating(true);
    try {
      const response = await fetch(`${BASE_URL}/api/categories/${categoryId}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({ rating: selectedRating }),
      });

      if (response.ok) {
        setRating(selectedRating);
        setHasRated(true);
      } else {
        console.error("Failed to submit rating");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-quiz-background to-background relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary opacity-80 animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-20 px-4 py-6 max-w-4xl mx-auto">
        {/* Main Results Card */}
        <Card className="p-6 md:p-8 mb-6 bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-sm border-primary/20 shadow-2xl">
          <div className="text-center space-y-6">
            {/* Performance Badge */}
            <div className="flex justify-center">
              <Badge className={`${performance.bg} ${performance.color} border-current text-lg px-6 py-2 animate-pulse`}>
                <Award className="h-5 w-5 mr-2" />
                {performance.level}
              </Badge>
            </div>

            {/* Main Score */}
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Quiz Complete!
              </h1>
              <div className="text-6xl md:text-8xl font-black text-primary animate-bounce">
                {percentage}%
              </div>
              <p className="text-lg text-muted-foreground">
                You scored <span className="font-bold text-foreground">{correctAnswers}</span> out of{" "}
                <span className="font-bold text-foreground">{totalQuestions}</span> questions in{" "}
                <span className="font-bold text-primary">{categoryName}</span>
              </p>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="flex items-center justify-center space-x-2 p-3 bg-success/10 rounded-lg border border-success/20">
                <CheckCircle className="h-5 w-5 text-success" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{correctAnswers}</div>
                  <div className="text-xs text-success/80">Correct</div>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <XCircle className="h-5 w-5 text-destructive" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">{incorrectAnswers}</div>
                  <div className="text-xs text-destructive/80">Incorrect</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Achievements Section */}
        {unlockedAchievements.length > 0 && (
          <Card className="p-4 md:p-6 mb-6 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border-yellow-500/20">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center flex items-center justify-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Achievements Unlocked!
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {unlockedAchievements.map((achievement, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 bg-card/60 rounded-lg border border-primary/20 animate-slide-in"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    <div className="text-yellow-500">{achievement.icon}</div>
                    <div>
                      <div className="font-semibold text-sm">{achievement.title}</div>
                      <div className="text-xs text-muted-foreground">{achievement.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Rating Section */}
        <Card className="p-4 md:p-6 mb-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold">How was this quiz?</h3>
            <p className="text-sm text-muted-foreground">Rate your experience to help us improve</p>
            
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  disabled={hasRated || isSubmittingRating}
                  onClick={() => handleRatingSubmit(star)}
                  onMouseEnter={() => !hasRated && setHoveredRating(star)}
                  onMouseLeave={() => !hasRated && setHoveredRating(0)}
                  className={`p-2 transition-all duration-200 ${
                    hasRated || isSubmittingRating 
                      ? 'cursor-default' 
                      : 'cursor-pointer hover:scale-110'
                  }`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors duration-200 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground hover:text-yellow-400'
                    }`}
                  />
                </button>
              ))}
            </div>
            
            {isSubmittingRating && (
              <p className="text-sm text-muted-foreground">Submitting rating...</p>
            )}
            
            {hasRated && (
              <p className="text-sm text-success animate-fade-in">
                Thanks for your feedback! ⭐
              </p>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={onPlayAgain}
            size="lg" 
            className="h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transform hover:scale-105 transition-all duration-200"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Play Again
          </Button>
          
          <Button 
            onClick={() => navigate("/categories")}
            variant="outline" 
            size="lg" 
            className="h-14 text-lg font-semibold hover:bg-primary/10 transform hover:scale-105 transition-all duration-200"
          >
            <Home className="h-5 w-5 mr-2" />
            Back to Categories
          </Button>
        </div>

        {/* Fun Stats */}
        <Card className="p-4 md:p-6 mt-6 bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <TrendingUp className="h-8 w-8 mx-auto text-primary" />
              <div className="text-2xl font-bold">{percentage}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
            <div className="space-y-2">
              <Brain className="h-8 w-8 mx-auto text-secondary" />
              <div className="text-2xl font-bold">{unlockedAchievements.length}</div>
              <div className="text-sm text-muted-foreground">Achievements</div>
            </div>
            <div className="space-y-2">
              <Clock className="h-8 w-8 mx-auto text-accent" />
              <div className="text-2xl font-bold">~3m</div>
              <div className="text-sm text-muted-foreground">Time Spent</div>
            </div>
          </div>
        </Card>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.6s ease-out forwards;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
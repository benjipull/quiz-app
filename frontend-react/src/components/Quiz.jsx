import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ThumbsUp, ThumbsDown, Timer, Brain } from "lucide-react"; // Import Lucide icons
import { Button } from "@/components/ui/button"; // Assuming your ShadCN Button component path
import { Progress } from "@/components/ui/progress"; // Assuming your ShadCN Progress component path
import { Badge } from "@/components/ui/badge"; // Assuming your ShadCN Badge component path

const Quiz = ({
  question,
  fetchNextQuestion,
  handleAnswer,
  currentQuestionIndex,
  loading,
  resetQuiz,
  updatePopularity,
  categoryName,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false); // New state to control explanation visibility
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30); // Timer state
  const navigate = useNavigate();

  // Total questions is fixed at 10 as per your original logic
  const totalQuestions = 10;
  const progress = ((currentQuestionIndex - 1) / totalQuestions) * 100;
  const isLastQuestion = currentQuestionIndex === totalQuestions;

  useEffect(() => {
    // Reset all states on question change
    setSelectedAnswer(null);
    setShowExplanation(false);
    setFeedbackGiven(false);
    setTimeLeft(30); // Reset timer for each new question

    // Start timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-select a random answer when time runs out
          if (!selectedAnswer && question && question.answers) {
            const randomAnswer =
              question.answers[
                Math.floor(Math.random() * question.answers.length)
              ];
            handleAnswerSelection(randomAnswer);
          }
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer); // Cleanup timer on component unmount or question change
  }, [question, currentQuestionIndex]);

  const handleAnswerSelection = (answer) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answer);
    setShowExplanation(true); // Show explanation after an answer is selected
    const isCorrect = answer === question.correct_answer;
    handleAnswer(isCorrect);
  };

  const handleBack = () => {
    resetQuiz();
    navigate("/");
  };

  const handleFeedback = (type) => {
    if (feedbackGiven) return;

    setFeedbackGiven(true);

    if (question._id) {
      // The `updatePopularity` function now needs to handle the type "up" (1) or "down" (-1)
      // based on the provided Quiz.tsx logic. Your original had 1 and 2.
      // Adjusting to match the provided Quiz.tsx logic for consistency:
      updatePopularity(question._id, type === "up" ? 1 : -1);
    } else {
      console.error("Question ID (_id) is missing");
    }
  };

  const getAnswerClassName = (answer) => {
    if (!selectedAnswer) {
      return "bg-card/50 hover:bg-card border-border/50 hover:border-primary/50 text-foreground cursor-pointer";
    }

    if (answer === selectedAnswer) {
      return answer === question.correct_answer
        ? "bg-success/20 border-success text-success"
        : "bg-destructive/20 border-destructive text-destructive";
    }

    if (answer === question.correct_answer) {
      return "bg-success/20 border-success text-success";
    }

    return "bg-muted/20 border-border/30 text-muted-foreground";
  };

  const getTimerColor = () => {
    if (timeLeft > 20) return "text-success";
    if (timeLeft > 10) return "text-warning";
    return "text-destructive";
  };

  if (loading || !question) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading quiz questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="hover:bg-card/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="text-center">
            <h1 className="text-xl font-bold gradient-text">
              {categoryName || "Quiz Challenge"}
            </h1>
            <div className="flex items-center justify-center space-x-2 mt-1">
              <Timer className={`w-4 h-4 ${getTimerColor()}`} />
              <span className={`text-sm font-medium ${getTimerColor()}`}>
                {timeLeft}s
              </span>
            </div>
          </div>

          <div className="w-10 h-10" /> {/* Spacer */}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Question {currentQuestionIndex} of {totalQuestions}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <div className="quiz-card animate-bounce-in">
          <div className="space-y-6">
            {/* Question */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Brain className="w-6 h-6 text-primary" />
                {question.difficulty && (
                  <Badge variant="secondary">{question.difficulty}</Badge>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-relaxed">
                {question.question}
              </h2>
            </div>

            {/* Answers */}
            <div className="grid gap-3 md:gap-4">
              {question.answers.map((answer, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelection(answer)}
                  disabled={!!selectedAnswer}
                  className={`p-4 md:p-6 rounded-xl border-2 text-left transition-all duration-500 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] ${getAnswerClassName(
                    answer
                  )}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary transition-all duration-300">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="text-base md:text-lg font-medium">
                      {answer}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div className="bg-card/30 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-border/50 animate-fade-in">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                        selectedAnswer === question.correct_answer
                          ? "bg-success text-white"
                          : "bg-destructive text-white"
                      }`}
                    >
                      {selectedAnswer === question.correct_answer ? "✓" : "✗"}
                    </div>
                    <div>
                      <p className="text-lg font-semibold">
                        {selectedAnswer === question.correct_answer
                          ? "Correct!"
                          : "Incorrect!"}
                      </p>
                      <p className="text-muted-foreground mt-2">
                        {question.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Feedback Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        Was this helpful?
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback("up")}
                        disabled={feedbackGiven}
                        className={feedbackGiven ? "opacity-50" : "hover:text-success"}
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback("down")}
                        disabled={feedbackGiven}
                        className={feedbackGiven ? "opacity-50" : "hover:text-destructive"}
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </Button>
                    </div>

                    <Button onClick={fetchNextQuestion} className="btn-primary">
                      {isLastQuestion ? "Finish Quiz" : "Next Question"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
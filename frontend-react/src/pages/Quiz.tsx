import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { QuizProgress } from "@/components/quiz/QuizProgress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, ThumbsUp, ThumbsDown, Flag, Lightbulb } from "lucide-react";

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

interface Question {
  _id: string;
  question: string;
  answers: string[];
  correct_answer: string;
  explanation: string;
  difficulty?: "Easy" | "Medium" | "Hard";
}

interface QuizState {
  started: boolean;
  completed: boolean;
  selectedCategory: { id: string; name: string } | null;
  question: Question | null;
  currentQuestionIndex: number;
  correctAnswers: number;
  incorrectAnswers: number;
  results: any;
  isAnswerSelected: boolean;
}

export default function Quiz() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  
  const [quizState, setQuizState] = useState<QuizState>({
    started: false,
    completed: false,
    selectedCategory: null,
    question: null,
    currentQuestionIndex: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    results: null,
    isAnswerSelected: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [categoryTitle, setCategoryTitle] = useState("Quiz");

  const userToken = localStorage.getItem("token");
  const totalQuestions = 10;
  const progress = ((quizState.currentQuestionIndex - 1) / totalQuestions) * 100;
  const isLastQuestion = quizState.currentQuestionIndex >= totalQuestions;

  useEffect(() => {
    if (categoryId && userToken) {
      startQuiz(categoryId);
    } else if (!userToken) {
      alert("❌ You must be logged in to play.");
      navigate("/categories");
    }
  }, [categoryId, userToken]);

  useEffect(() => {
    // Reset states on question change
    setSelectedAnswer(null);
    setShowExplanation(false);
    setFeedbackGiven(false);
    setTimeLeft(30);

    // Start timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-select a random answer when time runs out
          if (!selectedAnswer && quizState.question && quizState.question.answers) {
            const randomAnswer = quizState.question.answers[
              Math.floor(Math.random() * quizState.question.answers.length)
            ];
            handleAnswerSelection(randomAnswer);
          }
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState.question, quizState.currentQuestionIndex]);

  const startQuiz = async (categoryId: string) => {
    if (!userToken) {
      alert("❌ You must be logged in to play.");
      return;
    }

    // Fetch category name first
    try {
      const categoryResponse = await fetch(`${BASE_URL}/api/categories`);
      if (categoryResponse.ok) {
        const categories = await categoryResponse.json();
        const category = categories.find((cat: any) => cat._id === categoryId);
        if (category) {
          setCategoryTitle(category.name);
          setQuizState(prev => ({
            ...prev,
            selectedCategory: { id: categoryId, name: category.name }
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching category:", error);
    }

    setQuizState(prev => ({
      ...prev,
      started: true,
      completed: false,
      currentQuestionIndex: 0,
      isAnswerSelected: false,
      question: null,
      correctAnswers: 0,
      incorrectAnswers: 0,
      results: null,
    }));

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/startQuiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, numQuestions: 10, userToken }),
      });

      if (!response.ok) throw new Error("❌ Error starting quiz.");

      fetchNextQuestion();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextQuestion = async () => {
    if (!userToken || quizState.completed) return;

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/nextQuestion/${userToken}`);
      const data = await response.json();

      if (response.ok && data.question) {
        setQuizState((prev) => ({
          ...prev,
          question: data.question,
          currentQuestionIndex: prev.currentQuestionIndex + 1,
          isAnswerSelected: false,
        }));
      } else {
        await recordQuizCompletion();
        setQuizState((prev) => ({
          ...prev,
          completed: true,
          started: false,
        }));
      }
    } catch (error) {
      setError("Error fetching the next question.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelection = (answer: string) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answer);
    setShowExplanation(true);
    const isCorrect = answer === quizState.question?.correct_answer;
    
    setQuizState((prev) => ({
      ...prev,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      incorrectAnswers: prev.incorrectAnswers + (isCorrect ? 0 : 1),
      isAnswerSelected: true,
    }));
  };

  const recordQuizCompletion = async () => {
    if (!userToken || !quizState.selectedCategory) return;

    try {
      const { correctAnswers, incorrectAnswers } = quizState;
      const response = await fetch(
        `${BASE_URL}/api/categories/${quizState.selectedCategory.id}/completion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            questionsAttempted: 10,
            correctAnswers,
            incorrectAnswers,
          }),
        }
      );

      if (response.ok) {
        setQuizState((prev) => ({
          ...prev,
          results: {
            totalQuestions: 10,
            correctAnswers,
            incorrectAnswers,
            categoryName: prev.selectedCategory?.name,
            categoryId: prev.selectedCategory?.id,
          },
        }));
      } else {
        console.error("❌ Failed to record completion");
      }
    } catch (error) {
      setError("Error recording quiz completion.");
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setFeedbackGiven(false);
    setTimeLeft(30);
    fetchNextQuestion();
  };

  const handleFeedback = async (type: "up" | "down") => {
    if (feedbackGiven || !quizState.question?._id) return;

    setFeedbackGiven(true);

    try {
      const response = await fetch(`${BASE_URL}/api/updatePopularity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ 
          questionId: quizState.question._id, 
          action: type === "up" ? 1 : 2 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Failed to update popularity:", errorData.message || errorData);
      }
    } catch (err) {
      console.error("⚠️ Error updating popularity:", err);
    }
  };

  const getOptionStyle = (answer: string) => {
    if (selectedAnswer === null) {
      return "border-border hover:border-primary hover:bg-primary/5 cursor-pointer";
    }
    
    if (answer === quizState.question?.correct_answer) {
      return "border-success bg-success/10 text-success";
    }
    
    if (answer === selectedAnswer && answer !== quizState.question?.correct_answer) {
      return "border-destructive bg-destructive/10 text-destructive";
    }
    
    return "border-border bg-muted/30";
  };

  const getTimerColor = () => {
    if (timeLeft > 20) return "text-success";
    if (timeLeft > 10) return "text-warning";
    return "text-destructive";
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-quiz-background to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-500">Error</h2>
          <p className="text-gray-400">{error}</p>
          <Button onClick={() => navigate("/categories")} variant="default">
            Back to Categories
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !quizState.question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-quiz-background to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading quiz questions...</p>
        </div>
      </div>
    );
  }

  if (quizState.completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-quiz-background to-background flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Quiz Completed!</h2>
            <p>Score: {quizState.correctAnswers}/{totalQuestions}</p>
            <div className="space-y-2">
              <Button 
                onClick={() => navigate("/categories")} 
                variant="default" 
                className="w-full"
              >
                Back to Categories
              </Button>
              <Button 
                onClick={() => startQuiz(categoryId!)} 
                variant="outline" 
                className="w-full"
              >
                Play Again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-quiz-background to-background">
      <Header 
        title={categoryTitle} 
        showBack 
        onBack={() => navigate("/categories")}
      />
      
      <div className="px-4 lg:px-8 pb-20 max-w-full lg:max-w-2xl mx-auto">
        {/* Progress Section */}
        <div className="pt-4 space-y-4">
          <QuizProgress
            currentQuestion={quizState.currentQuestionIndex}
            totalQuestions={totalQuestions}
            correctAnswers={quizState.correctAnswers}
          />
          
          {/* Timer */}
          <Card className="p-3 bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Time Left</span>
              </div>
              <Badge 
                variant="outline" 
                className={`border-warning ${getTimerColor()} ${timeLeft <= 10 ? 'animate-pulse' : ''}`}
              >
                00:{timeLeft.toString().padStart(2, '0')}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Question Section */}
        <div className="mt-6 space-y-6">
          <Card className="p-6 bg-quiz-card border-primary/20 shadow-lg">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-foreground leading-relaxed">
                  {quizState.question.question}
                </h2>
                {quizState.question.difficulty && (
                  <Badge 
                    variant="outline" 
                    className={
                      quizState.question.difficulty === "Easy" ? "border-success text-success" :
                      quizState.question.difficulty === "Medium" ? "border-warning text-warning" :
                      "border-destructive text-destructive"
                    }
                  >
                    {quizState.question.difficulty}
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          {/* Options */}
          <div className="space-y-3">
            {quizState.question.answers.map((answer, index) => (
              <Card
                key={index}
                className={`p-4 transition-all duration-300 ${getOptionStyle(answer)} hover:shadow-md`}
                onClick={() => handleAnswerSelection(answer)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold text-sm transition-colors ${
                    selectedAnswer === answer ? 'bg-current text-white' : 'border-current'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="font-medium">{answer}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Explanation */}
          {showExplanation && quizState.question.explanation && (
            <Card className="p-4 bg-primary/5 border-primary/20 animate-slide-up">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-primary">
                    {selectedAnswer === quizState.question.correct_answer ? "Correct!" : "Incorrect!"}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {quizState.question.explanation}
                </p>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          {showExplanation && (
            <div className="space-y-4 animate-fade-in">
              {/* Feedback Buttons */}
              <Card className="p-4 bg-card/60">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-center">Was this question helpful?</p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleFeedback("up")}
                      disabled={feedbackGiven}
                      className={feedbackGiven ? "opacity-50" : "hover:text-success"}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Yes
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleFeedback("down")}
                      disabled={feedbackGiven}
                      className={feedbackGiven ? "opacity-50" : "hover:text-destructive"}
                    >
                      <ThumbsDown className="h-4 w-4" />
                      No
                    </Button>
                    <Button variant="outline" size="sm">
                      <Flag className="h-4 w-4" />
                      Report
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Next Button */}
              <Button 
                variant="default" 
                size="lg" 
                className="w-full"
                onClick={handleNextQuestion}
              >
                {isLastQuestion ? "Finish Quiz" : "Next Question"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
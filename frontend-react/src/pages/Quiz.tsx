"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, ThumbsUp, ThumbsDown, Flag, Lightbulb } from "lucide-react";
import QuizResults from "@/components/quiz/QuizResults";

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

interface Question {
  _id: string;
  question: string;
  answers: string[];
  correct_answer: string;
  explanation: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  answerStats?: { [key: string]: number };
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
  const explanationRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
  const [feedbackType, setFeedbackType] = useState<"up" | "down" | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [categoryTitle, setCategoryTitle] = useState("Quiz");
  const [timeUp, setTimeUp] = useState(false);

  const userToken = localStorage.getItem("token");
  const totalQuestions = 10;
  const progress = ((quizState.currentQuestionIndex - 1) / totalQuestions) * 100;
  const isLastQuestion = quizState.currentQuestionIndex >= totalQuestions;

  const correctSound = new Audio("/correct.mp3");
  const incorrectSound = new Audio("/incorrect.mp3");

  useEffect(() => {
    if (categoryId && userToken) {
      startQuiz(categoryId);
    } else if (!userToken) {
      console.log("❌ You must be logged in to play.");
      navigate("/categories");
    }
  }, [categoryId, userToken]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (quizState.question && !quizState.isAnswerSelected && !timeUp) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimeUp(true);
            setQuizState((prevState) => ({
              ...prevState,
              incorrectAnswers: prevState.incorrectAnswers + 1,
              isAnswerSelected: true,
            }));
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [quizState.question, quizState.isAnswerSelected, timeUp]);

  useEffect(() => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setFeedbackGiven(false);
    setFeedbackType(null);
    setTimeLeft(30);
    setTimeUp(false);
  }, [quizState.question, quizState.currentQuestionIndex]);
  
  useEffect(() => {
    if (showExplanation && explanationRef.current) {
      const viewportHeight = window.innerHeight;
      const elementRect = explanationRef.current.getBoundingClientRect();
      const isElementBelowFold = elementRect.top > viewportHeight * 0.8;
      const isElementCutOff = elementRect.bottom > viewportHeight;
      
      if (isElementBelowFold || isElementCutOff) {
        explanationRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }
  }, [showExplanation]);

  useEffect(() => {
    if (quizState.currentQuestionIndex > 0) {
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }
  }, [quizState.currentQuestionIndex]);

  const startQuiz = async (categoryId: string) => {
    if (!userToken) {
      console.log("❌ You must be logged in to play.");
      return;
    }

    setLoading(true);
    setError(null);
    setQuizState({
      started: true,
      completed: false,
      selectedCategory: null,
      question: null,
      currentQuestionIndex: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      results: null,
      isAnswerSelected: false,
    });

    try {
      const categoryResponse = await fetch(`${BASE_URL}/api/categories`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
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

      const startResponse = await fetch(`${BASE_URL}/api/startQuiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ categoryId, numQuestions: 10 }),
      });

      if (!startResponse.ok) throw new Error("❌ Error starting quiz session.");

      await fetchNextQuestion();

    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  };

  const fetchNextQuestion = async () => {
    if (!userToken || quizState.completed) return;

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/nextQuestion`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      const data = await response.json();

      if (response.ok && data.question) {
        const mockStats = data.question.answers.reduce((acc: any, answer: string, index: number) => {
          acc[answer] = Math.floor(Math.random() * 40) + 10;
          return acc;
        }, {});

        setQuizState((prev) => ({
          ...prev,
          question: { ...data.question, answerStats: mockStats },
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

  const handleVibration = (isCorrect: boolean) => {
    if ("vibrate" in navigator) {
      if (isCorrect) {
        // A single, short vibration for a correct answer
        navigator.vibrate(200);
      } else {
        // A pattern of two short vibrations for an incorrect answer
        navigator.vibrate([200, 100, 200]);
      }
    }
  };

  const handleAnswerSelection = (answer: string) => {
    if (selectedAnswer !== null || timeUp) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setSelectedAnswer(answer);
    setShowExplanation(true);
    const isCorrect = answer === quizState.question?.correct_answer;
    
    // Call the new vibration handler
    handleVibration(isCorrect);
    
    setQuizState((prev) => ({
      ...prev,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      incorrectAnswers: prev.incorrectAnswers + (isCorrect ? 0 : 1),
      isAnswerSelected: true,
    }));
    
    if (isCorrect) {
      correctSound.play();
    } else {
      incorrectSound.play();
    }
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
    if (isLastQuestion) {
      recordQuizCompletion();
      setQuizState((prev) => ({
        ...prev,
        completed: true,
        started: false,
      }));
      return;
    }
    fetchNextQuestion();
  };

  const handlePlayAgain = () => {
    if (categoryId) {
      startQuiz(categoryId);
    }
  };

  const handleFeedback = async (type: "up" | "down") => {
    if (feedbackGiven || !quizState.question?._id) return;

    setFeedbackGiven(true);
    setFeedbackType(type);

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
    if (timeUp) {
      return "border-border bg-muted/30 cursor-not-allowed opacity-50";
    }
    
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

  const getLetterStyle = (answer: string) => {
    if (timeUp) {
      return "border-current text-muted-foreground";
    }
    
    if (selectedAnswer === null) {
      return "border-current text-current";
    }
    
    if (answer === quizState.question?.correct_answer) {
      return "bg-success text-white border-success";
    }
    
    if (answer === selectedAnswer) {
      return "bg-destructive text-white border-destructive";
    }
    
    return "bg-muted text-muted-foreground border-border";
  };


  const getTimerColor = () => {
    if (timeLeft > 20) return "text-success";
    if (timeLeft > 10) return "text-warning";
    return "text-destructive";
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-quiz-background to-background flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl md:text-2xl font-bold text-red-500">Error</h2>
          <p className="text-sm md:text-base text-gray-400">{error}</p>
          <Button onClick={() => navigate("/categories")} variant="default" className="w-full">
            Back to Categories
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !quizState.question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-quiz-background to-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm md:text-base text-muted-foreground">Loading quiz questions...</p>
        </div>
      </div>
    );
  }

  if (quizState.completed && quizState.results) {
    return (
      <QuizResults
        results={quizState.results}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-quiz-background to-background">
      <div className="sticky top-0 z-30 bg-gradient-to-br from-quiz-background to-background border-b border-border/20 backdrop-blur-sm">
        <div className="px-4 py-3 md:py-4 max-w-full lg:max-w-4xl xl:max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/categories")}
              className="flex items-center gap-1 hover:bg-card/60 text-sm md:text-base px-2 py-1 flex-shrink-0 min-w-0"
            >
              <ArrowLeft className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Back</span>
            </Button>
            
            <div className="text-center flex-1 min-w-0 px-2">
              <div className="text-sm md:text-base font-semibold text-primary truncate">
                {categoryTitle}
              </div>
              <div className="text-xs text-muted-foreground">
                Question {quizState.currentQuestionIndex} of {totalQuestions}
              </div>
            </div>
            
            <div className="flex items-center gap-1 bg-card/60 backdrop-blur-sm rounded-full px-2 py-1 flex-shrink-0">
              <Clock className="h-4 w-4 text-warning flex-shrink-0" />
              <Badge 
                variant="outline" 
                className={`border-warning bg-transparent text-sm min-w-[40px] text-center ${getTimerColor()} ${timeLeft <= 10 ? 'animate-pulse' : ''}`}
              >
                {timeLeft}s
              </Badge>
            </div>
          </div>
          
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${((quizState.currentQuestionIndex - 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-full lg:max-w-4xl xl:max-w-6xl mx-auto">
        <div className="space-y-6">
          <div className="px-2 py-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground leading-relaxed flex-1">
                {quizState.question.question}
              </h2>
              {quizState.question.difficulty && (
                <Badge 
                  variant="outline" 
                  className={`text-sm self-start flex-shrink-0 ${
                    quizState.question.difficulty === "Easy" ? "border-success text-success" :
                    quizState.question.difficulty === "Medium" ? "border-warning text-warning" :
                    "border-destructive text-destructive"
                  }`}
                >
                  {quizState.question.difficulty}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {quizState.question.answers.map((answer, index) => (
              <Card
                key={index}
                className={`p-4 transition-all duration-300 ${getOptionStyle(answer)} hover:shadow-lg relative overflow-hidden cursor-pointer`}
                onClick={() => !timeUp && handleAnswerSelection(answer)}
              >
                {showExplanation && !timeUp && quizState.question.answerStats && (
                  <div 
                    className="absolute top-0 left-0 h-full bg-primary/15 transition-all duration-1000 ease-out rounded-r-md"
                    style={{ width: `${quizState.question.answerStats[answer] || 0}%` }}
                  />
                )}
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center font-semibold text-base md:text-lg transition-colors flex-shrink-0 ${getLetterStyle(answer)}`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center">
                    <span className="font-medium text-base md:text-lg leading-snug break-words">
                      {answer}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {timeUp && (
            <div ref={explanationRef}>
              <Card className="p-6 md:p-8 bg-destructive/5 border-destructive/20 animate-slide-up">
                <div className="text-center space-y-3">
                  <p className="font-semibold text-destructive text-base md:text-lg">⏰ Time's Up!</p>
                  <p className="text-sm md:text-base text-muted-foreground">
                    You didn't answer in time. This question is marked as incorrect.
                  </p>
                </div>
              </Card>
              
              <div className="mt-6 pb-4">
                <Button 
                  variant="default" 
                  size="lg" 
                  className="w-full h-14 md:h-16 text-base md:text-lg"
                  onClick={handleNextQuestion}
                >
                  {isLastQuestion ? "Finish Quiz" : "Next Question"}
                </Button>
              </div>
            </div>
          )}

          {showExplanation && !timeUp && quizState.question.explanation && (
            <div ref={explanationRef}>
              <Card className="p-6 md:p-8 bg-primary/5 border-primary/20 animate-slide-up">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Lightbulb className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-primary flex-shrink-0" />
                    <span className="font-semibold text-primary text-base md:text-lg lg:text-xl">
                      {selectedAnswer === quizState.question.correct_answer ? "Correct!" : "Incorrect!"}
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-foreground leading-relaxed">
                    {quizState.question.explanation}
                  </p>
                </div>
              </Card>

              <div className="mt-6 space-y-4 animate-fade-in pb-4">
                <Card className="p-4 md:p-6 bg-card/60">
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-center">Did you like this question?</p>
                    <div className="flex gap-4 justify-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleFeedback("up")}
                        disabled={feedbackGiven}
                        className={`text-sm flex-1 max-w-[120px] h-10 ${
                          feedbackType === "up" 
                            ? "bg-success/20 border-success text-success hover:bg-success/20 hover:text-success" 
                            : feedbackGiven 
                              ? "opacity-50" 
                              : "hover:text-success"
                        }`}
                      >
                        <ThumbsUp className="h-4 w-4 md:h-5 md:w-5" />
                        <span className="ml-1 sm:ml-2">Yes</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleFeedback("down")}
                        disabled={feedbackGiven}
                        className={`text-sm flex-1 max-w-[120px] h-10 ${
                          feedbackType === "down" 
                            ? "bg-destructive/20 border-destructive text-destructive hover:bg-destructive/20 hover:text-destructive" 
                            : feedbackGiven 
                              ? "opacity-50" 
                              : "hover:text-destructive"
                        }`}
                      >
                        <ThumbsDown className="h-4 w-4 md:h-5 md:w-5" />
                        <span className="ml-1 sm:ml-2">No</span>
                      </Button>
                      <Button variant="outline" size="sm" className="text-sm flex-1 max-w-[120px] h-10">
                        <Flag className="h-4 w-4 md:h-5 md:w-5" />
                        <span className="ml-1 sm:ml-2 hidden sm:inline">Report</span>
                      </Button>
                    </div>
                  </div>
                </Card>

                <Button 
                  variant="default" 
                  size="lg" 
                  className="w-full h-14 md:h-16 text-base md:text-lg"
                  onClick={handleNextQuestion}
                >
                  {isLastQuestion ? "Finish Quiz" : "Next Question"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
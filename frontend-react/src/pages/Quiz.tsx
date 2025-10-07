import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ThumbsUp, ThumbsDown, Flag, Lightbulb } from "lucide-react";
import QuizResults from "@/components/quiz/QuizResults";

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

interface Question {
  _id: string;
  question: string;
  answers: string[];
  correct_answer: string;
  explanation: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  difficultyName?: string;
  difficultyValue?: number; // Added for new difficulty logic
  timer?: number;
}

interface AnswerStats {
  text: string;
  percentage: number;
}

interface AnswerResponse {
  question: string;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
  answerStats: AnswerStats[];
  earnedItems: any[];
  remaining: number;
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
  userAnswers: Array<{
    questionId: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
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
    userAnswers: [],
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
  const [isCompletingQuiz, setIsCompletingQuiz] = useState(false);
  const [showBars, setShowBars] = useState(false);
  const [answerResponse, setAnswerResponse] = useState<AnswerResponse | null>(null);

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
      console.log("⚠️ You must be logged in to play.");
      navigate("/categories");
    }
  }, [categoryId, userToken]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const initialTime = quizState.question?.timer || 30;
    
    // Fix 2: Always reset the timer based on the question's 'timer' property 
    // when a new question loads (i.e., when quizState.question changes)
    if (quizState.question && !quizState.isAnswerSelected && !timeUp) {
      // We set time left here only if it's a new question to ensure 
      // the backend value is used, but we let the dependency array handle the main trigger.
      if (timeLeft !== initialTime) {
         setTimeLeft(initialTime);
      }

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimeUp(true);
            handleTimeUp();
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

  // This useEffect handles the scroll logic after bars animation completes
  useEffect(() => {
    if (showExplanation && explanationRef.current) {
      // Delay scroll to allow bars to finish animating first
      setTimeout(() => {
        if (explanationRef.current) {
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
      }, 500); // Delay to let bars finish animating
    }
  }, [showExplanation]);

  useEffect(() => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setFeedbackGiven(false);
    setFeedbackType(null);
    // Ensure timer is reset whenever question/index changes
    setTimeLeft(quizState.question?.timer || 30);
    setTimeUp(false);
    setShowBars(false);
    setAnswerResponse(null);
  }, [quizState.question, quizState.currentQuestionIndex]);

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
      console.log("⚠️ You must be logged in to play.");
      return;
    }

    setLoading(true);
    setError(null);
    setIsCompletingQuiz(false);
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
      userAnswers: [],
    });

    try {
      const categoryResponse = await fetch(`${BASE_URL}/api/categories`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
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
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({ categoryId, numQuestions: 10, userToken }),
      });

      if (!startResponse.ok) throw new Error("⚠️ Error starting quiz session.");

      await fetchNextQuestion();

    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  };

  const fetchNextQuestion = async () => {
    if (!userToken || quizState.completed || isCompletingQuiz) return;

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/nextQuestion/${userToken}`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
      });
      const data = await response.json();

      if (response.ok && data.question) {
        setQuizState((prev) => ({
          ...prev,
          question: data.question,
          currentQuestionIndex: prev.currentQuestionIndex + 1,
          isAnswerSelected: false,
        }));
      } else {
        // No more questions - complete the quiz
        await completeQuiz();
      }
    } catch (error) {
      setError("Error fetching the next question.");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUp = async () => {
    if (!userToken || !quizState.question) return;

    try {
      // Call answerQuestion API with empty answer for timeout
      const response = await fetch(`${BASE_URL}/api/answerQuestion/${userToken}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({ answer: "" }), // Empty answer for timeout
      });

      if (response.ok) {
        const answerData: AnswerResponse = await response.json();
        setAnswerResponse(answerData);

        setQuizState((prevState) => ({
          ...prevState,
          incorrectAnswers: prevState.incorrectAnswers + 1,
          isAnswerSelected: true,
          userAnswers: [
            ...prevState.userAnswers,
            {
              questionId: prevState.question?._id || "",
              selectedAnswer: "",
              correctAnswer: answerData.correctAnswer,
              isCorrect: false,
            }
          ]
        }));
      }
    } catch (error) {
      console.error("Error handling timeout:", error);
    }
  };

  const completeQuiz = async () => {
    if (!userToken || !quizState.selectedCategory || isCompletingQuiz) return;

    setIsCompletingQuiz(true);
    setLoading(true);

    try {
      const { correctAnswers, incorrectAnswers, userAnswers } = quizState;

      const completionPayload = {
        answers: userAnswers,
        score: correctAnswers,
        totalQuestions: totalQuestions,
        questionsAttempted: totalQuestions,
        correctAnswers,
        incorrectAnswers,
      };

      const response = await fetch(
        `${BASE_URL}/api/categories/${quizState.selectedCategory.id}/completion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify(completionPayload),
        }
      );

      if (response.ok) {
        const completionData = await response.json();

        setQuizState((prev) => ({
          ...prev,
          completed: true,
          started: false,
          results: {
            totalQuestions: totalQuestions,
            correctAnswers,
            incorrectAnswers,
            categoryName: prev.selectedCategory?.name,
            categoryId: prev.selectedCategory?.id,
            answers: userAnswers,
            completionData: completionData.results,
          },
        }));
      }
      else {
        console.error("⚠️ Failed to complete quiz");
        setError("Failed to complete quiz. Please try again.");
      }
    } catch (error) {
      console.error("Error completing quiz:", error);
      setError("Error completing quiz. Please try again.");
    } finally {
      setLoading(false);
      setIsCompletingQuiz(false);
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

  const handleAnswerSelection = async (answer: string) => {
    if (selectedAnswer !== null || timeUp || !userToken) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setSelectedAnswer(answer);
    setQuizState((prev) => ({
      ...prev,
      isAnswerSelected: true,
    }));

    try {
      // Call the answerQuestion API
      const response = await fetch(`${BASE_URL}/api/answerQuestion/${userToken}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({ answer }),
      });

      if (response.ok) {
        const answerData: AnswerResponse = await response.json();
        setAnswerResponse(answerData);

        const isCorrect = answerData.isCorrect;

        handleVibration(isCorrect);

        setQuizState((prev) => ({
          ...prev,
          correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
          incorrectAnswers: prev.incorrectAnswers + (isCorrect ? 0 : 1),
          userAnswers: [
            ...prev.userAnswers,
            {
              questionId: prev.question?._id || "",
              selectedAnswer: answer,
              correctAnswer: answerData.correctAnswer,
              isCorrect,
            }
          ]
        }));

        if (isCorrect) {
          correctSound.play().catch(() => {});
        } else {
          incorrectSound.play().catch(() => {});
        }

        // Show bars immediately after answer selection with staggered animation
        setTimeout(() => {
          setShowBars(true);
        }, 300);

        // Show explanation after bars have finished animating
        setTimeout(() => {
          setShowExplanation(true);
        }, 1800); // Reduced time for better flow
      } else {
        setError("Failed to submit answer. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      setError("Error submitting answer. Please try again.");
    } finally {
      // No longer using `setLoading` here as we're handling the UI state differently
    }
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      completeQuiz();
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
        console.error("⚠️ Failed to update popularity:", errorData.message || errorData);
      }
    } catch (err) {
      console.error("⚠️ Error updating popularity:", err);
    }
  };

  const getOptionStyle = (answer: string) => {
    if (timeUp) {
      return "bg-muted/30 cursor-not-allowed opacity-50";
    }

    if (selectedAnswer === null) {
      return "hover:bg-primary/5 cursor-pointer transition-colors";
    }

    // Use the correct answer from API response if available
    const correctAnswer = answerResponse?.correctAnswer || quizState.question?.correct_answer;

    if (answer === correctAnswer) {
      return "bg-success/10 text-success";
    }

    if (answer === selectedAnswer && answer !== correctAnswer) {
      return "bg-destructive/10 text-destructive";
    }

    return "bg-muted/30";
  };

  const getLetterStyle = (answer: string) => {
    if (timeUp) {
      return "text-muted-foreground";
    }

    if (selectedAnswer === null) {
      return "text-current";
    }

    // Use the correct answer from API response if available
    const correctAnswer = answerResponse?.correctAnswer || quizState.question?.correct_answer;

    if (answer === correctAnswer) {
      return "bg-success text-white";
    }

    if (answer === selectedAnswer) {
      return "bg-destructive text-white";
    }

    return "bg-muted text-muted-foreground";
  };

  const getTimerColor = () => {
    if (timeLeft > 20) return "text-success";
    if (timeLeft > 10) return "text-warning";
    return "text-destructive";
  };

  // New function to get difficulty color class
  const getDifficultyColor = () => {
    const difficulty = quizState.question?.difficultyValue;
    if (difficulty === undefined) return "";
    if (difficulty >= 1 && difficulty <= 3) return "border-success text-success bg-success/5";
    if (difficulty >= 4 && difficulty <= 5) return "border-blue-400 text-blue-400 bg-blue-400/5";
    if (difficulty >= 6 && difficulty <= 7) return "border-orange-400 text-orange-400 bg-orange-400/5";
    if (difficulty >= 8 && difficulty <= 10) return "border-destructive text-destructive bg-destructive/5";
    return "";
  };


  // Calculate answer percentages for display using API data
  const getAnswerPercentage = (answer: string) => {
    if (!answerResponse?.answerStats) return 0;

    const answerStat = answerResponse.answerStats.find(stat => stat.text === answer);
    return answerStat ? answerStat.percentage : 0;
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

  // The main loading state is only for initial load and fetching next questions
  if (loading || (!quizState.question && !quizState.completed)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-quiz-background to-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm md:text-base text-muted-foreground">
            {isCompletingQuiz ? "Completing quiz..." : "Loading quiz questions..."}
          </p>
        </div>
      </div>
    );
  }

  if (quizState.completed && quizState.results) {
    return (
      <QuizResults
      onClose={handlePlayAgain}
        results={quizState.results}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-quiz-background to-background">
      <div className="sticky top-0 z-30 bg-gradient-to-br from-quiz-background to-background backdrop-blur-sm">
        <div className="px-4 py-3 md:py-4 max-w-full lg:max-w-4xl xl:max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-2 mb-3">
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

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Difficulty Display */}
              {(quizState.question?.difficultyName || quizState.question?.difficulty) && (
                <Badge
                  variant="outline"
                  className={`text-xs ${getDifficultyColor()}`}
                >
                  {quizState.question?.difficultyName || quizState.question?.difficulty}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`bg-card/60 backdrop-blur-sm text-sm min-w-[40px] text-center ${getTimerColor()} ${timeLeft <= 10 ? 'animate-pulse' : ''}`}
              >
                {timeLeft}s
              </Badge>
            </div>
          </div>

          <div className="w-full bg-secondary rounded-full h-2 mb-2">
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
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground leading-relaxed">
              {quizState.question?.question}
            </h2>
          </div>

          <div className="space-y-3">
            {quizState.question?.answers.map((answer, index) => (
              <Card
                key={index}
                // Fix 1: Reduce borders. Removed `border border-transparent`
                className={`p-4 transition-all duration-300 ${getOptionStyle(answer)} ${!quizState.isAnswerSelected && 'hover:shadow-md'} relative overflow-hidden cursor-pointer`}
                onClick={() => !timeUp && !quizState.isAnswerSelected && handleAnswerSelection(answer)}
              >
                {/* Background percentage bar */}
                {quizState.isAnswerSelected && showBars && !timeUp && answerResponse && (
                  <div
                    className={`absolute top-0 left-0 h-full animate-bar-fill rounded-r-md ${
                      answer === (answerResponse?.correctAnswer || quizState.question?.correct_answer)
                        ? 'bg-success/25 border-l-4 border-success'
                        : answer === selectedAnswer
                          ? 'bg-destructive/25 border-l-4 border-destructive'
                          : 'bg-primary/15'
                    }`}
                    style={{
                      '--target-width': `${getAnswerPercentage(answer)}%`,
                      animationDelay: `${index * 150}ms`,
                      animationDuration: '0.8s'
                    } as React.CSSProperties}
                  />
                )}

                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold text-base md:text-lg transition-all duration-300 flex-shrink-0 ${getLetterStyle(answer)}`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <span className={`text-base md:text-lg leading-snug break-words ${selectedAnswer === null ? 'font-medium' : ''}`}>
                      {answer}
                    </span>
                    {quizState.isAnswerSelected && showBars && !timeUp && answerResponse && (
                      <span
                        className="text-sm font-semibold text-foreground ml-2 animate-fade-in-delayed"
                        style={{ animationDelay: `${1000 + (index * 150)}ms` }}
                      >
                        {getAnswerPercentage(answer)}%
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {timeUp && (
            <div ref={explanationRef}>
              <Card className="p-6 md:p-8 bg-destructive/5 animate-slide-up border-transparent">
                <div className="text-center space-y-3">
                  <p className="font-semibold text-destructive text-base md:text-lg">⏰ Time's Up!</p>
                  <p className="text-sm md:text-base text-muted-foreground">
                    You didn't answer in time. This question is marked as incorrect.
                  </p>
                  {answerResponse?.correctAnswer && (
                    <p className="text-sm md:text-base text-muted-foreground">
                      The correct answer was: <span className="font-semibold text-success">{answerResponse.correctAnswer}</span>
                    </p>
                  )}
                </div>
              </Card>

              <div className="mt-6 pb-4">
                <Button
                  variant="default"
                  size="lg"
                  className="w-full h-14 md:h-16 text-base md:text-lg"
                  onClick={handleNextQuestion}
                  disabled={isCompletingQuiz}
                >
                  {isCompletingQuiz ? "Completing..." : isLastQuestion ? "Finish Quiz" : "Next Question"}
                </Button>
              </div>
            </div>
          )}
          {showExplanation && !timeUp && answerResponse && (
            <div ref={explanationRef}>
              <Card className="p-6 md:p-8 bg-primary/5 animate-slide-up border-transparent">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Lightbulb className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-primary flex-shrink-0" />
                    <span className="font-semibold text-primary text-base md:text-lg lg:text-xl">
                      {answerResponse.isCorrect ? "Correct!" : "Incorrect!"}
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-foreground leading-relaxed">
                    {answerResponse.explanation}
                  </p>
                </div>
              </Card>

              <div className="mt-6 space-y-4 animate-fade-in pb-4">
                <Card className="p-4 md:p-6 bg-card/40 border-transparent">
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
                      <Button variant="outline" size="sm" className="text-sm flex-1 max-w-[120px] h-10 border-transparent">
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
                  disabled={isCompletingQuiz}
                >
                  {isCompletingQuiz ? "Completing..." : isLastQuestion ? "Finish Quiz" : "Next Question"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
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

        @keyframes bar-fill {
          from {
            width: 0%;
          }
          to {
            width: var(--target-width);
          }
        }

        @keyframes fade-in-delayed {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }

        .animate-bar-fill {
          animation: bar-fill ease-out forwards;
        }

        .animate-fade-in-delayed {
          animation: fade-in-delayed 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}

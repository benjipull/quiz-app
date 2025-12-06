import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ThumbsUp, ThumbsDown, Flag, X } from "lucide-react";
import QuizResults from "@/components/quiz/QuizResults";
import {
  trackQuizStart,
  trackQuestionAnswered,
  trackQuizComplete,
} from "@/utils/analytics";

const StarfieldBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars: Array<{ x: number; y: number; size: number; speed: number; opacity: number }> = [];
    const numStars = 50;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.05,
        opacity: Math.random() * 0.4 + 0.3
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });
      
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
};

const ConfirmationDialog = ({ title, description, onConfirm, onCancel, confirmText, cancelText }: any) => (
  <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <Card className="max-w-sm w-full p-6 space-y-4 bg-primary]">
      <h3 className="text-lg text-warning font-bold">{title}</h3>
      <p className="text-sm text-white">{description}</p>
      <div className="flex justify-end gap-3">
        <Button variant="default" onClick={onCancel} className="border-green-600 text-white">{cancelText}</Button>
        <Button variant="outline" className="text-white border-red-600 bg-red-700" onClick={onConfirm}>{confirmText}</Button>
      </div>
    </Card>
  </div>
);

interface ReportDialogProps {
  onClose: () => void;
  onSubmit: (reason: string, otherText: string) => void;
  isSubmitting: boolean;
  isThankYou: boolean;
}

const ReportDialog = ({ onClose, onSubmit, isSubmitting, isThankYou }: ReportDialogProps) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');

  const reportOptions = [
    { value: "incorrect_answer", label: "Incorrect Answer" },
    { value: "multiple_correct_answers", label: "Multiple Correct Answers" },
    { value: "ambiguous_wording", label: "Ambiguous or Poorly Worded Question" },
    { value: "duplicate_question", label: "Duplicate Question" },
    { value: "offensive_content", label: "Offensive or Inappropriate Content" },
    { value: "other", label: "Other (please describe)" },
  ];

  const handleSubmit = () => {
    if (selectedReason) {
      const text = selectedReason === "other" ? otherText : "";
      onSubmit(selectedReason, text);
    }
  };

  const isSubmitDisabled = !selectedReason || (selectedReason === "other" && otherText.trim() === '') || isSubmitting;

  const CloseButton = () => (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClose}
      disabled={isSubmitting}
      className="bg-red-600 hover:bg-red-700 rounded-full h-8 w-8 p-1 text-white"
      aria-label="Close"
    >
      <X className="h-5 w-5" />
    </Button>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">{isThankYou ? "Thank You!" : "Report Question Issue"}</h3>
          <CloseButton />
        </div>

        {isThankYou ? (
          <div className="text-center space-y-4">
            <p className="text-base text-muted-foreground">
              Thank you for helping us improve our quiz! Your feedback is highly appreciated.
            </p>
            <Button onClick={onClose} variant="default">Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please select the issue that best describes the problem with this question.
            </p>

            <div className="space-y-2">
              {reportOptions.map((option) => (
                <div
                  key={option.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedReason === option.value
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted border-border"
                    }`}
                  onClick={() => setSelectedReason(option.value)}
                >
                  <label className="flex items-start space-x-2 cursor-pointer font-medium text-sm">
                    <input
                      type="radio"
                      name="report-issue"
                      value={option.value}
                      checked={selectedReason === option.value}
                      onChange={() => setSelectedReason(option.value)}
                      className="hidden"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold">{option.label}</span>
                    </div>
                  </label>
                </div>
              ))}
            </div>

            {selectedReason === "other" && (
              <div>
                <textarea
                  placeholder="Describe the issue..."
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  className="w-full p-3 border rounded-lg resize-none text-sm text-gray-900 focus:ring-primary focus:border-primary mt-2"
                  rows={3}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="text-red-500 border-red-600 hover:bg-red-600 hover:text-white"
                onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button
                variant="default"
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface Question {
  _id: string;
  question: string;
  answers: string[];
  correct_answer: string;
  explanation: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  difficultyName?: string;
  difficultyLevel?: number;
  timerInSeconds?: number;
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
  const location = useLocation();
  const explanationRef = useRef<HTMLDivElement>(null);
  const timerInSecondsRef = useRef<NodeJS.Timeout | null>(null);
  // FIX: hasStartedRef is the key to prevent double execution in React Strict Mode
  const hasStartedRef = useRef(false);
  
  const nextQuestionRef = useRef<Question | null>(null);
  const isPreloadingRef = useRef(false);

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
  const [categoryImage, setCategoryImage] = useState<string | undefined>(undefined);
  const [timeUp, setTimeUp] = useState(false);
  const [isCompletingQuiz, setIsCompletingQuiz] = useState(false);
  const [showBars, setShowBars] = useState(false);
  const [answerResponse, setAnswerResponse] = useState<AnswerResponse | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(10);

  const userToken = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const userId = storedUser ? JSON.parse(storedUser)._id : null;

  const isLastQuestion = quizState.currentQuestionIndex >= totalQuestions;

  const startSound = new Audio("/intro-sound.mp3");
  const correctSound = new Audio("/victory-beat.mp3");
  const incorrectSound = new Audio("/incorrect.mp3");

  const handleBackNavigation = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate("/");
    }
  };

  const handleReportQuestion = async (reason: string, otherText: string) => {
    if (!quizState.question?._id) return;

    setIsReporting(true);
    setReportSuccess(false);

    try {
      const payload = {
        questionId: quizState.question._id,
        reason: reason,
        otherText: otherText,
      };

      const response = await fetch(`${BASE_URL}/api/reportQuestion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setReportSuccess(true);
      } else {
        console.error("Failed to submit report.");
        setReportSuccess(false);
      }
    } catch (err) {
      console.error("Error submitting report:", err);
      setReportSuccess(false);
    } finally {
      setIsReporting(false);
    }
  };

  const closeReportDialog = () => {
    const wasSuccessful = reportSuccess; 

    setShowReportDialog(false);
    setReportSuccess(false);

    if (wasSuccessful) {
      handleNextQuestion();
    }
  };

  const preloadNextQuestion = async () => {
    if (!userToken || isPreloadingRef.current || isLastQuestion) return;

    isPreloadingRef.current = true;
    try {
      const response = await fetch(`${BASE_URL}/api/nextQuestion/${userToken}`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
      });
      const data = await response.json();

      if (response.ok && data.question) {
        const questionWithTimer = {
          ...data.question,
          timerInSeconds: data.timerInSeconds,
        };
        nextQuestionRef.current = questionWithTimer;
      } else {
        nextQuestionRef.current = null;
      }
    } catch (error) {
      console.error("Error preloading next question:", error);
      nextQuestionRef.current = null;
    } finally {
      isPreloadingRef.current = false;
    }
  };

  useEffect(() => {
  let isSubscribed = true;
  let isMounted = true;
  
  const initQuiz = async () => {
    // Triple protection against double calls
    if (!isSubscribed || !isMounted) return;
    if (hasStartedRef.current) return;
    if (!categoryId || !userToken) {
      if (!userToken) {
        console.log("You must be logged in to play.");
        navigate("/categories");
      }
      return;
    }
    
    // Set the ref IMMEDIATELY before any async operations
    hasStartedRef.current = true;
    
    // Check one more time after setting the ref
    if (isSubscribed && isMounted) {
      await startQuiz(categoryId);
    }
  };
  
  initQuiz();
  
  // Cleanup function
  return () => {
    isSubscribed = false;
    isMounted = false;
  };
}, [categoryId, userToken]); 

  useEffect(() => {
    if (timerInSecondsRef.current) {
      clearInterval(timerInSecondsRef.current);
    }

    if (quizState.question && !quizState.isAnswerSelected && !timeUp) {
      timerInSecondsRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimeUp(true);
            handleTimeUp();
            if (timerInSecondsRef.current) {
              clearInterval(timerInSecondsRef.current);
              timerInSecondsRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerInSecondsRef.current) {
        clearInterval(timerInSecondsRef.current);
        timerInSecondsRef.current = null;
      }
    };
  }, [quizState.question, quizState.isAnswerSelected, timeUp]);

  useEffect(() => {
    if (showExplanation && explanationRef.current) {
      setTimeout(() => {
        if (explanationRef.current) {
          explanationRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 300);
    }
  }, [showExplanation]);

  useEffect(() => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setFeedbackGiven(false);
    setFeedbackType(null);

    const newTime = quizState.question?.timerInSeconds || 30;
    setTimeLeft(newTime);

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
    console.log("You must be logged in to play.");
    return;
  }

  // FRONTEND CHECK: If already loading or started, don't proceed
  if (loading || quizState.started) {
    console.log("Quiz already starting or in progress");
    return;
  }

  setLoading(true);
  setError(null);
  setIsCompletingQuiz(false);

  setQuizState({
    started: true, // Set this IMMEDIATELY
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
  setCategoryImage(undefined);
  setTotalQuestions(10);
  nextQuestionRef.current = null;

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
        setCategoryImage(category.imageUrl || category.image);
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
      body: JSON.stringify({ categoryId, userToken }),
    });

    if (!startResponse.ok) {
      // If the start fails, we must allow a retry, so we reset the ref.
      // This is only safe because the server side also handles refunding the coins.
      hasStartedRef.current = false;
      
      const errorData = await startResponse.json();
      
      // If it's a "quiz already starting" error, don't show error
      if (startResponse.status === 400 || startResponse.status === 429) {
        console.log("Quiz already in progress or starting");
        setLoading(false);
        return;
      }
      
      throw new Error(errorData.message || "Error starting quiz session.");
    } else {
      const startData = await startResponse.json();
      
      if (startData.total) {
        setTotalQuestions(startData.total);
        console.log(`Quiz started with ${startData.total} questions`);
      }
      
      trackQuizStart(categoryId, userId);
      await fetchNextQuestion();
    }

  } catch (error: any) {
    setError(error.message);
    setLoading(false);
    hasStartedRef.current = false; // Reset on error
  }
};
  const fetchNextQuestion = async () => {
    if (!userToken || quizState.completed || isCompletingQuiz) return;

    setLoading(true);
    try {
      if (nextQuestionRef.current) {
        const questionWithTimer = nextQuestionRef.current;
        nextQuestionRef.current = null;

        setQuizState((prev) => {
          const newIndex = prev.currentQuestionIndex + 1;
          if (newIndex === 1) {
            startSound.play().catch(() => { });
          }
          return {
            ...prev,
            question: questionWithTimer,
            currentQuestionIndex: newIndex,
            isAnswerSelected: false,
          };
        });
        setLoading(false);
        return;
      }

      const response = await fetch(`${BASE_URL}/api/nextQuestion/${userToken}`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
      });
      const data = await response.json();

      if (response.ok && data.question) {
        const questionWithTimer = {
          ...data.question,
          timerInSeconds: data.timerInSeconds,
        };

        setQuizState((prev) => {
          const newIndex = prev.currentQuestionIndex + 1;
          if (newIndex === 1) {
            startSound.play().catch(() => { });
          }
          return {
            ...prev,
            question: questionWithTimer,
            currentQuestionIndex: newIndex,
            isAnswerSelected: false,
          };
        });
      } else {
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
      const response = await fetch(`${BASE_URL}/api/answerQuestion/${userToken}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({ answer: "" }),
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
        
        setTimeout(() => {
          setShowBars(true);
        }, 300);

        if (!isLastQuestion) {
          preloadNextQuestion();
        }
      }
    } catch (error) {
      console.error("Error handling timeout:", error);
    }
  };
  
  const completeQuiz = async () => {
    if (quizState.completed || isCompletingQuiz || !userToken || !quizState.selectedCategory) return;

    setIsCompletingQuiz(true);
    setLoading(true);

    try {
      const { correctAnswers, userAnswers } = quizState;

      const completionPayload = {
        answers: userAnswers,
        score: correctAnswers,
        totalQuestions: totalQuestions,
        questionsAttempted: totalQuestions,
        correctAnswers,
        incorrectAnswers: totalQuestions - correctAnswers,
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
        trackQuizComplete(quizState.selectedCategory.id, quizState.correctAnswers, userId);
        setQuizState((prev) => ({
          ...prev,
          completed: true,
          started: false,
          results: {
            totalQuestions: totalQuestions,
            correctAnswers: prev.correctAnswers,
            incorrectAnswers: prev.incorrectAnswers,
            categoryName: prev.selectedCategory?.name,
            categoryId: prev.selectedCategory?.id,
            answers: userAnswers,
            completionData: completionData.results,
          },
        }));
      }
      else {
        console.error("Failed to complete quiz");
        setError("Failed to complete quiz. Please try again.");
      }
    } catch (error) {
      console.error("Error completing quiz:", error);
      setError("Error completing quiz. Please try again.");
    } finally {
      setLoading(false);
      if (!quizState.completed) { 
        setIsCompletingQuiz(false); 
      }
    }
  };

  const handleVibration = (isCorrect: boolean) => {
    if ("vibrate" in navigator) {
      if (isCorrect) {
        navigator.vibrate(200);
      } else {
        navigator.vibrate([200, 100, 200]);
      }
    }
  };

  const handleAnswerSelection = async (answer: string) => {
    if (selectedAnswer !== null || timeUp || !userToken) return;

    if (timerInSecondsRef.current) {
      clearInterval(timerInSecondsRef.current);
      timerInSecondsRef.current = null;
    }

    setSelectedAnswer(answer);
    setQuizState((prev) => ({
      ...prev,
      isAnswerSelected: true,
    }));

    try {
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
          correctSound.play().catch(() => { });
        } else {
          incorrectSound.play().catch(() => { });
        }

        trackQuestionAnswered(quizState.question?._id || "", isCorrect, userId);

        setTimeout(() => {
          setShowBars(true);
        }, 300);

        setTimeout(() => {
          setShowExplanation(true);
        }, 1200);

        if (!isLastQuestion) {
          preloadNextQuestion();
        }

      } else {
        setError("Failed to submit answer. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      setError("Error submitting answer. Please try again.");
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
    // Reset hasStartedRef to allow quiz to start again
    hasStartedRef.current = false;
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
        console.error("Failed to update popularity:", errorData.message || errorData);
      }
    } catch (err) {
      console.error("Error updating popularity:", err);
    }
  };

  const getOptionStyle = (answer: string) => {
    const baseStyle = "border-2 transition-all duration-300 backdrop-blur-sm";
    const baseColor = "border-purple-500/50 text-white";
    const hoverStyle = "hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/30 cursor-pointer";
    const selectedStyle = "pointer-events-none";

    if (timeUp) {
      return `${baseStyle} ${baseColor} pointer-events-none`;
    }

    if (selectedAnswer === null) {
      return `${baseStyle} ${baseColor} ${hoverStyle}`;
    }

    const correctAnswer = answerResponse?.correctAnswer || quizState.question?.correct_answer;

    if (answer === correctAnswer) {
      return `${baseStyle} ${selectedStyle} border-green-400 bg-gradient-to-r from-green-600/30 to-green-500/30 text-green-100 shadow-xl shadow-green-500/40`;
    }

    if (answer === selectedAnswer && answer !== correctAnswer) {
      return `${baseStyle} ${selectedStyle} border-red-400 bg-gradient-to-r from-red-600/30 to-red-500/30 text-red-100 shadow-xl shadow-red-500/40`;
    }

    return `${baseStyle} ${selectedStyle} border-purple-500/40 bg-purple-900/30`;
  };

  const gettimerInSecondsColor = () => {
    if (timeLeft > 20) return "text-green-400 border-green-400";
    if (timeLeft > 10) return "text-yellow-400 border-yellow-400";
    return "text-red-400 border-red-400";
  };

  const getDifficultyColor = () => {
    const difficulty = quizState.question?.difficultyLevel;
    if (difficulty === undefined) return "";
    if (difficulty >= 1 && difficulty <= 3) return "border-green-400 text-green-300 bg-green-500/20";
    if (difficulty >= 4 && difficulty <= 5) return "border-blue-400 text-blue-300 bg-blue-500/20";
    if (difficulty >= 6 && difficulty <= 7) return "border-orange-400 text-orange-300 bg-orange-500/20";
    if (difficulty >= 8 && difficulty <= 10) return "border-red-400 text-red-300 bg-red-500/20";
    return "";
  };

  const getAnswerPercentage = (answer: string) => {
    if (!answerResponse?.answerStats) return 0;

    const answerStat = answerResponse.answerStats.find(stat => stat.text === answer);
    return answerStat ? answerStat.percentage : 0;
  };
  
  const getInitialOptionAuraStyle = (answer: string) => {
      if (selectedAnswer !== null || timeUp) return {};

      return {
          background: 'linear-gradient(90deg, rgba(30, 0, 60, 0.8), rgba(40, 0, 80, 0.8))',
          border: '2px solid rgba(147, 51, 234, 0.6)',
          boxShadow: '0 0 15px rgba(192, 38, 211, 0.5), inset 0 0 8px rgba(232, 121, 249, 0.4)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
      };
  }

  const QuizBase = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col min-h-[100dvh] relative overflow-hidden"> 
      <div className="fixed inset-0 bg-gradient-to-br from-[#0c031c] via-[#1a0b2e] to-[#2d1b4e]" style={{ zIndex: 0 }} />
      <StarfieldBackground />
      {categoryImage && (
        <div 
          className="fixed inset-0 opacity-10"
          style={{
            backgroundImage: `url(${categoryImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
          }}
        />
      )}
      <div className="relative z-10 h-full"> 
        {children}
      </div>
    </div>
  );

  if (error) {
    return (
      <QuizBase>
        <div className="min-h-[100dvh] flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl md:text-2xl font-bold text-red-400">Error</h2>
            <p className="text-sm md:text-base text-purple-200">{error}</p>
            <Link to='/all-quizzes' className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl inline-block mt-4 border-0">
              Back to Quizzes
            </Link>
          </div>
        </div>
      </QuizBase>
    );
  }

  if (loading || (!quizState.question && !quizState.completed)) {
    return (
      <QuizBase>
        <div className=" min-h-[100dvh] flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-purple-400 mx-auto"></div>
            <p className="text-sm md:text-base text-purple-200">
              {isCompletingQuiz ? "Completing quiz..." : "Loading quiz questions..."}
            </p>
          </div>
        </div>
      </QuizBase>
    );
  }

  if (quizState.completed && quizState.results) {
    return (
      <QuizBase>
        <QuizResults
          onClose={handlePlayAgain}
          results={quizState.results}
          onPlayAgain={handlePlayAgain}
        />
      </QuizBase>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0c031c] via-[#1a0b2e] to-[#2d1b4e]" style={{ zIndex: 0 }} />
      <StarfieldBackground />
      {categoryImage && (
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url(${categoryImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
          }}
        />
      )}
      <div className="relative z-10 flex-1 flex flex-col overflow-y-auto">
        <div className="sticky top-0 z-30 bg-black/40 backdrop-blur-md border-b-2 border-purple-500/30">
          <div className="px-2 py-2 md:py-4 max-w-full mx-auto">
            <div className="flex items-center justify-between gap-2 mb-3">
              <Button
                variant="purple"
                size="sm"
                onClick={handleBackNavigation}
                className="flex items-center gap-1 hover:bg-blue-800 text-purple-100 text-sm md:text-base px-2 py-1 flex-shrink-0 min-w-0"
              >
                <ArrowLeft className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Back</span>
              </Button>

              <div className="text-center flex-1 min-w-0 px-2">
                <div className="text-sm md:text-base font-semibold text-purple-200 truncate">
                  {categoryTitle}
                </div>
                <div className="text-xs text-purple-300">
                  Question {quizState.currentQuestionIndex} of {totalQuestions}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {(quizState.question?.difficultyName || quizState.question?.difficulty) && (
                  <Badge
                    variant="outline"
                    className={`text-xs border-2 ${getDifficultyColor()}`}
                  >
                    {quizState.question?.difficultyName || quizState.question?.difficulty}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`backdrop-blur-sm text-sm min-w-[40px] text-center border-2 font-bold ${gettimerInSecondsColor()} ${timeLeft <= 10 ? 'animate-pulse' : ''}`}
                >
                  {timeLeft}s
                </Badge>
              </div>
            </div>

            <div className="w-full bg-purple-950/50 rounded-full h-3 overflow-hidden border-2 border-purple-500/40">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 shadow-lg shadow-yellow-500/60"
                style={{ 
                  width: `${((quizState.currentQuestionIndex - 0) / totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 px-3 py-3 mx-auto w-full max-w-2xl lg:max-w-4xl">
          <div className="space-y-6">
            <div className="px-1 py-3 md:py-6 text-center">
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-white leading-relaxed drop-shadow-lg">
                {quizState.question?.question}
              </h2>
            </div>

            <div className="space-y-4">
              {quizState.question?.answers.map((answer, index) => {
                const getFontSize = (text: string) => {
                  const length = text.length;
                  if (length > 60) return 'text-xs md:text-base';
                  if (length > 45) return 'text-sm md:text-lg';
                  if (length > 30) return 'text-sm md:text-xl';
                  return 'text-base md:text-xl';
                };

                return (
                  <Card
                    key={index}
                    className={`p-6 md:p-8 transition-all duration-300 ${getOptionStyle(answer)} relative overflow-hidden cursor-pointer`}
                    onClick={() => !timeUp && !quizState.isAnswerSelected && handleAnswerSelection(answer)}
                    style={{ 
                      borderRadius: '1.5rem',
                      ...getInitialOptionAuraStyle(answer)
                    }}
                  >
                    {quizState.isAnswerSelected && showBars && !timeUp && answerResponse && (
                      <div
                        className={`absolute top-0 left-0 h-full animate-bar-fill rounded-l-3xl ${answer === (answerResponse?.correctAnswer || quizState.question?.correct_answer)
                            ? 'bg-green-500/30 border-r-4 border-green-400'
                            : answer === selectedAnswer
                              ? 'bg-red-500/30 border-r-4 border-red-400'
                              : 'bg-purple-400/20'
                          }`}
                        style={{
                          '--target-width': `${getAnswerPercentage(answer)}%`,
                          animationDelay: `${index * 150}ms`,
                          animationDuration: '0.8s'
                        } as React.CSSProperties}
                      />
                    )}

                    <div className="flex items-center gap-3 relative z-10">
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className={`${getFontSize(answer)} leading-tight break-words w-full font-semibold text-left text-white`}>
                          {answer}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {timeUp && (
              <div ref={explanationRef}>
                <Card className="p-6 md:p-8 bg-gradient-to-r from-red-600/30 to-red-500/30 animate-slide-up border-2 border-red-400 backdrop-blur-sm" style={{ borderRadius: '1.5rem' }}>
                  <div className="text-center space-y-3">
                    <p className="font-semibold text-red-300 text-base md:text-lg">⏰ Time's Up!</p>
                    <p className="text-sm md:text-base text-red-100">
                      You didn't answer in time. This question is marked as incorrect.
                    </p>
                    {answerResponse?.correctAnswer && (
                      <p className="text-sm md:text-base text-red-100">
                        The correct answer was: <span className="font-semibold text-green-300">{answerResponse.correctAnswer}</span>
                      </p>
                    )}
                  </div>
                </Card>

                <div className="mt-6">
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
                <Card className="p-4 md:p-6  animate-slide-up border-2 border-purple-400 backdrop-blur-sm" style={{ borderRadius: '1.5rem' }}>
                  <div className="space-y-4">
                    <p className="text-sm md:text-base text-white leading-relaxed">
                      {answerResponse.explanation}
                    </p>
                  </div>
                </Card>

               <div className="mt-6 flex flex-col items-center space-y-3">
                <div className="flex items-center gap-4">
                  {/* Text */}
                  <p className="text-md font-medium text-white">Did you like?</p>

                  {/* Icons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleFeedback("up")}
                      disabled={feedbackGiven}
                      className="p-1 text-white hover:text-green-500 transition-colors"
                    >
                      <ThumbsUp className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() => handleFeedback("down")}
                      disabled={feedbackGiven}
                      className="p-1 text-white hover:text-red-500 transition-colors"
                    >
                      <ThumbsDown className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() => setShowReportDialog(true)}
                      className="p-1 text-white hover:text-blue-500 transition-colors"
                    >
                      <Flag className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Next Question button */}
                <Button
                  className="w-full h-12 text-sm text-white font-bold"
                  onClick={handleNextQuestion}
                  disabled={isCompletingQuiz}
                >
                  {isCompletingQuiz
                    ? "Completing..."
                    : isLastQuestion
                    ? "Finish Quiz"
                    : "Next Question"}
                </Button>
              </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showExitDialog && (
        <ConfirmationDialog
          title="Stop Quiz?"
          description="Your current progress will be lost. Are you sure you want to exit?"
          onConfirm={confirmExit}
          onCancel={() => setShowExitDialog(false)}
          confirmText="Exit Quiz"
          cancelText="Keep Playing"
        />
      )}

      {showReportDialog && (
        <ReportDialog
          onClose={closeReportDialog}
          onSubmit={handleReportQuestion}
          isSubmitting={isReporting}
          isThankYou={reportSuccess}
        />
      )}

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
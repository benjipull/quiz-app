import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ThumbsUp, ThumbsDown, Flag, Lightbulb, X } from "lucide-react";
import QuizResults from "@/components/quiz/QuizResults";
import {
  trackQuizStart,
  trackQuestionAnswered,
  trackQuizComplete,
  trackFeedback,
  trackReport,
} from "@/utils/analytics";

const ConfirmationDialog = ({ title, description, onConfirm, onCancel, confirmText, cancelText }: any) => (
  <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <Card className="max-w-sm w-full p-6 space-y-4">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>{cancelText}</Button>
        <Button variant="destructive" onClick={onConfirm}>{confirmText}</Button>
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
    {
      value: "incorrect_answer",
      label: "Incorrect Answer",
    },
    {
      value: "multiple_correct_answers",
      label: "Multiple Correct Answers",
    },
    {
      value: "ambiguous_wording",
      label: "Ambiguous or Poorly Worded Question",
    },
    {
      value: "duplicate_question",
      label: "Duplicate Question",
    },
    {
      value: "offensive_content",
      label: "Offensive or Inappropriate Content",
    },
    {
      value: "other",
      label: "Other (please describe)",
    },
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
              <Button variant="outline" className="text-red-500 border-red-600 hover:bg-red-600"
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

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

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
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null); // NEW: Auto-advance timer ref
  const hasStartedRef = useRef(false);

  // NEW: Store the preloaded next question
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

  const userToken = localStorage.getItem("token");
  const totalQuestions = 10;
  const isLastQuestion = quizState.currentQuestionIndex >= totalQuestions;
  const AUTO_ADVANCE_DELAY_MS = 5000; // MODIFIED: Reduced from 10000 to 5000 ms (5 seconds)

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

  // MODIFIED: Don't close dialog on submit, let completion status handle it
  const handleReportQuestion = async (reason: string, otherText: string) => {
    if (!quizState.question?._id) return;

    setIsReporting(true);
    setReportSuccess(false);

    try {
      const payload: { questionId: string; reason: string; otherText: string } = {
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
        trackReport(quizState.question._id, reason, userToken);
        setReportSuccess(true);
      } else {
        console.error("⚠️ Failed to submit report.");
        setReportSuccess(false);
      }
    } catch (err) {
      console.error("⚠️ Error submitting report:", err);
      setReportSuccess(false);
    } finally {
      setIsReporting(false);
    }
  };

  const closeReportDialog = () => {
    setShowReportDialog(false);
    setReportSuccess(false);
  };

  // NEW: Preload next question function
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
        // No more questions, prepare to complete
        nextQuestionRef.current = null;
      }
    } catch (error) {
      console.error("Error preloading next question:", error);
      nextQuestionRef.current = null;
    } finally {
      isPreloadingRef.current = false;
    }
  };

  // MODIFIED: Effect to manage the auto-advance timer. Checks for !showReportDialog.
  useEffect(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    if (showExplanation && !timeUp && !showReportDialog) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        handleNextQuestion();
      }, AUTO_ADVANCE_DELAY_MS);
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [showExplanation, timeUp, showReportDialog]); // MODIFIED: Added showReportDialog to dependency array

  useEffect(() => {
    if (categoryId && userToken && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startQuiz(categoryId);
    } else if (!userToken) {
      console.log("⚠️ You must be logged in to play.");
      navigate("/categories");
    }
  }, [categoryId, userToken, navigate]);

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
      }, 500);
    }
  }, [showExplanation]);

  useEffect(() => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setFeedbackGiven(false);
    setFeedbackType(null);

    // Clear auto-advance timer on new question load
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

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
    setCategoryImage(undefined);
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
        body: JSON.stringify({ categoryId, numQuestions: 10, userToken }),
      });

      if (!startResponse.ok) {
        throw new Error("⚠️ Error starting quiz session.");
      } else {
        trackQuizStart(categoryId, userToken);
        await fetchNextQuestion();
      }

    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  };

  const fetchNextQuestion = async () => {
    if (!userToken || quizState.completed || isCompletingQuiz) return;

    setLoading(true);
    try {
      // Check if we have a preloaded question
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

      // Otherwise fetch normally
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

        // NEW: Preload next question after timeout
        if (!isLastQuestion) {
          preloadNextQuestion();
        } else {
          // FIX: If last question, complete the quiz immediately on timeout
          completeQuiz();
        }
      }
    } catch (error) {
      console.error("Error handling timeout:", error);
    }
  };
  const completeQuiz = async () => {
    if (!userToken || !quizState.selectedCategory || isCompletingQuiz) return;

    // Clear auto-advance timer when completing the quiz
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

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
        trackQuizComplete(quizState.selectedCategory.id, quizState.correctAnswers, userToken);
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

    // Clear auto-advance timer if user clicks
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
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

        trackQuestionAnswered(quizState.question?._id || "", isCorrect, userToken);

        setTimeout(() => {
          setShowBars(true);
        }, 300);

        setTimeout(() => {
          setShowExplanation(true);
        }, 1800);

        // NEW: Preload next question after answering
        if (!isLastQuestion) {
          preloadNextQuestion();
        } else {
          // If last question, preload completion
          completeQuiz();
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
    // Clear auto-advance timer if user clicks the button
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    if (isLastQuestion) {
      // If user clicks "Finish Quiz" before auto-advance, complete it now
      completeQuiz();
      return;
    }
    fetchNextQuestion();
  };

  const handlePlayAgain = () => {
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
        console.error("⚠️ Failed to update popularity:", errorData.message || errorData);
      }
      trackFeedback(quizState.question._id, type, userToken);
    } catch (err) {
      console.error("⚠️ Error updating popularity:", err);
    }
  };

  const getOptionStyle = (answer: string) => {
    if (timeUp) {
      return "bg-muted/30 cursor-not-allowed opacity-50 border-2 border-border";
    }

    if (selectedAnswer === null) {
      return "hover:bg-primary/5 cursor-pointer transition-colors border-2 border-border";
    }

    const correctAnswer = answerResponse?.correctAnswer || quizState.question?.correct_answer;

    if (answer === correctAnswer) {
      return "bg-success/10 text-success border-success/50 border-2";
    }

    if (answer === selectedAnswer && answer !== correctAnswer) {
      return "bg-destructive/10 text-destructive border-destructive/50 border-2";
    }

    return "bg-muted/30 border-2 border-border";
  };

  const gettimerInSecondsColor = () => {
    if (timeLeft > 20) return "text-success";
    if (timeLeft > 10) return "text-warning";
    return "text-destructive";
  };

  const getDifficultyColor = () => {
    const difficulty = quizState.question?.difficultyLevel;
    if (difficulty === undefined) return "";
    if (difficulty >= 1 && difficulty <= 3) return "border-success text-success bg-success/5";
    if (difficulty >= 4 && difficulty <= 5) return "border-blue-400 text-blue-400 bg-blue-400/5";
    if (difficulty >= 6 && difficulty <= 7) return "border-orange-400 text-orange-400 bg-orange-400/5";
    if (difficulty >= 8 && difficulty <= 10) return "border-destructive text-destructive bg-destructive/5";
    return "";
  };

  const getAnswerPercentage = (answer: string) => {
    if (!answerResponse?.answerStats) return 0;

    const answerStat = answerResponse.answerStats.find(stat => stat.text === answer);
    return answerStat ? answerStat.percentage : 0;
  };

  const QuizBase = ({ children }: { children: React.ReactNode }) => (
    <div
      className="flex flex-col min-h-screen relative"
      style={categoryImage ? {
        backgroundImage: `url(${categoryImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : {}}
    >
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-0"></div>
      <div className="relative z-10 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );

  if (error) {
    return (
      <QuizBase>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl md:text-2xl font-bold text-red-500">Error</h2>
            <p className="text-sm md:text-base text-gray-400">{error}</p>
            <Link to='/categories' className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-md inline-block mt-4">
              Back to Categories
            </Link>
          </div>
        </div>
      </QuizBase>
    );
  }

  if (loading || (!quizState.question && !quizState.completed)) {
    return (
      <QuizBase>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm md:text-base text-muted-foreground">
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
    <div
      className="flex flex-col min-h-screen relative"
      style={categoryImage ? {
        backgroundImage: `url(${categoryImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : {}}
    >
      <div className="absolute inset-0 bg-background/90 backdrop-blur-lg z-0"></div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="sticky top-0 z-30 bg-quiz-background/80 backdrop-blur-sm">
          <div className="px-2 py-2 md:py-4 max-w-full mx-auto">
            <div className="flex items-center justify-between gap-2 mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackNavigation}
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
                  className={`bg-card/60 backdrop-blur-sm text-sm min-w-[40px] text-center ${gettimerInSecondsColor()} ${timeLeft <= 10 ? 'animate-pulse' : ''}`}
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

        <div className="flex-1 overflow-y-auto px-3 py-3 mx-auto w-full max-w-2xl lg:max-w-3xl">
          <div className="space-y-6">
            <div className="px-1 py-3 md:py-4">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground leading-relaxed">
                {quizState.question?.question}
              </h2>
            </div>

            <div className="space-y-3">
              {quizState.question?.answers.map((answer, index) => (
                <Card
                  key={index}
                  className={`p-4 transition-all duration-300 ${getOptionStyle(answer)} ${!quizState.isAnswerSelected && 'hover:shadow-md'} relative overflow-hidden cursor-pointer shadow-sm rounded-xl`}
                  onClick={() => !timeUp && !quizState.isAnswerSelected && handleAnswerSelection(answer)}
                >
                  {quizState.isAnswerSelected && showBars && !timeUp && answerResponse && (
                    <div
                      className={`absolute top-0 left-0 h-full animate-bar-fill rounded-r-xl ${answer === (answerResponse?.correctAnswer || quizState.question?.correct_answer)
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

                  <div className="flex items-center gap-3 relative z-10">
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <span className={`text-base md:text-lg leading-snug break-words w-full font-medium text-left`}>
                        {answer}
                      </span>
                      {quizState.isAnswerSelected && showBars && !timeUp && answerResponse && (
                        <span
                          className="text-sm font-semibold text-foreground ml-3 animate-fade-in-delayed flex-shrink-0"
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
                <Card className="p-6 md:p-8 bg-destructive/5 animate-slide-up border-0 shadow-sm rounded-xl">
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
                <Card className="p-6 md:p-8 bg-primary/5 animate-slide-up border-0 shadow-sm rounded-xl">
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
                  <Card className="p-4 md:p-6 bg-card/40 border-0 shadow-sm rounded-xl">
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-center">Did you like this question?</p>

                      <div className="flex gap-4 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFeedback("up")}
                          disabled={feedbackGiven}
                          className={`text-sm flex-1 max-w-[120px] h-10 transition-colors ${feedbackType === "up"
                              ? "bg-green-100 border-green-500 text-green-600"
                              : feedbackGiven
                                ? "opacity-50 cursor-not-allowed"
                                : "border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
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
                          className={`text-sm flex-1 max-w-[120px] h-10 transition-colors ${feedbackType === "down"
                              ? "bg-red-100 border-red-600 text-red-600"
                              : feedbackGiven
                                ? "opacity-50 cursor-not-allowed"
                                : "border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                            }`}
                        >
                          <ThumbsDown className="h-4 w-4 md:h-5 md:w-5" />
                          <span className="ml-1 sm:ml-2">No</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowReportDialog(true)}
                          className="text-sm flex-1 max-w-[120px] h-10 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                        >
                          <Flag className="h-4 w-4 md:h-5 md:w-5" />
                          <span className="ml-1 sm:ml-2">Report</span>
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
                    {isCompletingQuiz ? "Completing..." : isLastQuestion ? "Finish Quiz" : "Next Question"}
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
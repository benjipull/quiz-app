import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Quiz from "./Quiz";
import QuizResults from "./QuizResults";

const QuizPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { categoryId, categoryName } = location.state || {};

  const [quizState, setQuizState] = useState({
    started: true,
    completed: false,
    question: null,
    currentQuestionIndex: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    loading: false,
  });

  useEffect(() => {
    console.log(categoryId, categoryName); // Log categoryId and categoryName to ensure they're passed correctly
    if (!categoryId) {
      navigate("/categories"); // Redirect if no category data
      return;
    }
    fetchNextQuestion();
  }, [categoryId, navigate]);

  const fetchNextQuestion = async () => {
    setQuizState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch(`https://quiz-app-node-606998948537.europe-west4.run.app/api/nextQuestion/${categoryId}`);
      const data = await response.json();
      console.log(data); // Ensure the response contains the correct question

      if (data.question) {
        setQuizState((prev) => ({
          ...prev,
          question: data.question,
          currentQuestionIndex: prev.currentQuestionIndex + 1,
          loading: false,
        }));
      } else {
        setQuizState((prev) => ({ ...prev, completed: true, loading: false }));
      }
    } catch (error) {
      console.error("Error fetching the next question:", error);
      setQuizState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleAnswer = (isCorrect) => {
    setQuizState((prev) => ({
      ...prev,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      incorrectAnswers: !isCorrect ? prev.incorrectAnswers + 1 : prev.incorrectAnswers,
    }));
  };

  const resetQuiz = () => {
    setQuizState({
      started: true,
      completed: false,
      question: null,
      currentQuestionIndex: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      loading: false,
    });
    fetchNextQuestion();
  };

  const calculateScore = () => {
    const totalQuestions = quizState.correctAnswers + quizState.incorrectAnswers;
    if (totalQuestions > 0) {
      return ((quizState.correctAnswers / totalQuestions) * 100).toFixed(2);
    }
    return 0;
  };

  return (
    <div>
      <h1>{categoryName} Quiz</h1>
      {!quizState.completed ? (
        <Quiz
          question={quizState.question}
          currentQuestionIndex={quizState.currentQuestionIndex}
          fetchNextQuestion={fetchNextQuestion}
          handleAnswer={handleAnswer}
          loading={quizState.loading}
          resetQuiz={resetQuiz}
          categoryName={categoryName}
        />
      ) : (
        <QuizResults
          results={quizState}
          score={calculateScore()}
          resetQuiz={resetQuiz}
        />
      )}
    </div>
  );
};

export default QuizPage;

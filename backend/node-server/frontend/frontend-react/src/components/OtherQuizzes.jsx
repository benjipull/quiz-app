import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CategoryCard from "./CategoryCard";
import Quiz from "./Quiz";
import QuizResults from "./QuizResults";
import "../styles/Category.css";

const OtherQuizzes = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quizState, setQuizState] = useState({
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
    const [quizLoading, setQuizLoading] = useState(false);
    const userToken = localStorage.getItem("token");
    const navigate = useNavigate();

    useEffect(() => {
        fetchOtherQuizzes();
    }, []);

    // Fetch all quizzes excluding the most played and latest ones
    const fetchOtherQuizzes = async () => {
        try {
            const response = await fetch("http://localhost:3000/api/categories");
            if (!response.ok) throw new Error(`Failed to fetch quizzes. Status: ${response.status}`);
            
            const data = await response.json();
            
            // Exclude the most played and latest quizzes
            const latestQuizzes = data
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 4);
            const mostPlayedQuizzes = data
                .sort((a, b) => b.completionsCount - a.completionsCount)
                .slice(0, 4);

            // Filter out the most played and latest quizzes from the main list
            const otherQuizzes = data.filter(
                (category) =>
                    !latestQuizzes.some((quiz) => quiz._id === category._id) &&
                    !mostPlayedQuizzes.some((quiz) => quiz._id === category._id)
            );

            setQuizzes(otherQuizzes);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const startQuiz = async (categoryId, categoryName) => {
        if (!userToken) {
            alert("❌ You must be logged in to play.");
            return;
        }

        setQuizState({
            started: true,
            completed: false,
            selectedCategory: { id: categoryId, name: categoryName },
            currentQuestionIndex: 0,
            isAnswerSelected: false,
            question: null,
            correctAnswers: 0,
            incorrectAnswers: 0,
        });

        try {
            setQuizLoading(true);
            const response = await fetch("http://localhost:3000/api/startQuiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ categoryId, numQuestions: 10, userToken }),
            });

            if (!response.ok) throw new Error("❌ Error starting quiz.");
            fetchNextQuestion();
        } catch (error) {
            setError(error.message);
        } finally {
            setQuizLoading(false);
        }
    };

    const fetchNextQuestion = async () => {
        if (!userToken || quizState.completed) return;
        try {
            setQuizLoading(true);
            const response = await fetch(`http://localhost:3000/api/nextQuestion/${userToken}`);
            const data = await response.json();
            if (response.ok && data.question) {
                setQuizState((prev) => ({
                    ...prev,
                    question: data.question,
                    currentQuestionIndex: prev.currentQuestionIndex + 1,
                    isAnswerSelected: false,
                }));
            } else {
                setQuizState((prev) => ({
                    ...prev,
                    completed: true,
                    started: false,
                }));
            }
        } catch (error) {
            setError("Error fetching the next question.");
        } finally {
            setQuizLoading(false);
        }
    };

    const handleAnswer = (selectedAnswer) => {
        if (quizState.isAnswerSelected) return; // Prevent multiple selections

        const correctAnswer = quizState.question.correctAnswer;

        // Check if the selected answer is correct
        const isCorrect = selectedAnswer === correctAnswer;
        setQuizState((prev) => ({
            ...prev,
            correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
            incorrectAnswers: !isCorrect ? prev.incorrectAnswers + 1 : prev.incorrectAnswers,
            isAnswerSelected: true,
        }));

        // Proceed to the next question after a short delay
        setTimeout(fetchNextQuestion, 1000);
    };

    const resetQuiz = () => {
        setQuizState({
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
        setQuizzes([]);  // Optionally clear quizzes if you need to reset that as well.
    };

    const handleBackToCategories = () => {
        resetQuiz();
        navigate("/categories");
    };

    if (loading) return <div>Loading other quizzes...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="categories-container">
            {!quizState.started && !quizState.completed ? (
                <>
                    {quizzes.map((category) => (
                        <CategoryCard
                            key={category._id}
                            category={category}
                            startQuiz={startQuiz}
                        />
                    ))}
                </>
            ) : quizState.completed ? (
                <QuizResults results={quizState.results} handleBack={handleBackToCategories} />
            ) : (
                <Quiz
                    question={quizState.question}
                    fetchNextQuestion={fetchNextQuestion}
                    handleAnswer={handleAnswer}
                    currentQuestionIndex={quizState.currentQuestionIndex}
                    loading={quizLoading}
                    isAnswerSelected={quizState.isAnswerSelected}
                    handleBack={handleBackToCategories}
                    resetQuiz={resetQuiz}
                    categoryName={quizState.selectedCategory?.name}  // Add this line
                />
            )}
        </div>
    );
};

export default OtherQuizzes;

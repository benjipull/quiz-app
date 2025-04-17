import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Category.css";
import AddCategory from "./AddCategory";
import CategoryCard from "./CategoryCard";
import Quiz from "./Quiz";
import QuizResults from "./QuizResults";

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [resultsLoading, setResultsLoading] = useState(false);

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
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setError(null);
        try {
            const response = await fetch("http://localhost:3000/api/categories");
            if (!response.ok) throw new Error(`Failed to fetch categories. Status: ${response.status}`);
            const data = await response.json();
            setCategories(data);
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
            results: null,
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
            setQuizLoading(false);
        }
    };

    const handleAnswer = (isCorrect) => {
        setQuizState((prev) => ({
            ...prev,
            correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
            incorrectAnswers: prev.incorrectAnswers + (isCorrect ? 0 : 1),
            isAnswerSelected: true,
        }));
    };

    const recordQuizCompletion = async () => {
        if (!userToken || !quizState.selectedCategory) return;

        setResultsLoading(true);
        try {
            const { correctAnswers, incorrectAnswers } = quizState;
            const response = await fetch(
                `http://localhost:3000/api/categories/${quizState.selectedCategory.id}/completion`,
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
                    },
                }));
            } else {
                console.error("❌ Failed to record completion");
            }
        } catch (error) {
            setError("Error recording quiz completion.");
        } finally {
            setResultsLoading(false);
        }
    };

    const handleBackToCategories = () => {
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
        navigate("/");
    };

    const updatePopularity = async (questionId, action) => {
        if (!questionId || (action !== 1 && action !== 2)) {
            console.error("❌ Invalid parameters: Ensure questionId is provided and action is 1 (like) or 2 (dislike).");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/api/updatePopularity", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ questionId, action }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("❌ Failed to update popularity:", errorData.message || errorData);
            } else {
                console.log(`✅ Popularity updated for question ${questionId}`);
            }
        } catch (err) {
            console.error("⚠️ Error updating popularity:", err);
        }
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
    };

    if (loading) return <div>Loading categories...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <>
            {!quizState.started && !quizState.completed && (
                <div className="addCategoryWrapper">
                    <AddCategory />
                </div>
            )}

            <div className="categoryContainer">
                {!quizState.started && !quizState.completed ? (
                    <div className="categoryGrid">
                        {categories.map((category) => (
                            <CategoryCard key={category._id} category={category} startQuiz={startQuiz} />
                        ))}
                    </div>
                ) : quizState.completed ? (
                    resultsLoading ? (
                        <div>Recording results...</div>
                    ) : (
                        <QuizResults results={quizState.results} handleBack={handleBackToCategories} />
                    )
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
                        updatePopularity={updatePopularity}
                        categoryName={quizState.selectedCategory?.name}
                    />
                )}
            </div>
        </>
    );
};

export default Categories;

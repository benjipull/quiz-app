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
                recordQuizCompletion();
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

        try {
            const { correctAnswers, incorrectAnswers } = quizState;
            const response = await fetch(`http://localhost:3000/api/categories/${quizState.selectedCategory.id}/completion`, {
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
            });

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

    const updatePopularity = async (questionId, value) => {
        try {
            const response = await fetch("http://localhost:3000/api/updatePopularity", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ questionId, value }),
            });

            if (response.ok) {
                console.log(`Successfully updated popularity for Question ID: ${questionId}`);
            } else {
                console.error("❌ Failed to update popularity");
            }
        } catch (error) {
            console.error("Error updating popularity:", error);
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
            {/* AddCategory is outside the category container */}
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
                        updatePopularity={updatePopularity}
                    />
                )}
            </div>
        </>
    );
};

export default Categories;

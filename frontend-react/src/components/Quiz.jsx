import React, { useState, useEffect } from 'react';

const QuizApp = () => {
    const [questionIndex, setQuestionIndex] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [incorrectAnswers, setIncorrectAnswers] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(10);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [questionData, setQuestionData] = useState(null);
    const [userToken, setUserToken] = useState(localStorage.getItem("token"));

    // Progress Bar
    const progress = (currentQuestionIndex / totalQuestions) * 100;

    // Fetch next question
    const fetchNextQuestion = async () => {
        try {
            const response = await fetch(`/api/nextQuestion/${userToken}`);
            const data = await response.json();

            if (response.ok) {
                setCurrentQuestionIndex(prev => prev + 1);
                setQuestionData(data.question);
            } else {
                alert("Error fetching next question");
            }
        } catch (error) {
            console.error("Error fetching next question:", error);
        }
    };

    const handleAnswerSelection = (selectedButton, explanation) => {
        const isCorrect = selectedButton.dataset.correct === "true";

        selectedButton.classList.add(isCorrect ? "correct" : "incorrect");

        document.querySelectorAll(".option-button").forEach(button => {
            button.disabled = true;
            if (button.dataset.correct === "true") {
                button.classList.add("correct");
            }
        });

        if (isCorrect) {
            setCorrectAnswers(prev => prev + 1);
        } else {
            setIncorrectAnswers(prev => prev + 1);
        }

        const explanationElement = document.getElementById("explanation");
        explanationElement.textContent = isCorrect ? `✅ Correct! ${explanation}` : `❌ Incorrect! ${explanation}`;
        explanationElement.classList.remove("hidden");

        if (currentQuestionIndex === totalQuestions) {
            document.getElementById("next-question-button").classList.add("hidden");
            document.getElementById("show-results-button").classList.remove("hidden");
        } else {
            document.getElementById("next-question-button").classList.remove("hidden");
            document.getElementById("show-results-button").classList.add("hidden");
        }
    };

    const displayQuestion = (data) => {
        setQuestionData(data);
        updateProgress(currentQuestionIndex, totalQuestions);
    };

    const updateProgress = (current, total) => {
        const progressText = document.getElementById("progress-text");
        progressText.textContent = `Question ${current} of ${total}`;
    };

    useEffect(() => {
        if (!userToken) {
            alert("❌ You must be logged in to play.");
            return;
        }

        fetchNextQuestion();
    }, [userToken]);

    return (
        <div>
            <div id="quiz-container">
                <div id="question-container">
                    <h2 id="question">{questionData?.question}</h2>
                    <div id="options-container">
                        {questionData?.answers.map((answer, index) => (
                            <button
                                key={index}
                                className="option-button"
                                data-correct={answer === questionData.correct_answer ? "true" : "false"}
                                onClick={() => handleAnswerSelection(answer, questionData.explanation)}
                            >
                                {answer}
                            </button>
                        ))}
                    </div>
                </div>
                <div id="progress-bar-container">
                    <div id="progress-bar" style={{ width: `${progress}%` }}></div>
                    <span id="progress-text">Question {currentQuestionIndex} of {totalQuestions}</span>
                </div>
            </div>
            <div id="thumbs-container">
                <button id="thumbs-up" className="thumbs-btn">👍</button>
                <button id="thumbs-down" className="thumbs-btn">👎</button>
            </div>
            <button
                id="next-question-button"
                className="hidden"
                onClick={fetchNextQuestion}
            >
                Next Question
            </button>
            <button
                id="show-results-button"
                className="hidden"
                onClick={() => alert("Showing results")}
            >
                Show Results
            </button>
        </div>
    );
};

export default QuizApp;

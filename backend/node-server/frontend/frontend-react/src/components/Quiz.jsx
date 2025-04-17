import { useEffect, useState } from "react";
import { IoArrowBackOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import '../styles/Quiz.css';
import { FaThumbsDown, FaThumbsUp } from "react-icons/fa";

const Quiz = ({
    question,
    fetchNextQuestion,
    handleAnswer,
    currentQuestionIndex,
    loading,
    resetQuiz,
    updatePopularity,
    categoryName
}) => {
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [explanation, setExplanation] = useState("");
    const [thumbsUpActive, setThumbsUpActive] = useState(false);
    const [thumbsDownActive, setThumbsDownActive] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        console.log("Current Question Index: ", currentQuestionIndex);

        // Reset all states on question change
        setSelectedAnswer(null);
        setExplanation("");
        setThumbsUpActive(false);
        setThumbsDownActive(false);
        setFeedbackGiven(false);
    }, [question, currentQuestionIndex]);

    const handleAnswerSelection = (answer) => {
        if (selectedAnswer !== null) return;

        setSelectedAnswer(answer);
        const isCorrect = answer === question.correct_answer;
        setExplanation(
            isCorrect ? `✅ Correct! ${question.explanation}` : `❌ Incorrect! ${question.explanation}`
        );
        handleAnswer(isCorrect);
    };

    const handleBack = () => {
        resetQuiz();
        navigate("/");
    };

    const handleFeedback = (type) => {
        if (feedbackGiven) return;

        setFeedbackGiven(true);

        if (type === "up") {
            setThumbsUpActive(true);
        } else {
            setThumbsDownActive(true);
        }

        if (question._id) {
            updatePopularity(question._id, type === "up" ? 1 : 2);
        } else {
            console.error("Question ID (_id) is missing");
        }
    };

    const progress = currentQuestionIndex > 0
        ? Math.min(((currentQuestionIndex - 1) / 9) * 100, 100)
        : 0;

    const isLastQuestion = currentQuestionIndex === 10;

    return (
        <div className="quiz-container">
            <button onClick={handleBack} className="back-button" aria-label="Go Back">
                <IoArrowBackOutline size={30} />
            </button>

            {loading && <div>Loading question...</div>}

            <div id="progress-bar-container">
                <h1>{categoryName}</h1>
                <div className="progress-wrapper">
                    <div id="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {question && (
                <>
                    <div id="question-container">
                        <h2 id="question">{question.question}</h2>
                        <p>Question {currentQuestionIndex} of 10</p>
                    </div>

                    {question.answers && (
                        <div id="options-container">
                            {question.answers.map((answer, index) => {
                                let answerClass = "";

                                if (selectedAnswer !== null) {
                                    if (answer === selectedAnswer) {
                                        answerClass = answer === question.correct_answer ? "correct" : "incorrect";
                                    } else if (answer === question.correct_answer) {
                                        answerClass = "highlight-correct";
                                    }
                                }

                                return (
                                    <button
                                        key={index}
                                        className={`option-button ${answerClass}`}
                                        onClick={() => handleAnswerSelection(answer)}
                                        disabled={selectedAnswer !== null}
                                        aria-label={`Option ${index + 1}: ${answer}`}
                                    >
                                        {answer}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {selectedAnswer !== null && explanation && (
                        <div id="explanation" className="explanation">
                            {explanation}
                        </div>
                    )}

                    {selectedAnswer !== null && (
                        <>
                            <div className="thumbs-container">
                                <button
                                    className={`thumb-button ${thumbsUpActive ? "active" : ""}`}
                                    onClick={() => handleFeedback("up")}
                                    disabled={feedbackGiven}
                                    aria-label="Thumbs up (helpful)"
                                >
                                    <FaThumbsUp size={24} />
                                </button>
                                <button
                                    className={`thumb-button ${thumbsDownActive ? "active" : ""}`}
                                    onClick={() => handleFeedback("down")}
                                    disabled={feedbackGiven}
                                    aria-label="Thumbs down (not helpful)"
                                >
                                    <FaThumbsDown size={24} />
                                </button>
                                {feedbackGiven && (
                                    <p className="feedback-confirm">Thanks for your feedback!</p>
                                )}
                            </div>

                            <button className="next-question-button" onClick={fetchNextQuestion}>
                                {isLastQuestion ? "🎉 Finish" : "Next Question"}
                            </button>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default Quiz;

import { useEffect, useState } from "react";
import { IoArrowBackOutline} from "react-icons/io5"; // Import React Icons
import { useNavigate } from "react-router-dom";
import '../styles/Quiz.css';
import { FaThumbsDown, FaThumbsUp } from "react-icons/fa";

const Quiz = ({ question, fetchNextQuestion, handleAnswer, currentQuestionIndex, loading, resetQuiz, updatePopularity }) => {
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [explanation, setExplanation] = useState("");
    const [thumbsUpActive, setThumbsUpActive] = useState(false); // For thumbs up state
    const [thumbsDownActive, setThumbsDownActive] = useState(false); // For thumbs down state
    const navigate = useNavigate(); // Hook to navigate back to categories

    useEffect(() => {
        console.log("Current Question Index: ", currentQuestionIndex);
        setSelectedAnswer(null); // Reset selected answer when the question changes
        setExplanation(""); // Clear the explanation for the next question

        if (currentQuestionIndex === 0) {
            console.log("Quiz started: currentQuestionIndex is 0");
        }
    }, [question, currentQuestionIndex]); // Runs when question or currentQuestionIndex changes

    const handleAnswerSelection = (answer) => {
        if (selectedAnswer !== null) return; // Prevent multiple selections

        setSelectedAnswer(answer);

        const isCorrect = answer === question.correct_answer;
        setExplanation(isCorrect ? `✅ Correct! ${question.explanation}` : `❌ Incorrect! ${question.explanation}`);
        handleAnswer(isCorrect);
    };

    // Function to reset quiz and go back
    const handleBack = () => {
        resetQuiz(); // Reset the quiz state before navigating
        navigate("/"); // Navigate back to home
    };

    // Handle thumbs up click
    const handleThumbsUpClick = () => {
        if (thumbsUpActive) return; // Prevent double-click

        setThumbsUpActive(true); // Mark thumbs up as active
        setThumbsDownActive(false); // Ensure thumbs down is inactive

        // Call the updatePopularity function with the correct value (1 for like)
        updatePopularity(question.id, 1);
    };

    // Handle thumbs down click
    const handleThumbsDownClick = () => {
        if (thumbsDownActive) return; // Prevent double-click

        setThumbsDownActive(true); // Mark thumbs down as active
        setThumbsUpActive(false); // Ensure thumbs up is inactive

        // Call the updatePopularity function with the correct value (2 for dislike)
        updatePopularity(question.id, 2);
    };

    // Progress calculation (ensuring smooth transition from 0% to 100%)
    const progress = Math.min(((currentQuestionIndex - 1) / 9) * 100, 100); // Adjust progress to start at 0%

    // Determine if it's the last question
    const isLastQuestion = currentQuestionIndex === 10;

    return (
        <div className="quiz-container">
            {/* Back button to return to categories */}
            <button onClick={handleBack} className="back-button">
                <IoArrowBackOutline size={30} />
            </button>

            {/* Loading state */}
            {loading && <div>Loading question...</div>}

            {/* Progress bar */}
            <div id="progress-bar-container">
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
                                >
                                    {answer}
                                </button>
                            );
                        })}
                    </div>

                    {selectedAnswer !== null && explanation && (
                        <div id="explanation" className="explanation">
                            {explanation}
                        </div>
                    )}

                    {/* Show Next Question or Finish button after answer selection */}
                    {selectedAnswer !== null && (
                        <button
                            className="next-question-button"
                            onClick={fetchNextQuestion}
                        >
                            {isLastQuestion ? "Finish" : "Next Question"}
                        </button>
                    )}

                    {/* Thumbs Up and Thumbs Down Buttons */}
                    {selectedAnswer !== null && (
                        <div className="thumbs-container">
                            <button
                                className={`thumb-button ${thumbsUpActive ? "active" : ""}`}
                                onClick={handleThumbsUpClick}
                                disabled={thumbsUpActive || thumbsDownActive}
                            >
                                <FaThumbsUp />
                            </button>
                            <button
                                className={`thumb-button ${thumbsDownActive ? "active" : ""}`}
                                onClick={handleThumbsDownClick}
                                disabled={thumbsUpActive || thumbsDownActive}
                            >
                                <FaThumbsDown size={30} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Quiz;

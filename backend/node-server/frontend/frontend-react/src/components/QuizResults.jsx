const QuizResults = ({ results, handleBack }) => {
    if (!results) {
        return <div>Results not available yet.</div>;
    }

    return (
        <div className="quizResults">
            <h2>Quiz Completed</h2>
            <p>Total Questions: {results.totalQuestions}</p>
            <p>Correct Answers: {results.correctAnswers}</p>
            <p>Incorrect Answers: {results.incorrectAnswers}</p>
            <button onClick={handleBack}>Back to Categories</button>
        </div>
    );
};
export default QuizResults
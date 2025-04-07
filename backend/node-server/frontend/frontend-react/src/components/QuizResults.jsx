const QuizResults = ({ results }) => {
    return (
        <div className="results-container">
            <h2>Quiz Completed!</h2>
            {results ? (
                <>
                    <p>✅ Total Questions: <strong>{results.totalQuestions}</strong></p>
                    <p>✅ Correct Answers: <strong>{results.correctAnswers}</strong></p>
                    <p>❌ Incorrect Answers: <strong>{results.incorrectAnswers}</strong></p>
                    <p>📊 Score: <strong>{Math.round((results.correctAnswers / results.totalQuestions) * 100)}%</strong></p>
                </>
            ) : (
                <p>Loading results...</p>
            )}
        </div>
    );
};

export default QuizResults;

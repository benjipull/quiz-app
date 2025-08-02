import { useEffect, useState } from "react";
import "../styles/Categories.css";

const LatestQuizzes = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);  // To manage loading state
    const [error, setError] = useState(null);  // To manage any errors

    // Fetch quizzes when component mounts
    useEffect(() => {
        fetchLatestQuizzes();
    }, []);

    // Function to fetch latest quizzes from the API
    const fetchLatestQuizzes = async () => {
        try {
            const response = await fetch("https://quiz-app-node-606998948537.europe-west4.run.app/api/categories");
            if (!response.ok) {
                throw new Error(`Failed to fetch quizzes. Status: ${response.status}`);
            }
            const data = await response.json();

            // Sort quizzes by createdAt to get the latest quizzes first
            const latestQuizzes = data
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by most recent
                .slice(0, 5); // Get the top 5 latest quizzes

            setQuizzes(latestQuizzes);
        } catch (error) {
            setError(error.message); // Set error message if fetch fails
        } finally {
            setLoading(false); // Set loading to false after fetch completes
        }
    };

    if (loading) {
        return <div>Loading latest quizzes...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="parent-container">
            <h2>Latest Quizzes</h2>
            <div id="category-buttons" className="categories-container">
                {quizzes.map((quiz) => (
                    <div key={quiz._id} className="category-card">
                        <div className="category-image">
                            <img
                                src={quiz.imageUrl || "images/default-category.jpg"}
                                alt={quiz.name}
                                loading="lazy"
                            />
                        </div>
                        <div className="category-details">
                            <div className="category-title">{quiz.name}</div>
                            <div className="category-creator">
                                <i className="fas fa-user"></i> {quiz.createdBy}
                            </div>
                            <div className="category-rating">
                                <span className="rating-value">
                                    {quiz.averageRating ? quiz.averageRating.toFixed(1) : "0.0"}
                                </span>
                                <span className="completion-count">({quiz.completionsCount})</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LatestQuizzes;

import { useEffect, useState } from "react";
import "../styles/Categories.css";

const OneMoreTry = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const response = await fetch("http://localhost:3000/api/categories");
            if (!response.ok) {
                throw new Error(`Failed to fetch quizzes. Status: ${response.status}`);
            }
            const data = await response.json();

            // Filter quizzes where the average rating is below 5
            const oneMoreTryQuizzes = data.filter((quiz) => quiz.averageRating < 5).slice(0, 5);

            setQuizzes(oneMoreTryQuizzes);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading quizzes...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="parent-container">
            <h2>One More Try Quizzes</h2>
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

export default OneMoreTry;

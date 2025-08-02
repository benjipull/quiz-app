import { useEffect, useState } from "react";
import "../styles/Categories.css";

const MostPlayedQuizzes = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);  // To manage loading state
    const [error, setError] = useState(null);  // To manage any errors

    // Fetch categories when component mounts
    useEffect(() => {
        fetchCategories();
    }, []);

    // Function to fetch categories from the API
    const fetchCategories = async () => {
        try {
            const response = await fetch("https://quiz-app-node-606998948537.europe-west4.run.app/api/categories");
            if (!response.ok) {
                throw new Error(`Failed to fetch categories. Status: ${response.status}`);
            }
            const data = await response.json();
            
            // Sort categories by completionsCount in descending order and select the top 4
            const sortedCategories = data
                .sort((a, b) => b.completionsCount - a.completionsCount)
                .slice(0, 5); // Get the top 5 most played quizzes

            setCategories(sortedCategories);
        } catch (error) {
            setError(error.message); // Set error message if fetch fails
        } finally {
            setLoading(false); // Set loading to false after fetch completes
        }
    };

    if (loading) {
        return <div>Loading categories...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="parent-container">
            <h2>Most Played Quizzes</h2>
            <div id="category-buttons" className="categories-container">
                {categories.map((category) => (
                    <div key={category._id} className="category-card">
                        <div className="category-image">
                            <img
                                src={category.imageUrl || "images/default-category.jpg"}
                                alt={category.name}
                                loading="lazy"
                            />
                        </div>
                        <div className="category-details">
                            <div className="category-title">{category.name}</div>
                            <div className="category-creator">
                                <i className="fas fa-user"></i> {category.createdBy}
                            </div>
                            <div className="category-rating">
                                <span className="rating-value">
                                    {category.averageRating ? category.averageRating.toFixed(1) : "0.0"}
                                </span>
                                <span className="completion-count">({category.completionsCount})</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MostPlayedQuizzes;

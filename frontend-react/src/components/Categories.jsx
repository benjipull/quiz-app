import { useEffect, useState } from "react";
import "../styles/Categories.css"

const Categories = () => {
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
            const response = await fetch("http://localhost:3000/api/categories");
            if (!response.ok) {
                throw new Error(`Failed to fetch categories. Status: ${response.status}`);
            }
            const data = await response.json();
            setCategories(data);
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
        <div>
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

export default Categories;

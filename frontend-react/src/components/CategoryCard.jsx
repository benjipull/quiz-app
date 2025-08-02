import React from 'react';
import { FaUser } from 'react-icons/fa';
import defaultImg from "../assets/default-category.jpeg";

// Helper function to generate rating stars
const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
        <>
            {[...Array(fullStars)].map((_, index) => (
                <span key={`full-${index}`} className="star-full" aria-label="Full star">★</span>
            ))}
            {hasHalfStar && <span className="star-half" aria-label="Half star">★</span>}
            {[...Array(emptyStars)].map((_, index) => (
                <span key={`empty-${index}`} className="star-empty" aria-label="Empty star">★</span>
            ))}
        </>
    );
};

const CategoryCard = ({ category, startQuiz }) => {
    const { _id, imageUrl, name, createdBy, averageRating, completionsCount } = category;

    return (
        <div 
            className="categoryButton" 
            aria-labelledby={`category-${_id}`} 
            onClick={() => startQuiz(_id, name)} 
            role="button"
            tabIndex={0} // Make the card focusable
        >
            <div className="categoryImage">
                <img
                    src={imageUrl || defaultImg}
                    alt={name}
                    loading="lazy"
                    className="categoryImageImg"
                />
            </div>
            <div className="categoryInfo">
                <div className="categoryName" id={`category-${_id}`}>
                    {name}
                </div>
                <div className="categoryMeta">
                    <FaUser className="categoryMetaIcon" title={`Created by: ${createdBy}`} />
                    <span className="categoryMetaText">{createdBy}</span>
                </div>
                <div className="categoryRating">
                    <div className="rating-stars">
                        {renderStars(averageRating || 0)}
                    </div>
                    <span className="completionCount">({completionsCount}) played</span>
                </div>
            </div>
        </div>
    );
};

export default CategoryCard;

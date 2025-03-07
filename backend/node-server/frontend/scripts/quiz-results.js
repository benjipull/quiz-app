async function showResults() {
    let progressContainer = document.getElementById("progress-bar-container");
    let resultsContainer = document.getElementById("results-container");
    let questionContainer = document.getElementById("question-container");
    let quizResults = document.getElementById("quiz-results");
    let restartQuizButton = document.getElementById("restart-quiz");
    let ratingContainer = document.getElementById("rating-container"); // ✅ Rating UI

    // ✅ Hide quiz UI
    progressContainer.classList.add("hidden");
    questionContainer.classList.add("hidden");

    // ✅ Show results UI
    resultsContainer.classList.remove("hidden");

    // ✅ Display Rating UI
    ratingContainer.classList.remove("hidden");

    // ✅ Calculate Score
    let totalScore = Math.round((correctAnswers / totalQuestions) * 100);

    // ✅ Display Results
    quizResults.innerHTML = `
        <p>✅ Total Questions: <strong>${totalQuestions}</strong></p>
        <p>✅ Correct Answers: <strong>${correctAnswers}</strong></p>
        <p>❌ Incorrect Answers: <strong>${incorrectAnswers}</strong></p>
        <p>📊 Score: <strong>${totalScore}%</strong></p>
    `;

    await recordQuizCompletion();

    restartQuizButton.onclick = () => {
        resetQuiz();
    };
}

function resetQuiz() {
    document.getElementById("progress-bar-container").classList.add("hidden");
    document.getElementById("question-container").classList.add("hidden");
    document.getElementById("results-container").classList.add("hidden"); // ✅ Hide results
    document.getElementById("category-container").classList.remove("hidden");
    document.getElementById("back-button").classList.add("hidden");
    document.getElementById("user-profile").classList.remove("hidden");
    document.getElementById("user-details-container").classList.add("hidden");
    
    ratingLocked = false; // Unlock rating
    
    const stars = document.querySelectorAll(".star");
    
    stars.forEach(star => {
        star.style.pointerEvents = "auto"; // Re-enable interactions
    });

    // ✅ Reload categories
    fetchCategories();
}


async function recordQuizCompletion() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        console.error("❌ User not logged in. Cannot record completion.");
        return;
    }

    const completionData = {
        user: user.id,
        questionsAttempted: totalQuestions,
        correctAnswers: correctAnswers,
        incorrectAnswers: incorrectAnswers
    };

    try {
        const response = await fetch(`/api/categories/${SelectedCategoryId}/completion`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify(completionData)
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("❌ Failed to record completion:", data.message);
        } else {
            console.log("✅ Completion recorded successfully!", data);
            document.getElementById("question-container").classList.add("none");
        }
    } catch (error) {
        console.error("⚠️ Error recording completion:", error);
    }
}

// ✅ Function to send rating to API
async function submitCategoryRating(rating) {
    const token = localStorage.getItem("token");
    if (!token) {
        console.error("❌ User not logged in. Cannot submit rating.");
        return;
    }

    try {
        const response = await fetch(`/api/categories/${SelectedCategoryId}/rate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ rating })
        });

        const data = await response.json();
        if (response.ok) {
            console.log("✅ Rating submitted successfully!", data);
            
            const stars = document.querySelectorAll(".star");
            stars.forEach((star, i) => {
                star.classList.toggle("active", i <= rating);
            });
    
            // Remove all event listeners to prevent further changes
            stars.forEach(star => {
                star.style.pointerEvents = "none"; // Disable interactions
            });

        } else {
            console.error("❌ Failed to submit rating:", data.message);
        }
    } catch (error) {
        console.error("⚠️ Error submitting rating:", error);
    }
}

// ✅ Keep the DOM Ready event listener separate
document.addEventListener("DOMContentLoaded", () => {
    const stars = document.querySelectorAll(".star");
    let ratingLocked = false; // Flag to prevent further changes after selection

    stars.forEach((star, index) => {
        star.addEventListener("mouseover", function () {
            if (!ratingLocked) highlightStars(index);
        });

        star.addEventListener("mouseout", function () {
            if (!ratingLocked) resetStars();
        });

        star.addEventListener("click", function () {
            if (!ratingLocked) {
                submitCategoryRating(index);
                ratingLocked = true; // Lock rating after selection
            }
        });
    });

    function highlightStars(index) {
        stars.forEach((star, i) => {
            star.classList.toggle("active", i <= index);
        });
    }

    function resetStars() {
        stars.forEach(star => star.classList.remove("active"));
    }
});

window.showResults = showResults;
window.resetQuiz = resetQuiz;
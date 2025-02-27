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
    document.getElementById("quiz-container").classList.add("hidden");
    document.getElementById("back-button").classList.add("hidden");

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
        } else {
            console.error("❌ Failed to submit rating:", data.message);
        }
    } catch (error) {
        console.error("⚠️ Error submitting rating:", error);
    }
}

// ✅ Keep the DOM Ready event listener separate
document.addEventListener("DOMContentLoaded", () => {
    const nextQuestionButton = document.getElementById("next-question-button");
    const questionElement = document.getElementById("question");
    const optionsContainer = document.getElementById("options-container");

    const stars = document.querySelectorAll(".star");
    const ratingContainer = document.getElementById("rating-container");

    let selectedRating = 0;

    stars.forEach(star => {
        star.addEventListener("click", async () => {
            selectedRating = parseInt(star.getAttribute("data-value"));

            // ✅ Highlight selected stars
            stars.forEach(s => s.classList.remove("active"));
            for (let i = 0; i < selectedRating; i++) {
                stars[i].classList.add("active");
            }

            // ✅ Submit rating to API
            await submitCategoryRating(selectedRating);
        });
    });

});

window.showResults = showResults;
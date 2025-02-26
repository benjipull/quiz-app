document.addEventListener("DOMContentLoaded", () => {

    // ✅ Store DOM elements in `window` so they can be used in quiz-results.js
    window.questionElement = document.getElementById("question");
    window.questionContainer = document.getElementById("question-container");
    window.optionsContainer = document.getElementById("options-container");
    window.loadingOverlay = document.getElementById("loading-overlay");
    window.nextQuestionButton = document.getElementById("next-question-button");
    window.showResultsButton = document.getElementById("show-results-button");
    window.progressBar = document.getElementById("progress-bar");

    // ✅ Store shared variables globally
    window.correctAnswers = 0;
    window.incorrectAnswers = 0;
    window.totalQuestions = 10;
    window.questionIndex = 0;
    window.SelectedCategory = "";
    window.SelectedCategoryId = 0;

    function showLoading() {
        loadingOverlay.classList.add("show");
        document.body.classList.add("no-click");
    }

    function hideLoading() {
        loadingOverlay.classList.remove("show");
        document.body.classList.remove("no-click");
    }

    function updateProgress(current, total) {
        const progressBar = document.getElementById("progress-bar");
        const progressText = document.getElementById("progress-text");

        // ✅ Update progress percentage
        let progress = (currentQuestionIndex / totalQuestions) * 100;
        progressBar.style.width = progress + "%";

        // ✅ Update text to show question number
        progressText.textContent = `Question ${currentQuestionIndex} of ${totalQuestions}`;
    }

    function handleAnswerSelection(selectedButton, explanation) {
        const isCorrect = selectedButton.dataset.correct === "true";

        selectedButton.classList.add(isCorrect ? "correct" : "incorrect");

        document.querySelectorAll(".option-button").forEach(button => {
            button.disabled = true;
            if (button.dataset.correct === "true") {
                button.classList.add("correct");
            }
        });

        if (isCorrect)
            correctAnswers += 1;
        else
            incorrectAnswers += 1;

        const explanationElement = document.getElementById("explanation");
        explanationElement.textContent = isCorrect ? `✅ Correct! ${explanation}` : `❌ Incorrect! ${explanation}`;

        explanationElement.classList.remove("hidden");
        nextQuestionButton.classList.remove("hidden");
        document.getElementById("thumbs-container").classList.remove("hidden");
    }

    function displayQuestion(data) {
        questionElement.textContent = data.question;
        questionElement.classList.remove("hidden");
        optionsContainer.innerHTML = "";

        const explanationElement = document.getElementById("explanation");
        explanationElement.classList.add("hidden");
        explanationElement.textContent = "";

        // ✅ Reset thumbs buttons
        thumbsUpBtn.classList.remove("active");
        thumbsDownBtn.classList.remove("active");
        document.getElementById("thumbs-container").classList.add("hidden");
        
        data.answers.forEach(answer => {
            const button = document.createElement("button");
            button.classList.add("option-button");
            button.textContent = answer;
            button.dataset.correct = answer === data.correct_answer ? "true" : "false";
            button.addEventListener("click", () => {
                handleAnswerSelection(button, data.explanation);
            });
            optionsContainer.appendChild(button);
        });

        updateProgress(questionIndex, totalQuestions);
        nextQuestionButton.classList.add("hidden");
    }

    async function fetchNextQuestion() {
        try {
            const response = await fetch(`/api/nextQuestion/${userToken}`);
            const data = await response.json();

            if (response.ok) {
                if (data.remaining === 0) {
                    // ✅ Hide "Next Question" button and show "Finish" button
                    document.getElementById("show-results-button").classList.remove("hidden");
                }

                currentQuestionIndex++;
                currentQuestionId = data.question._id;

                displayQuestion(data.question);
                updateProgress(questionIndex, totalQuestions);

                document.getElementById("next-question-button").classList.add("hidden");
            } else {
                showResults(); // ✅ Handle unexpected failures
            }
        } catch (error) {
            questionElement.textContent = "Failed to load question.";
            console.error("⚠️ Error fetching next question:", error);
        }
    }

    document.getElementById("show-results-button").addEventListener("click", showResults);
    nextQuestionButton.addEventListener("click", fetchNextQuestion);

    window.startQuiz = async function (categoryId, categoryName) {
        correctAnswers = 0;
        incorrectAnswers = 0;
        totalQuestions = 10;
        questionIndex = 0;
        SelectedCategory = "";
        SelectedCategoryId = 0;
        currentQuestionIndex = 0;

        SelectedCategoryId = categoryId;
        selectedCategory = categoryName;
        userToken = localStorage.getItem("token"); // Use stored token

        if (!userToken) {
            alert("❌ You must be logged in to play.");
            return;
        }

        const selectedCategoryLabel = document.getElementById("selected-category-label");
        const categoryContainer = document.getElementById("category-container");
        const quizContainer = document.getElementById("quiz-container");
        const backButton = document.getElementById("back-button");
        const questionContainer = document.getElementById("question-container");
        const progressBarContainer = document.getElementById("progress-bar-container");

        selectedCategoryLabel.textContent = `${categoryName}`;
        selectedCategoryLabel.classList.remove("hidden");

        currentQuestionIndex = 0;

        showLoading();

        try {
            const response = await fetch("/api/startQuiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    categoryId: SelectedCategoryId,
                    numQuestions: totalQuestions,
                    userToken: userToken
                })
            });

            const data = await response.json();
            hideLoading();

            if (!response.ok) {
                alert("❌ Error starting quiz.");
                return;
            }

            // ✅ Hide category selection and show quiz
            categoryContainer.classList.add("hidden");
            quizContainer.classList.remove("hidden");
            backButton.classList.remove("hidden");
            questionContainer.classList.remove("hidden");
            progressBarContainer.classList.remove("hidden");

            // ✅ Fetch first question
            fetchNextQuestion();
        } catch (error) {
            questionElement.classList.remove("hidden");
            questionElement.textContent = "Failed to start quiz.";
            hideLoading();
        }
    };

    const thumbsUpBtn = document.getElementById("thumbs-up");
    const thumbsDownBtn = document.getElementById("thumbs-down");

    let currentQuestionId = null;

    // ✅ Function to send popularity update
    async function updatePopularity(questionId, action) {
        try {
            const response = await fetch("/api/updatePopularity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questionId, action })
            });

            if (!response.ok) {
                console.error("❌ Error updating popularity");
            }
        } catch (error) {
            console.error("⚠️ Network error:", error);
        }
    }

    // ✅ Handle Thumbs Up Click
    thumbsUpBtn.addEventListener("click", () => {
        if (!currentQuestionId) return;

        if (thumbsUpBtn.classList.contains("active")) {
            // ✅ Undo thumbs up ➝ Post a dislike
            updatePopularity(currentQuestionId, 2);
            thumbsUpBtn.classList.remove("active");
        } else {
            // ✅ Click thumbs up ➝ Post a like
            updatePopularity(currentQuestionId, 1);
            thumbsUpBtn.classList.add("active");
            thumbsDownBtn.classList.remove("active"); // Remove thumbs down
        }
    });

    // ✅ Handle Thumbs Down Click
    thumbsDownBtn.addEventListener("click", () => {
        if (!currentQuestionId) return;

        if (thumbsDownBtn.classList.contains("active")) {
            // ✅ Undo thumbs down ➝ Post a like
            updatePopularity(currentQuestionId, 1);
            thumbsDownBtn.classList.remove("active");
        } else {
            // ✅ Click thumbs down ➝ Post a dislike
            updatePopularity(currentQuestionId, 2);
            thumbsDownBtn.classList.add("active");
            thumbsUpBtn.classList.remove("active"); // Remove thumbs up
        }
    });


});
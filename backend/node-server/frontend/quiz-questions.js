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

    function updateProgress() {
        let progressText = document.getElementById("progress-text");
        let progressBar = document.getElementById("progress-bar");

        let progress = ((questionIndex + 1) / totalQuestions) * 100;
        progressBar.style.width = progress + "%";
        progressText.textContent = `Question ${questionIndex + 1} of ${totalQuestions}`;
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

        const explanationElement = document.getElementById("explanation");
        explanationElement.textContent = isCorrect ? `✅ Correct! ${explanation}` : `❌ Incorrect! ${explanation}`;
        
        explanationElement.classList.remove("hidden");
        nextQuestionButton.classList.remove("hidden");
    }

    function displayQuestion(data) {
        questionElement.textContent = data.question;
        questionElement.classList.remove("hidden");
        optionsContainer.innerHTML = "";

        const explanationElement = document.getElementById("explanation");
        explanationElement.classList.add("hidden");
        explanationElement.textContent = "";

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

        updateProgress();
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
                displayQuestion(data.question);
                updateProgress();

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
        
        selectedCategoryId = categoryId;
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
                    categoryId: selectedCategoryId,
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
});
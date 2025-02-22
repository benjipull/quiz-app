document.addEventListener("DOMContentLoaded", () => {
    const categoryButtons = document.querySelectorAll(".category-btn");
    const questionElement = document.getElementById("question");
    const questionContainer = document.getElementById("question-container");
    const optionsContainer = document.getElementById("options-container");
    const categoryContainer = document.getElementById("category-container");
    const quizContainer = document.getElementById("quiz-container");
    const loadingOverlay = document.getElementById("loading-overlay");
    const backButton = document.getElementById("back-button");
    const nextQuestionButton = document.getElementById("next-question-button");
    const congratulationsContainer = document.getElementById("congratulations-container");
    const progressBar = document.getElementById("progress-bar");
   
    let SelectedCategory = ""; // ✅ Store the category selected
    let SelectedCategoryId = 0;
    let totalQuestions = 4; // Total quiz questions
    let questionIndex = 0; // Track current question index
    let correctAnswers = 0; // ✅ Track correct answers
    let incorrectAnswers = 0; // ✅ Track incorrect answers

    function updateProgress() {
        let progressText = document.getElementById("progress-text");
        let progressBar = document.getElementById("progress-bar");
        let progressContainer = document.getElementById("progress-bar-container");

        if (questionIndex === 0) {
            progressContainer.classList.remove("hidden"); // ✅ Show progress bar at start
        }

        let progress = ((questionIndex + 1) / totalQuestions) * 100; // ✅ Calculate percentage
        progressBar.style.width = progress + "%"; // ✅ Update width

        progressText.textContent = `Question ${questionIndex + 1} of ${totalQuestions}`; // ✅ Update text
    }

    function showLoading() {
        loadingOverlay.classList.add("show");
        document.body.classList.add("no-click"); // Disable interactions
    }

    function hideLoading() {
        loadingOverlay.classList.remove("show");
        document.body.classList.remove("no-click"); // Enable interactions
    }

    function handleAnswerSelection(selectedButton, explanation) {
        const isCorrect = selectedButton.dataset.correct === "true";

        if (isCorrect)
            correctAnswers++
        else
            incorrectAnswers++

        // Apply styles based on correctness
        selectedButton.classList.add(isCorrect ? "correct" : "incorrect");

        // Disable all buttons and show correct answer
        document.querySelectorAll(".option-button").forEach(button => {
            button.disabled = true; // Disable buttons
            if (button.dataset.correct === "true") {
                button.classList.add("correct"); // Highlight correct answer
            }
        });

        // ✅ Show Explanation
        const explanationElement = document.getElementById("explanation");
        explanationElement.textContent = isCorrect
            ? `✅ Correct! ${explanation}`
            : `❌ Incorrect! ${explanation}`;
        explanationElement.classList.remove("hidden"); // Show explanation

        // ✅ Show Next Question Button
        nextQuestionButton.classList.remove("hidden");
    }

    // ✅ Ensure button starts hidden and only shows after selection
    nextQuestionButton.textContent = "Next Question";
    nextQuestionButton.classList.add("next-question-button");
    nextQuestionButton.addEventListener("click", fetchNewQuestion);
    optionsContainer.after(nextQuestionButton); // Insert Next Button after answers

    function displayQuestion(data) {
        if (questionIndex >= totalQuestions) {
            showResults();
            return;
        }

        questionElement.textContent = data.question;
        questionElement.classList.remove("hidden");
        optionsContainer.innerHTML = ""; // Clear previous options

        // ✅ Ensure the explanation element is hidden before selecting an answer
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

        // ✅ Update progress bar when new question loads
        updateProgress();

        // Hide Next Button until an answer is selected
        nextQuestionButton.classList.add("hidden");

        progressBar.style.width = `${(questionIndex / totalQuestions) * 100}%`;
    }

    // ✅ Fetch a new question for the same category
    async function fetchNewQuestion() {
        if (questionIndex >= totalQuestions - 1) {
            // If last question, show "Finish" button
            nextQuestionButton.textContent = "Finish";
            nextQuestionButton.removeEventListener("click", fetchNewQuestion);
            nextQuestionButton.addEventListener("click", showResults);
        } else {
            questionIndex++; // Move to next question

            showLoading(); // Show loading

            try {
                const response = await fetch("/api/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ category: SelectedCategoryId })
                });

                const data = await response.json();
                hideLoading(); // Hide loading
                displayQuestion(data); // Show new question
                updateProgress();

            } catch (error) {
                questionElement.textContent = "Failed to load question.";
                hideLoading();
            }
        }
    }

    async function showResults() {
        let progressContainer = document.getElementById("progress-bar-container");
        progressContainer.classList.add("hidden"); // ✅ Hide progress bar after quiz completion

        // ✅ Calculate Score
        let totalScore = Math.round((correctAnswers / totalQuestions) * 100);

        // ✅ Display Results
        questionElement.innerHTML = `
            🎉 <strong>Congratulations!</strong> You've completed the quiz! 🎉
            <br><br>
            ✅ Total Questions: <strong>${totalQuestions}</strong><br>
            ✅ Correct Answers: <strong>${correctAnswers}</strong><br>
            ❌ Incorrect Answers: <strong>${incorrectAnswers}</strong><br>
            📊 Score: <strong>${totalScore}%</strong>
        `;

        optionsContainer.innerHTML = ""; // ✅ Clear answers

        // ✅ Ensure the explanation element is hidden before selecting an answer
        const explanationElement = document.getElementById("explanation");
        explanationElement.classList.add("hidden");
        explanationElement.textContent = "";

        // ✅ Record quiz completion in the database
        await recordQuizCompletion();

        // ✅ Update Next Question Button
        nextQuestionButton.textContent = "Back to Categories";
        nextQuestionButton.classList.remove("hidden");

        nextQuestionButton.onclick = () => {
            resetQuiz();
        };
    }

    function resetQuiz() {
        
        correctAnswers = 0;
        incorrectAnswers = 0;
        totalQuestions = 4;
        questionIndex = 0;
        SelectedCategory = "";
        SelectedCategoryId = 0;

        document.getElementById("progress-bar-container").classList.add("hidden"); // ✅ Hide progress bar
        categoryContainer.classList.remove("hidden");
        quizContainer.classList.add("hidden");
        backButton.classList.add("hidden");
        
    }

    window.startQuiz = async function (selectedCategoryId, selectedCategory) {
        const selectedCategoryLabel = document.getElementById("selected-category-label");
        const categoryContainer = document.getElementById("category-container");
        const quizContainer = document.getElementById("quiz-container");
        const backButton = document.getElementById("back-button");
        const questionContainer = document.getElementById("question-container");
        const congratulationsContainer = document.getElementById("congratulations-container");
        const progressBarContainer = document.getElementById("progress-bar-container");
        const questionElement = document.getElementById("question");

        // ✅ Update the category label in the quiz UI
        selectedCategoryLabel.textContent = `${selectedCategory}`;
        selectedCategoryLabel.classList.remove("hidden"); // Make it visible
        SelectedCategory = selectedCategory;
        SelectedCategoryId = selectedCategoryId;

        questionIndex = 0;

        showLoading();

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: selectedCategoryId })
            });

            const data = await response.json();
            hideLoading();

            // ✅ Hide category selection and show quiz
            categoryContainer.classList.add("hidden");
            quizContainer.classList.remove("hidden");
            backButton.classList.remove("hidden");
            questionContainer.classList.remove("hidden");
            congratulationsContainer.classList.add("hidden");
            progressBarContainer.classList.remove("hidden");

            displayQuestion(data);
        } catch (error) {
            questionElement.classList.remove("hidden");
            questionElement.textContent = "Failed to load question.";
            hideLoading();
        }
    };

    // ✅ Handle Next Question Click
    nextQuestionButton.addEventListener("click", fetchNewQuestion);
    nextQuestionButton.textContent = "Next Question";
    nextQuestionButton.classList.add("next-question-button", "hidden");

    optionsContainer.after(nextQuestionButton); // Insert Next Button after answers

    // ✅ Handle Back Button Click (Return to Category Selection)
    backButton.addEventListener("click", () => {
        categoryContainer.classList.remove("hidden");
        questionContainer.classList.add("hidden");
        quizContainer.classList.remove("hidden");
        backButton.classList.add("hidden");
        congratulationsContainer.classList.add("hidden");
        selectedCategory = "";
        questionIndex = 0; // Reset progress on exit
        updateProgress(); // Reset progress bar
    });

    async function recordQuizCompletion() {
        const user = JSON.parse(localStorage.getItem("user")); // ✅ Retrieve user from local storage
        if (!user) {
            console.error("❌ User not logged in. Cannot record completion.");
            return;
        }
    
        const completionData = {
            questionsAttempted: totalQuestions,
            correctAnswers: correctAnswers,
            incorrectAnswers: incorrectAnswers
        };
    
        try {
            const response = await fetch(`/api/categories/${SelectedCategoryId}/completion`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}` // ✅ Send token for authentication
                },
                body: JSON.stringify(completionData)
            });
    
            const data = await response.json();
            if (!response.ok) {
                console.error("❌ Failed to record completion:", data.message);
            } else {
                console.log("✅ Completion recorded successfully!", data);
            }
        } catch (error) {
            console.error("⚠️ Error recording completion:", error);
        }
    }
    
});
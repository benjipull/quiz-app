document.addEventListener("DOMContentLoaded", () => {
    const loginModal = document.getElementById("login-modal");
    const closeLoginBtn = document.getElementById("close-login");
    const submitLogin = document.getElementById("submit-login");
    const logoutBtn = document.getElementById("logout-btn");
    const authSection = document.getElementById("auth-section");
    const quizContainer = document.getElementById("quiz-container");
    const userAlias = document.getElementById("user-alias");
    const userProfile = document.getElementById("user-profile");

    closeLoginBtn.addEventListener("click", () => {
        loginModal.classList.remove("show");
    });

    // ✅ Extracted Login Function for Reuse
    async function loginUser(email, password) {
        try {
            const response = await fetch("/api/users/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // ✅ Store token and user info
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify({
                    id: data.id, // ✅ Store user ID
                    alias: data.userAlias // ✅ Store alias instead of full_name
                }));

                updateUI();

            } else {
                alert(data.message || "Login failed.");
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("An error occurred. Please try again.");
        }
    }

    // Update UI based on login status
    window.updateUI = function () {
        const alias = JSON.parse(localStorage.getItem("user"))?.alias
        
        if (alias) {
            quizContainer.classList.remove("hidden");    
            userAlias.textContent = alias;
            userProfile.classList.remove("hidden"); // Show profile
            authSection.classList.add("hidden"); // Hide auth modals
        } else {
            userProfile.classList.add("hidden"); // Hide profile -- still need to put in profile
            authSection.classList.remove("hidden"); // Show auth modals
            quizContainer.classList.add("hidden"); // Hide Quiz
        }
    }

    submitLogin.addEventListener("click", async (event) => {
        event.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        loginUser(email, password);
    });

    // ✅ Make loginUser globally accessible for `register.js`
    window.loginUser = loginUser;
});


document.addEventListener("DOMContentLoaded", () => {
    const loginModal = document.getElementById("login-modal");
    const submitLogin = document.getElementById("submit-login");
    const authSection = document.getElementById("auth-section");
    const quizContainer = document.getElementById("quiz-container");
    const userAlias = document.getElementById("user-alias");
    const userProfile = document.getElementById("user-profile");
    const forgotPasswordBtn = document.getElementById("forgot-password-btn");
    
    forgotPasswordBtn.addEventListener("click", () => {
        forgotPassword();
    });

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
                localStorage.setItem("user", JSON.stringify(data.user));

                updateUI();

            } else {
                alert(data.message || "Login failed.");
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("An error occurred. Please try again.");
        }
    }

    async function forgotPassword() {
        const emailInput = document.getElementById("login-email");
        const resetMessage = document.getElementById("reset-message");
    
        // Validate email
        if (!emailInput.value || !emailInput.value.includes("@")) {
            emailInput.classList.add("error-shake");
            setTimeout(() => emailInput.classList.remove("error-shake"), 500);
            emailInput.style.border = "2px solid red";
            return;
        }
    
        try {
            const response = await fetch("/api/resetPassword", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailInput.value }),
            });
    
            const data = await response.json();
    
            if (response.ok) {
                authSection.classList.add("hidden");
                resetMessage.innerHTML = `<p>✅ A password reset link has been sent to <b>${emailInput.value}</b>. Please check your email.</p>`;
                resetMessage.classList.remove("hidden");
            } else {
                resetMessage.innerHTML = `<p>⚠️ ${data.error || "Something went wrong. Please try again."}</p>`;
                resetMessage.style.display = "block";
            }
        } catch (error) {
            console.error("Error:", error);
            resetMessage.innerHTML = `<p>⚠️ Unable to send reset email. Please try again later.</p>`;
            resetMessage.style.display = "block";
        }
    }


    // Update UI based on login status
    window.updateUI = function () {
        
        const token = localStorage.getItem("token");
        if (token) {
            //Logged in
            quizContainer.classList.remove("hidden");    
            userProfile.classList.remove("hidden");
            authSection.classList.add("hidden");
            loadUserDetails();

            const user = JSON.parse(localStorage.getItem("user"));

            userAlias.textContent = user.alias;
            document.getElementById("user-avatar").src = `images/avatars/${user.avatar}.png`;

        } else {
            //Not logged in
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


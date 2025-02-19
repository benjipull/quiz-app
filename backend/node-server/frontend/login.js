document.addEventListener("DOMContentLoaded", () => {
    const loginModal = document.getElementById("login-modal");
    const loginBtn = document.getElementById("login-btn");
    const closeLoginBtn = document.getElementById("close-login");
    const submitLogin = document.getElementById("submit-login");

    const userProfile = document.getElementById("user-profile");

    const userInitials = document.getElementById("user-initials");
    const userDropdown = document.getElementById("user-dropdown");
    const logoutBtn = document.getElementById("logout-btn");
    const authContainer = document.querySelector(".auth-container");

    const signupModal = document.getElementById("signup-modal");

    if (!loginModal || !loginBtn || !closeLoginBtn || !submitLogin) {
        console.error("Login modal elements not found!");
        return;
    }

    // Show login modal when "Login" button is clicked
    loginBtn.addEventListener("click", () => {
        loginModal.classList.add("show");
    });

    // Hide login modal when "Cancel" button is clicked
    closeLoginBtn.addEventListener("click", () => {
        loginModal.classList.remove("show");
    });

    if (!userInitials || !userDropdown || !logoutBtn) {
        console.error("Dropdown elements not found!");
        return;
    }

    // Show/hide dropdown when clicking on initials
    userInitials.addEventListener("click", () => {
        userDropdown.classList.toggle("hidden"); // Remove 'hidden' class
    });

    // Hide dropdown if clicking outside
    document.addEventListener("click", (event) => {
        if (!userInitials.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.classList.add("hidden");
        }
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
                    email: data.email,
                    full_name: data.full_name
                }));

                // ✅ Update UI for logged-in user
                updateUI();

                // ✅ Close login modal if open
                loginModal.classList.remove("show");
                signupModal.classList.add("hidden");
            } else {
                alert(data.message || "Login failed.");
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("An error occurred. Please try again.");
        }
    }

    submitLogin.addEventListener("click", async (event) => {
        event.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        loginUser(email, password);
    });

    // Function to update UI when user is logged in
    function updateUI() {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user) {
            // Hide login & signup buttons
            authContainer.classList.add("hidden");

            // Show profile section
            userProfile.classList.remove("hidden");

            // Set user initials
            const initials = user.full_name.split(" ").map(name => name[0]).join("").toUpperCase();
            userInitials.textContent = initials;
        }
    }

    // Logout functionality
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Reload the page to reset the UI
        window.location.reload();
    });

    // Check if user is logged in on page load
    updateUI();

    // ✅ Make loginUser globally accessible for `register.js`
    window.loginUser = loginUser;
});

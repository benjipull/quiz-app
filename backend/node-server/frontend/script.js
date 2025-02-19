document.addEventListener("DOMContentLoaded", () => {
    if (typeof initQuiz === "function") initQuiz();
    if (typeof initLogin === "function") initLogin();
    if (typeof initRegister === "function") initRegister();

    const token = localStorage.getItem("token");
    const fullName = localStorage.getItem("full_name");
    const userInitialsElement = document.getElementById("user-initials");
    const userProfile = document.getElementById("user-profile");
    const userDropdown = document.getElementById("user-dropdown");
    const loginBtn = document.getElementById("login-btn");
    const signupBtn = document.getElementById("signup-btn");
    const authContainer = document.querySelector(".auth-container");
    
    if (token && fullName) {
        // Convert full name to initials (e.g., "John Doe" -> "JD")
        const initials = fullName
            .split(" ")
            .map(name => name[0].toUpperCase())
            .join("");

        userInitialsElement.textContent = initials;
        userProfile.classList.remove("hidden");

        loginBtn.classList.add("hidden");
        signupBtn.classList.add("hidden");
    }else {
        userProfile.classList.add("hidden"); // Hide profile
        authContainer.classList.remove("hidden"); // Show login/signup buttons
    }

    // Toggle dropdown on click
    userProfile.addEventListener("click", () => {
        userDropdown.classList.toggle("show");
    });

    // Logout Functionality
    document.getElementById("logout-btn").addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("full_name");

        userProfile.classList.add("hidden");
        loginBtn.classList.remove("hidden");
        signupBtn.classList.remove("hidden");
    });

    // Hide dropdown if clicking outside
    document.addEventListener("click", (event) => {
        if (!userProfile.contains(event.target)) {
            userDropdown.classList.remove("show");
        }
    });
});

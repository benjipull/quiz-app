document.addEventListener("DOMContentLoaded", () => {

    const signupModal = document.getElementById("signup-modal");
    const signupBtn = document.getElementById("signup-btn");
    const closeSignupBtn = document.getElementById("close-signup");
    const submitSignup = document.getElementById("submit-signup");

    // Open Signup Modal
    signupBtn.addEventListener("click", () => {
        signupModal.style.display = "block";
    });

    // Close Signup Modal
    closeSignupBtn.addEventListener("click", () => {
        signupModal.style.display = "none";
    });

    // Handle Signup Submission
    submitSignup.addEventListener("click", async (event) => {
        event.preventDefault();
        
        const fullName = document.getElementById("signup-fullname").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;

        try {
            const response = await fetch("/api/users/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ full_name: fullName, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                loginUser(email, password);
                signupModal.style.display = "none"; // Close modal on success
            } else {
                alert(data.message || "Registration failed.");
            }
        } catch (error) {
            console.error("Signup error:", error);
            alert("An error occurred. Please try again.");
        }
    });
});

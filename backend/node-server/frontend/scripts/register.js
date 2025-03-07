document.getElementById("submit-signup").addEventListener("click", async () => {
    const alias = document.getElementById("signup-alias").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value.trim();
    const age = document.getElementById("signup-age").value.trim();
    const message = document.getElementById("signup-message");

    // Reset message display
    message.classList.add("hidden");
    message.textContent = "";

    if (!alias || !email || !password || !age) {
        message.textContent = "All fields are required.";
        message.classList.remove("hidden");
        message.style.color = "red";
        return;
    }

    try {
        const response = await fetch("/api/users/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alias, email, password, age })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        loginUser(email, password);

    } catch (error) {
        message.textContent = `❌ ${error.message}`;
        message.style.color = "red";
        message.classList.remove("hidden");
    }
});

document.addEventListener("DOMContentLoaded", () => {

    window.loadUserDetails = async function () {
        const token = localStorage.getItem("token");

        const response = await fetch(`/api/getUserDetails`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const userData = await response.json();

        if (userData.error) {
            console.error("Error fetching user details:", userData.error);
            return;
        }
        localStorage.setItem("user", JSON.stringify(userData));
    }

    async function getUserDetails() {
        try {
            loadUserDetails();
            const user = JSON.parse(localStorage.getItem("user"));

            // Populate user details form
            document.getElementById("user-details-alias").value = user.alias;
            document.getElementById("user-details-email").value = user.email;
            document.getElementById("user-details-age").value = user.age;

            await loadAvatars(user.avatar)

            document.getElementById("user-details-container").classList.remove("hidden");
        } catch (error) {
            console.error("Failed to fetch user details:", error);
        }
    }

    async function loadAvatars(userAvatar) {
        const avatarGrid = document.getElementById("avatar-grid");
        avatarGrid.innerHTML = "";
        for (let i = 1; i <= 15; i++) {
            const avatar = document.createElement("img");
            avatar.src = `/images/avatars/${i}.png`;
            avatar.classList.add("avatar-option");
            avatar.setAttribute("avatarId", i);
            // When clicked, update selected avatar
            avatar.addEventListener("click", () => {
                document.querySelectorAll(".avatar-option").forEach(a => a.classList.remove("selected"));
                avatar.classList.add("selected");
            });

            if (userAvatar == i)
                avatar.classList.add("selected");

            // ✅ Append avatar to grid
            avatarGrid.appendChild(avatar);
        }
    }

    async function updateUserDetails(alias, age, avatar) {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch("/api/updateUserDetails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ alias, age, avatar })
            });

            const data = await response.json();
            if (response.ok) {
                console.log("✅ User updated successfully!", data);
            } else {
                console.error("❌ Error updating user:", data.error);
            }
        } catch (error) {
            console.error("❌ Request failed:", error);
        }
    }

    // Close user details and reset quiz
    document.getElementById("user-details-save").addEventListener("click", async () => {

        const aliasInput = document.getElementById("user-details-alias");
        const ageInput = document.getElementById("user-details-age");

        const alias = aliasInput.value.trim();
        const age = parseInt(ageInput.value, 10);
        const selectedAvatar = document.querySelector("#avatar-grid .avatar-option.selected");

        if (!selectedAvatar) {
            alert("Please select an avatar.");
            return;
        }

        const avatar = selectedAvatar.getAttribute("avatarId");

        if (!alias || isNaN(age)) {
            alert("Please enter valid details.");
            return;
        }

        // Call the function to update user details
        await updateUserDetails(alias, age, avatar);

        document.getElementById("user-details-container").classList.add("hidden");
        document.getElementById("user-profile").classList.remove("hidden");

        document.getElementById("avatar-grid").innerHTML = "";

        resetQuiz();
    });

    //Open user details when profile icon is clicked
    document.getElementById("user-profile").addEventListener("click", () => {

        document.getElementById("category-container").classList.add("hidden");
        document.getElementById("user-profile").classList.add("hidden");
        document.getElementById("back-button").classList.remove("hidden");

        getUserDetails();
    });
});
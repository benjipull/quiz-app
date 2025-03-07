document.addEventListener("DOMContentLoaded", async () => {
    const categoryContainer = document.getElementById("category-buttons");
    const createCategoryButton = document.getElementById("create-category-card");
    const createCategoryModal = document.getElementById("create-category-modal");
    const submitCategoryButton = document.getElementById("submit-category");
    const closeCreateCategoryButton = document.getElementById("close-create-category");

    async function fetchCategories() {
        try {
            const response = await fetch("/api/categories");
            if (!response.ok) {
                throw new Error("Failed to fetch categories.");
            }
            const categories = await response.json();

            // ✅ Preserve the "Create Category" button
            categoryContainer.innerHTML = ""; // Clear existing categories
            categoryContainer.appendChild(createCategoryButton); // Re-add the "Create Category" button

            categories.forEach(category => {
                const categoryCard = document.createElement("div");
                categoryCard.classList.add("category-button");
                categoryCard.setAttribute("data-category", category._id);

                // ✅ Generate Star Rating HTML
                function getStarRatingHTML(rating) {
                    const fullStars = Math.floor(rating);
                    const halfStar = rating % 1 !== 0;
                    let starsHTML = "";

                    for (let i = 0; i < fullStars; i++) {
                        starsHTML += `<i class="fas fa-star star-full"></i>`; // Full star
                    }
                    if (halfStar) {
                        starsHTML += `<i class="fas fa-star-half-alt star-half"></i>`; // Half star
                    }
                    for (let i = fullStars + (halfStar ? 1 : 0); i < 5; i++) {
                        starsHTML += `<i class="far fa-star star-empty"></i>`; // Empty star
                    }

                    return starsHTML;
                }

                // ✅ Set inner HTML structure with image, name, createdBy, and rating
                categoryCard.innerHTML = `
                    <div class="category-image">
                        <img src="${category.imageUrl ? category.imageUrl : 'images/default-category.jpg'}" 
                            alt="${category.name}" loading="lazy" />
                    </div>
                    <div class="category-info">
                        <div class="category-name">${category.name}</div>

                        <!-- 👤 Created By -->
                        <div class="category-meta">
                            <i class="fas fa-user"></i> ${category.createdBy}
                        </div>

                        <!-- ⭐ Star Rating + Completion Count -->
                        <div class="category-rating">
                            <span class="rating-value">${category.averageRating ? category.averageRating.toFixed(1) : "0.0"}</span>
                            ${getStarRatingHTML(category.averageRating || 0)}
                            <span class="completion-count">(${category.completionsCount})</span>
                        </div>
                    </div>
                `;

                // ✅ Call startQuiz() when clicking a category card
                categoryCard.addEventListener("click", () => {
                    startQuiz(category._id, category.name);
                });

                categoryContainer.appendChild(categoryCard);
            });
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    }

    window.fetchCategories = fetchCategories; // ✅ Expose fetchCategories globally

    fetchCategories();

    // Open Modal
    createCategoryButton.addEventListener("click", () => {
        createCategoryModal.classList.remove("hidden");
    });

    // Close Modal
    closeCreateCategoryButton.addEventListener("click", () => {
        createCategoryModal.classList.add("hidden");
    });

    // Handle Category Submission
    submitCategoryButton.addEventListener("click", async () => {
        const categoryName = document.getElementById("category-name").value.trim();
        const token = localStorage.getItem("token"); // Retrieve token

        if (!categoryName) {
            alert("Please enter a category name.");
            return;
        }

        if (!token) {
            alert("You need to be logged in to create a category.");
            return;
        }

        try {
            const response = await fetch("/api/categories/createCategory", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` // Include token in headers
                },
                body: JSON.stringify({ name: categoryName })
            });

            const data = await response.json();

            if (response.ok) {
                createCategoryModal.classList.add("hidden");
                fetchCategories(); // Reload categories after successful creation

                // ✅ Show notification when category creation starts
                showNotification("Your category is being created, we will notify you once it's done.");
            } else {
                alert(data.message || "Failed to create category.");
            }
        } catch (error) {
            console.error("Error creating category:", error);
            alert("An error occurred. Please try again.");
        }
    });

    // ✅ Function to Show Notification
    function showNotification(message) {
        const container = document.getElementById("notification-container");

        const notification = document.createElement("div");
        notification.classList.add("notification");
        notification.textContent = message;

        container.appendChild(notification);

        // Remove notification after animation
        setTimeout(() => {
            notification.remove();
        }, 7000); // Matches the CSS animation duration
    }
});

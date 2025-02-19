document.addEventListener("DOMContentLoaded", async () => {
    const createCategoryModal = document.getElementById("create-category-modal");
    const openCreateCategoryBtn = document.getElementById("open-create-category-modal");
    const closeCreateCategoryBtn = document.getElementById("close-create-category");
    const submitCategoryBtn = document.getElementById("submit-category");

    async function fetchCategories() {
        try {
            const response = await fetch("/api/categories");
            if (!response.ok) {
                throw new Error("Failed to fetch categories.");
            }
            const categories = await response.json();
    
            // ✅ Clear previous categories
            const categoryButtonsContainer = document.getElementById("category-buttons");
            categoryButtonsContainer.innerHTML = "";
    
            // ✅ Create category cards dynamically
            categories.forEach(category => {
                const categoryCard = document.createElement("div");
                categoryCard.classList.add("category-card");
                categoryCard.setAttribute("data-category", category._id);
    
                categoryCard.innerHTML = `
                    <div class="category-image">
                        <img src="${category.imageUrl}" alt="${category.name}" loading="lazy" />
                    </div>
                    <div class="category-info">
                        <div class="category-name">${category.name}</div>
                        <div class="category-meta">${category.creatorName}</div>
                        <div class="category-meta">${category.completionsCount} completions</div>
                    </div>
                `;
    
                // ✅ Click to start quiz
                categoryCard.addEventListener("click", () => startQuiz(category._id, category.name));
    
                categoryButtonsContainer.appendChild(categoryCard);
            });
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    }
    

    window.fetchCategories = fetchCategories;
    fetchCategories();

    // Open Modal
    openCreateCategoryBtn.addEventListener("click", () => {
        createCategoryModal.classList.add("show");
    });

    // Close Modal
    closeCreateCategoryBtn.addEventListener("click", () => {
        createCategoryModal.classList.remove("show");
    });

    // Handle Category Submission
    submitCategoryBtn.addEventListener("click", async () => {
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
                createCategoryModal.classList.remove("show");
                fetchCategories(); // Reload categories after successful creation
            } else {
                alert(data.message || "Failed to create category.");
            }
        } catch (error) {
            console.error("Error creating category:", error);
            alert("An error occurred. Please try again.");
        }
    });
});

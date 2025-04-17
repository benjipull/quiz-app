import React, { useState, useEffect } from "react";
import "../styles/AddCategory.css";

export default function AddCategory({ fetchCategories }) {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState({ name: "User", avatar: "default-avatar.png" });

  useEffect(() => {
    // Fetch user details (replace with actual API call)
    const storedAvatar = localStorage.getItem("userAvatar");
    const storedName = localStorage.getItem("userName") || "User";

    setUserProfile({
      name: storedName,
      avatar: storedAvatar && storedAvatar.trim() !== "" ? storedAvatar : "default-avatar.png",
    });
  }, []);

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      showNotification("Please enter a category name.", "error");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showNotification("You need to be logged in to create a category.", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/api/categories/createCategory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: categoryName }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsOpen(false);
        setCategoryName("");
        fetchCategories();
        showNotification("Your category is being created. We will notify you once it's done.", "success");
      } else {
        showNotification(data.message || "Failed to create category.", "error");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      showNotification("An error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 7000);
  };

  return (
    <div className="category-container">
      {/* Left Side: Create Category Button */}
      <div className="left-side">
        <div className="create-category-card" onClick={() => setIsOpen(true)}>
          <span>+ Create a new Category</span>
        </div>
      </div>

      {/* Right Side: User Profile */}
      <div className="right-side">
        <img
          src={userProfile.avatar || "default-avatar.png"}
          alt="User Avatar"
          className="user-avatar"
        />
      </div>

      {/* Create Category Modal */}
      {isOpen && (
        <div className="modal" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Category</h2>
            <input
              type="text"
              placeholder="Enter category name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={handleCreateCategory} disabled={loading || !categoryName.trim()}>
                {loading ? "Submitting..." : "Submit"}
              </button>
              <button onClick={() => setIsOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Container */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}

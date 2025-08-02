import { useState, useEffect } from "react";
import { Plus, X, User } from "lucide-react";

export default function AddCategory({ fetchCategories = () => {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState({ name: "User", avatar: "" });
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const storedName = localStorage.getItem("userAlias") || "User";
    const storedAvatar = localStorage.getItem("userAvatar") || "";

    setUserProfile({
      name: storedName,
      avatar: storedAvatar,
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

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 7000);
  };

  return (
    <div className="flex items-center justify-between w-full max-w-6xl mx-auto p-4">
      {/* Left: Create Category Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
      >
        <Plus className="w-4 h-4" />
        <span>Create New Category</span>
      </button>

      {/* Right: Avatar */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
          {userProfile.avatar ? (
            <img
              src={userProfile.avatar}
              alt="User Avatar"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-white" />
          )}
        </div>
        <span className="text-sm font-medium text-white">{userProfile.alias}</span>
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create New Category</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter category name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCreateCategory()}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex space-x-3">
                <button
                  onClick={handleCreateCategory}
                  disabled={loading || !categoryName.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
            notification.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}

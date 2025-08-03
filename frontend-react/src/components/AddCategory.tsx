import React, { useState, useEffect } from "react";
import { Plus, X, User } from "lucide-react";

// Define the shape of the props this component expects.
// `fetchCategories` is an optional function that takes no arguments and returns nothing.
interface AddCategoryProps {
  fetchCategories?: () => void;
}

// Define the shape of the user profile state object.
interface UserProfile {
  name: string;
  avatar: string;
}

// Define the shape of the notification state object.
interface Notification {
  message: string;
  type: "success" | "error";
}

// Use React.FC (Function Component) with the props interface to type the component.
const AddCategory: React.FC<AddCategoryProps> = ({ fetchCategories = () => {} }) => {
  // Use generic types with useState for more specific state management.
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "User", avatar: "" });
  const [notification, setNotification] = useState<Notification | null>(null);

  // useEffect to load user profile data from local storage on component mount.
  useEffect(() => {
    const storedName = localStorage.getItem("userAlias") || "User";
    const storedAvatar = localStorage.getItem("userAvatar") || "";

    setUserProfile({
      name: storedName,
      avatar: storedAvatar,
    });
  }, []);

  /**
   * Handles the creation of a new category by making an API call.
   * @returns {Promise<void>}
   */
  const handleCreateCategory = async (): Promise<void> => {
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
      const response = await fetch("https://quiz-app-node-606998948537.europe-west4.run.app/api/categories/createCategory", {
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

  /**
   * Displays a temporary notification message.
   * @param {string} message - The message to display.
   * @param {"success" | "error"} type - The type of notification (for styling).
   */
  const showNotification = (message: string, type: "success" | "error"): void => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 7000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Replaced Create Category Button and Avatar with a single card */}
      {/* The card now takes full width within its container */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Create Your Own</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Build a custom quiz category</p>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Category</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter category name"
                value={categoryName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategoryName(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleCreateCategory()}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex space-x-3">
                <button
                  onClick={handleCreateCategory}
                  disabled={loading || !categoryName.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors"
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

export default AddCategory;

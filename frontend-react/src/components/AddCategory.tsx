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
  <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 flex items-center justify-between shadow-md">
    <div>
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
        Be part of the game
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Create your own quiz and share it with others!
      </p>
    </div>
    <button
      onClick={() => setIsOpen(true)}
      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 
                 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 
                 rounded-lg font-medium transition-all duration-300"
    >
      <Plus className="h-4 w-4" />
      <span>Create</span>
    </button>
  </div>
</div>

  );
}

export default AddCategory;

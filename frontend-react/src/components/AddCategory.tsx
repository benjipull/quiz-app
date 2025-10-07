import React, { useState } from "react";
import { Plus, X } from "lucide-react";

interface AddCategoryProps {
  fetchCategories?: () => void;
}

interface Notification {
  message: string;
  type: "success" | "error";
}

const AddCategory: React.FC<AddCategoryProps> = ({ fetchCategories = () => {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 7000);
  };

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
      const response = await fetch(
        "https://quiz-app-node-606998948537.europe-west4.run.app/api/categories/createCategory",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: categoryName }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setIsOpen(false);
        setCategoryName("");
        fetchCategories();
        showNotification("Your category is being created. We’ll notify you once it’s done.", "success");
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

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Main Card */}
      <div className="p-5 rounded-xl bg-card text-card-foreground border border-border shadow-card flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-foreground">Create Your Own</h4>
          <p className="text-sm text-muted-foreground">
            Build a custom quiz category and share it with others!
          </p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-primary-foreground shadow-button
                     bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))]
                     hover:opacity-90 transition-smooth"
        >
          <Plus className="h-4 w-4" />
          <span>Create</span>
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-card text-card-foreground rounded-xl p-6 w-full max-w-md shadow-quiz border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Create New Category</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
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
                onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
                className="w-full px-4 py-3 rounded-lg bg-input text-foreground border border-border 
                           placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />

              <div className="flex space-x-3">
                <button
                  onClick={handleCreateCategory}
                  disabled={loading || !categoryName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-primary-foreground
                             bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))]
                             hover:opacity-90 disabled:opacity-50 transition-smooth"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg font-medium bg-muted text-foreground hover:opacity-90 transition-smooth"
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
              ? "bg-[hsl(var(--success))]"
              : "bg-[hsl(var(--destructive))]"
          } text-[hsl(var(--foreground))]`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default AddCategory;

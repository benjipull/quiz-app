// AddCategory.tsx

"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button"; // ✅ Use themed button

interface AddCategoryProps {
  fetchCategories?: () => void;
  isGuest: boolean;
  onRegistrationRequired: () => void;
}

interface Notification {
  message: string;
  type: "success" | "error";
}

const AddCategory: React.FC<AddCategoryProps> = ({
  fetchCategories = () => {},
  isGuest,
  onRegistrationRequired,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateCategory = async () => {
    const token = localStorage.getItem("token");

    // 🎯 FIX 1: Rely on the token being present for authorization.
    // If no token exists, prompt registration and exit, preventing the 403.
    if (!token) { 
      setIsOpen(false);
      showNotification("You need to be logged in to create a category.", "error");
      onRegistrationRequired();
      return;
    }
    
    // 🚫 The original 'if (isGuest)' check is removed here 
    // because the token check is the true source of authority.

    if (!categoryName.trim()) {
      showNotification("Please enter a category name.", "error");
      return;
    }

    setLoading(true);
    try {
      // The token used here is now the refreshed one from Profile.tsx
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
        showNotification(
          "Your category is being created. We’ll notify you once it’s done.",
          "success"
        );
      } else {
        // If 403 Forbidden still occurs here, it means the token is bad, 
        // and we show the error from the server.
        showNotification(data.message || "Failed to create category.", "error");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      showNotification("An error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleMainButtonClick = () => {
    const token = localStorage.getItem("token");

    // 🎯 FIX 2: Check for token before opening modal.
    if (!token) {
      onRegistrationRequired();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Main Card */}
      <div
        className="p-6 rounded-2xl border border-border/40 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-black/70 
        backdrop-blur-md shadow-[0_0_25px_-5px_rgba(0,150,255,0.4)] flex items-center justify-between"
      >
        <div>
          <h4 className="font-semibold text-lg text-white">Create Your Own</h4>
          <p className="text-sm text-white/70">
            Build a custom quiz and share it with others!
          </p>
        </div>

        {/* ✅ Themed Create Button */}
        <Button
          onClick={handleMainButtonClick}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white shadow-lg"
        >
          <Plus className="h-4 w-4" />
          <span>Create</span>
        </Button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative bg-gradient-to-br from-zinc-900/95 via-zinc-800/90 to-black/90 border border-border/40 
            rounded-2xl p-6 w-full max-w-md shadow-[0_0_30px_-5px_rgba(0,150,255,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ✅ Themed close button */}
            <Button
              onClick={() => setIsOpen(false)}
              variant="destructive"
              size="icon"
              className="absolute top-4 right-4 rounded-full p-2 shadow-md"
            >
              <X className="w-4 h-4" />
            </Button>

            <h2 className="text-xl font-bold text-white mb-6">Create New Quiz</h2>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter quiz name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
                className="w-full px-4 py-3 rounded-lg bg-zinc-800/80 text-white border border-zinc-700 
                placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              />

              <div className="flex space-x-3">
                {/* ✅ Themed Create button */}
                <Button
                  onClick={handleCreateCategory}
                  disabled={loading || !categoryName.trim()}
                  className="flex-1"
                >
                  {loading ? "Creating..." : "Create"}
                </Button>

                {/* ✅ Themed Cancel button */}
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                  className="flex-1 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-500 ${
            notification.type === "success"
              ? "bg-green-600/90 shadow-green-500/40"
              : "bg-red-600/90 shadow-red-500/40"
          } text-white backdrop-blur-md`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default AddCategory;
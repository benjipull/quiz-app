"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddCategoryProps {
  fetchCategories?: () => void;
  isGuest: boolean;
  onRegistrationRequired: () => void;
  isEmbeddedInEmptyState?: boolean;
}

interface Notification {
  message: string;
  type: "success" | "error";
}

const AddCategory: React.FC<AddCategoryProps> = ({
  fetchCategories = () => {},
  isGuest,
  onRegistrationRequired,
  isEmbeddedInEmptyState = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const BASE_URL = import.meta.env.VITE_BASE_URL;

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateCategory = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsOpen(false);
      showNotification("You need to be logged in to create a category.", "error");
      onRegistrationRequired();
      return;
    }

    if (!categoryName.trim()) {
      showNotification("Please enter a category name.", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/categories/createCategory`, {
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
        showNotification(
          "Your category is being created. We'll notify you once it's done.",
          "success"
        );
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

  const handleMainButtonClick = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      onRegistrationRequired();
    } else {
      setIsOpen(true);
    }
  };

  // Conditional Rendering for Empty State
  if (isEmbeddedInEmptyState) {
    return (
      <>
        <Button
          onClick={handleMainButtonClick}
          size="sm"
        >
          <Plus className="h-5 w-5" />
          <span>Create Your First Quiz</span>
        </Button>
        
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
              <Button
                onClick={() => setIsOpen(false)}
                variant="destructive"
                size="icon"
                className="absolute top-4 right-4 !h-10 !w-10"
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
                  <Button
                    onClick={handleCreateCategory}
                    disabled={loading || !categoryName.trim()}
                    size="sm"
                    className="flex-1"
                  >
                    {loading ? "Creating..." : "Create"}
                  </Button>

                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
      </>
    );
  }

  // Default Rendering - Simple button on background
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">
          Create your own quiz
        </p>

        <Button
          onClick={handleMainButtonClick}
          size="sm"
        >
          <Plus className="h-4 w-4" />
          <span>Create Quiz</span>
        </Button>
      </div>

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
            <Button
              onClick={() => setIsOpen(false)}
              variant="destructive"
              size="icon"
              className="absolute top-4 right-4 !h-10 !w-10"
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
                <Button
                  onClick={handleCreateCategory}
                  disabled={loading || !categoryName.trim()}
                  size="sm"
                  className="flex-1"
                >
                  {loading ? "Creating..." : "Create"}
                </Button>

                <Button
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
// InterestSelector.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface Interest {
  _id: string;
  name: string;
}

interface InterestSelectorProps {
  // We use `currentSelectedIds` instead of `initialSelectedIds`
  currentSelectedIds: string[];
  // Handler to update the selected IDs in the parent component's temporary state
  onSelectionChange: (selectedIds: string[]) => void;
}

const InterestSelector: React.FC<InterestSelectorProps> = ({
  currentSelectedIds,
  onSelectionChange,
}) => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // --- Data Fetching ---
  useEffect(() => {
    const fetchInterests = async () => {
      // (Same API call to get all available interests)
      try {
        const res = await fetch(`${BASE_URL}/api/interests`);
        if (!res.ok) throw new Error("Failed to fetch interests");
        const data = await res.json();
        setInterests(data);
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to load interests.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchInterests();
  }, [toast]);

  // --- Toggling Logic ---
  const toggleInterest = (id: string) => {
    // Determine if the ID is currently selected
    const isCurrentlySelected = currentSelectedIds.includes(id);

    // Calculate the new set of selected IDs
    const newSelectedIds = isCurrentlySelected
      ? currentSelectedIds.filter((i) => i !== id) // Remove if already selected
      : [...currentSelectedIds, id]; // Add if not selected

    // Notify the parent component of the change
    onSelectionChange(newSelectedIds);
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-400">
        Loading interests...
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      {/* Grid - 3 columns on all screens */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-full">
        {interests.map((interest) => {
          const isSelected = currentSelectedIds.includes(interest._id);
          return (
            <button
              key={interest._id}
              onClick={() => toggleInterest(interest._id)}
              // (Tailwind classes remain the same for styling)
              className={`
                px-1.5 py-2.5
                flex items-center justify-center text-center text-xs font-medium leading-tight
                rounded-xl border-2 transition-all duration-200
                ${
                  isSelected
                    ? "bg-gradient-to-b from-purple-500 to-fuchsia-600 text-white border-purple-300/60 shadow-[0_4px_20px_rgba(168,85,247,0.4)]"
                    : "bg-transparent text-purple-100 border-purple-500/40 hover:border-purple-400 hover:bg-purple-800/20"
                }
              `}
            >
              <span className="line-clamp-3 px-1">
                {interest.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Compact Count */}
      <p className="text-xs text-gray-400 mt-3">
        {currentSelectedIds.length} selected
      </p>
    </div>
  );
};

export default InterestSelector;
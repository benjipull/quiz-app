"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface Interest {
  _id: string;
  name: string;
}

interface InterestSelectorProps {
  userId: string;
  initialSelectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

const InterestSelector: React.FC<InterestSelectorProps> = ({
  userId,
  initialSelectedIds = [],
  onSelectionChange,
}) => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(initialSelectedIds);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInterests = async () => {
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

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (onSelectionChange) onSelectionChange(selectedInterests);
  }, [selectedInterests, onSelectionChange]);

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
          const isSelected = selectedInterests.includes(interest._id);
          return (
            <button
              key={interest._id}
              onClick={() => toggleInterest(interest._id)}
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
        {selectedInterests.length} selected
      </p>
    </div>
  );
};

export default InterestSelector;
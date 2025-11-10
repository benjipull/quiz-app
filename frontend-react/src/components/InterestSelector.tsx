"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
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
      <div className="p-4 text-center text-gray-400 bg-gradient-to-b from-[#1a022b] to-[#12001c] min-h-screen">
        Loading interests...
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-[#1a022b] to-[#12001c] text-white p-6 font-inter">
      {/* Grid */}
      <div
        className="
          grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-3xl 
          p-4 rounded-2xl bg-[#1b002a]/60 backdrop-blur-md 
          shadow-[0_0_40px_rgba(168,85,247,0.25)]
        "
      >
        {interests.map((interest) => {
          const isSelected = selectedInterests.includes(interest._id);
          return (
            <button
              key={interest._id}
              onClick={() => toggleInterest(interest._id)}
              className={`
                px-2 py-3 h-[60px] sm:h-[65px]
                flex items-center justify-center text-center text-sm font-medium
                rounded-xl border transition-all duration-300
                ${
                  isSelected
                    ? "bg-gradient-to-b from-purple-600 to-fuchsia-600 text-white border-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.6)] scale-[1.02]"
                    : "bg-transparent text-purple-200 border border-purple-600/30 hover:border-purple-400 hover:text-white hover:bg-purple-700/20"
                }
              `}
            >
              {interest.name}
            </button>
          );
        })}
      </div>

      {/* Count */}
      <p className="text-sm text-gray-400 mt-6">
        {selectedInterests.length} selected
      </p>
    </div>
  );
};

export default InterestSelector;

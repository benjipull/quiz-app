import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Coins } from "lucide-react";
import { getApiBaseUrl } from "@/utils/baseUrl";

const BASE_URL = getApiBaseUrl();
const POWERUP_PRICE = 250;

interface ShopProps {
  onClose: () => void;
  userCoins: number;
  userInventory?: Array<{ itemType: string; quantity: number }>;
  onPurchaseComplete: () => void;
}

const POWERUP_CONFIG = {
  ASK_THE_AUDIENCE: {
    icon: '👥',
    label: 'Ask Audience',
    description: 'Show what percentage of other players picked each answer'
  },
  SWAP_QUESTION: {
    icon: '🔄',
    label: 'Swap Question',
    description: 'Swap the current question with another eligible one'
  },
  DIFFICULTY_SWAP: {
    icon: '⬇️',
    label: 'Easier Question',
    description: 'Swap with a -1 difficulty question'
  },
  FIFTY_FIFTY: {
    icon: '✂️',
    label: '50/50',
    description: 'Remove two wrong answers'
  }
};

export default function Shop({ onClose, userCoins, userInventory = [], onPurchaseComplete }: ShopProps) {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getInventoryQuantity = (itemType: string) => {
    const item = userInventory.find(i => i.itemType === itemType);
    return item ? item.quantity : 0;
  };

  const handlePurchase = async (powerUpType: string) => {
    if (userCoins < POWERUP_PRICE) {
      setError(`Not enough coins! You need ${POWERUP_PRICE - userCoins} more coins.`);
      return;
    }

    setPurchasing(powerUpType);
    setError(null);

    try {
      const userToken = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/purchasePowerUp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          powerUpType,
          quantity: 1
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to purchase power-up");
        setPurchasing(null);
        return;
      }

      // Success - notify parent to refresh user data
      onPurchaseComplete();
      setPurchasing(null);

    } catch (err) {
      console.error("Error purchasing power-up:", err);
      setError("Failed to purchase power-up. Please try again.");
      setPurchasing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl my-auto">
        {/* Close button - positioned absolutely outside the card for better visibility */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute -top-2 -right-2 sm:top-0 sm:right-0 z-10 bg-red-600 hover:bg-red-700 rounded-full h-10 w-10 shadow-lg border-2 border-white/20"
          aria-label="Close shop"
        >
          <X className="h-6 w-6 text-white" />
        </Button>

        <Card className="w-full max-h-[90vh] overflow-y-auto bg-gradient-to-br from-purple-900/98 to-indigo-900/98 border-2 border-purple-500/50 shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">🛒 Power-Up Shop</h2>
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-400" />
                <span className="text-base sm:text-lg font-semibold text-yellow-400">{userCoins} coins</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {Object.entries(POWERUP_CONFIG).map(([itemType, config]) => {
                const currentQuantity = getInventoryQuantity(itemType);
                const canAfford = userCoins >= POWERUP_PRICE;
                const isPurchasing = purchasing === itemType;

                return (
                  <Card
                    key={itemType}
                    className="p-3 sm:p-4 bg-purple-800/40 border-2 border-purple-500/30 hover:border-purple-400/60 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl sm:text-3xl">{config.icon}</span>
                        <div>
                          <h3 className="font-bold text-white text-xs sm:text-sm">{config.label}</h3>
                          <Badge variant="outline" className="text-[10px] sm:text-xs bg-purple-700/50 text-purple-200 border-purple-500/50">
                            Owned: {currentQuantity}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] sm:text-xs text-purple-200 mb-3 sm:mb-4 min-h-[28px] sm:min-h-[32px]">{config.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                        <Coins className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{POWERUP_PRICE}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handlePurchase(itemType)}
                        disabled={!canAfford || isPurchasing}
                        className={`text-xs sm:text-sm px-3 py-1 ${
                          canAfford
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {isPurchasing ? "Buying..." : "Buy"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-purple-500/30">
              <p className="text-xs sm:text-sm text-purple-300 text-center">
                💡 Tip: Use power-ups during quizzes to help you answer difficult questions!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

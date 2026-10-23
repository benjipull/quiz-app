import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InventoryItem {
  itemType: string;
  quantity: number;
}

interface InventoryBarProps {
  inventory?: InventoryItem[];
  onPowerUpClick?: (powerUpType: string) => void;
  disabled?: boolean;
}

const INVENTORY_CONFIG = {
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

export default function InventoryBar({ inventory = [], onPowerUpClick, disabled = false }: InventoryBarProps) {
  // Create a map of inventory quantities for easy lookup
  const inventoryMap = new Map<string, number>();
  inventory.forEach(item => {
    inventoryMap.set(item.itemType, item.quantity);
  });

  // Get quantity for an item type, defaulting to 0
  const getQuantity = (itemType: string) => inventoryMap.get(itemType) || 0;

  const handleClick = (itemType: string, quantity: number) => {
    if (disabled || quantity <= 0) return;
    onPowerUpClick?.(itemType);
  };

  return (
    <Card className="p-2 bg-purple-900/40 backdrop-blur-sm border-2 border-purple-500/30">
      <div className="flex gap-1 sm:gap-2 justify-center items-center">
        {Object.entries(INVENTORY_CONFIG).map(([itemType, config]) => {
          const quantity = getQuantity(itemType);
          const isAvailable = quantity > 0 && !disabled;

          return (
            <Badge
              key={itemType}
              variant="outline"
              onClick={() => handleClick(itemType, quantity)}
              className={`relative px-2 py-1.5 sm:px-3 sm:py-2 border-purple-400/50 text-white transition-all group flex-shrink-0 ${
                isAvailable
                  ? 'bg-purple-800/50 hover:bg-purple-700/60 cursor-pointer hover:scale-105'
                  : 'bg-purple-900/30 opacity-60 cursor-not-allowed'
              }`}
              title={config.description}
            >
              <span className="text-base sm:text-lg mr-0.5 sm:mr-1">{config.icon}</span>
              <span className="text-[10px] sm:text-xs font-semibold mr-0.5 sm:mr-1 hidden xs:inline">{config.label}</span>
              <span className={`absolute -top-1 -right-1 text-[10px] sm:text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center border-2 ${
                isAvailable
                  ? 'bg-yellow-500 text-black border-purple-900'
                  : 'bg-gray-600 text-gray-300 border-purple-900'
              }`}>
                {quantity}
              </span>
            </Badge>
          );
        })}
      </div>
    </Card>
  );
}

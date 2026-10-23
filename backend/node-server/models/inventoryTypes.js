/**
 * Inventory Item Types
 * Defines the types of power-ups/items players can have in their inventory
 */

const InventoryItemTypes = {
  ASK_THE_AUDIENCE: 'ASK_THE_AUDIENCE',
  SWAP_QUESTION: 'SWAP_QUESTION',
  DIFFICULTY_SWAP: 'DIFFICULTY_SWAP',
  FIFTY_FIFTY: 'FIFTY_FIFTY'
};

const InventoryItemDescriptions = {
  [InventoryItemTypes.ASK_THE_AUDIENCE]: 'Show what percentage of other players picked each answer',
  [InventoryItemTypes.SWAP_QUESTION]: 'Swap the current question with another one that the player is eligible to play',
  [InventoryItemTypes.DIFFICULTY_SWAP]: 'Swaps the question with another one with -1 difficulty',
  [InventoryItemTypes.FIFTY_FIFTY]: 'Remove two wrong answers'
};

const InventoryItemIcons = {
  [InventoryItemTypes.ASK_THE_AUDIENCE]: '👥',
  [InventoryItemTypes.SWAP_QUESTION]: '🔄',
  [InventoryItemTypes.DIFFICULTY_SWAP]: '⬇️',
  [InventoryItemTypes.FIFTY_FIFTY]: '✂️'
};

module.exports = {
  InventoryItemTypes,
  InventoryItemDescriptions,
  InventoryItemIcons
};

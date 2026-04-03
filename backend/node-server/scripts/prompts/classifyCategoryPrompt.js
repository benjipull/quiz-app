const FIXED_CATEGORY_GROUPS = [
  "Geography",
  "History",
  "Science",
  "Movies",
  "Music",
  "Sports",
  "Art & Literature",
  "Technology",
  "Politics",
  "Nature & Environment",
  "Culture & Traditions",
  "Mythology",
  "Food & Drink",
  "Business & Economics",
  "Language & Linguistics",
  "Space & Astronomy",
  "Health & Medicine",
  "Philosophy",
  "General Knowledge",
  "Education & Learning",
];

function buildClassifyCategoryPrompt(categoryName, groups = FIXED_CATEGORY_GROUPS) {
  return `
You are a Quiz Category Classifier.
Assign the category "${categoryName}" to:

1. "groups": Pick 1-3 items from this fixed list only:
${groups.join(", ")}

2. "tags": Generate 3-6 short keywords that describe the category in more detail.
Tags should be lowercase, concise, and descriptive.

Return STRICT JSON with this format:
{
  "groups": ["..."],
  "tags": ["..."]
}
  `.trim();
}

module.exports = {
  FIXED_CATEGORY_GROUPS,
  buildClassifyCategoryPrompt,
};

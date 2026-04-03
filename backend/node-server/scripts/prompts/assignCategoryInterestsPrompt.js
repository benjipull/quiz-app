function buildAssignCategoryInterestsPrompt({
  interestNames = [],
  categoryName = "",
  categoryDescription = "",
}) {
  return `
You are an AI assistant that assigns user interests to quiz categories.

Here is the list of ALL interests available:

${interestNames.join(", ")}

Given this category, choose the MOST RELEVANT 1-3 interests.

Category Name: ${categoryName}
Description: ${categoryDescription || "No description"}

Respond ONLY in strict JSON:
{
  "interests": ["Interest1", "Interest2"]
}
  `.trim();
}

module.exports = {
  buildAssignCategoryInterestsPrompt,
};

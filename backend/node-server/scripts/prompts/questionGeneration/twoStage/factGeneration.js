function buildFactGenerationPrompt(categoryName, avoidSection = "") {
  return `
Generate a fact about "${categoryName}".

IMPORTANT: You MUST respond with valid JSON in this exact format:
{"fact": "your fact text", "fact_type": "characteristic"}

The fact_type MUST be one of: characteristic, sequence, identity, comparison

Examples of valid responses:
{"fact": "Mars is the 4th planet from the Sun", "fact_type": "sequence"}
{"fact": "Jupiter has the most moons of any planet with 95 confirmed as of 2025", "fact_type": "comparison"}
{"fact": "Venus rotates in the opposite direction to most planets", "fact_type": "characteristic"}

Requirements for the fact:
- Must be about "${categoryName}" ONLY
- Must be 100% accurate and verifiable
- Include specific context (numbers, dates, measurements)
- For sequences: state the ordering principle
- For comparisons: include the metric and date
- Use current 2025 information

${avoidSection}

Now generate your fact as JSON:`.trim();
}

module.exports = buildFactGenerationPrompt;

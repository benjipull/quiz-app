// prompts/duplicatePrompt.js
function buildDuplicatePrompt(q1, q2) {
  return `
You are a strict trivia duplicate detector.

Your task is to determine whether **both questions are asking for the same factual answer** — not merely related to the same topic or entity.

Rules:
- Return true ONLY if answering one gives the same factual answer as the other.
- If they ask about different properties (e.g. population vs. capital vs. area), return false.
- Ignore superficial overlap such as sharing a subject (e.g. both mention "Malta") unless the core fact sought is identical.
- If in doubt, return false.

Respond STRICT JSON only:
{ "duplicate": true|false }

Question 1: ${q1}
Question 2: ${q2}
  `.trim();
}

module.exports = { buildDuplicatePrompt };

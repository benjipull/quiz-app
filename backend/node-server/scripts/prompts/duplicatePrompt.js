function buildDuplicatePrompt(q1, q2) {
  return `
You are checking if two trivia questions are factual duplicates.

Rules:
- Duplicate = both questions ask for the same fact and have the same correct answer meaning.
- Same topic is not enough.
- If unsure, return duplicate=false.
- Reply with JSON only.

Q1: ${q1.text}
A1: ${q1.correct_answer}

Q2: ${q2.text}
A2: ${q2.correct_answer}

Return exactly:
{"duplicate": true|false, "reason": "<short reason, max 20 words>"}
`.trim();
}

module.exports = { buildDuplicatePrompt };

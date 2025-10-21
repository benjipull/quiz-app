function buildDuplicatePrompt(q1, q2) {
  return `
You decide if two trivia questions are exact duplicates.

Definition of duplicate:
- They ask for the SAME factual answer, not just a related topic.
- Different aspects of the same topic (e.g., album title vs. band member) are NOT duplicates.
- Only return true if a person would learn the same fact by answering both.

Respond ONLY with valid JSON:
{"duplicate": true|false, "reason": "<10-20 word reason>"}

Q1: ${q1.text}
A1: ${q1.correct_answer}

Q2: ${q2.text}
A2: ${q2.correct_answer}
`.trim();
}

module.exports = { buildDuplicatePrompt };

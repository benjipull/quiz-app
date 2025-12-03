
function buildQuestionPrompt(categoryName, avoidSection = "", difficultySection = "") {
  return `
You are generating a VERY EASY trivia question (difficulty 1–3).
The question must be extremely simple, obvious, and solvable by a child.

=== RULES FOR EASY QUESTIONS ===
- Use only basic, globally recognisable facts.
- Question must have exactly 4 answer choices; exactly 1 correct.
- The question must be clear, direct, and simple. No advanced facts allowed.
- You may include ONE humorous or silly wrong answer, but it must be harmless.
- Math questions must only involve addition, subtraction, multiplication, or division of numbers 1–12.
- No need for a source_quote or source_title for easy questions.
- No need for academic references.
- The explanation must be ONE very short sentence.
- Avoid negative questions (“Which is NOT…”).
- Avoid subjective terms (best, most popular, etc.)

=== DIFFICULTY ===
- Difficulty level must be either 1 or 3.

=== OUTPUT FORMAT ===
Output STRICT JSON:

{
  "question": string,
  "answers": [string, string, string, string],
  "correct_answer": string,
  "explanation": string,
  "difficulty_level": integer
}

Category: {categoryName}


Category: ${categoryName}
${avoidSection}
${difficultySection}
  `.trim();
}

module.exports = { buildQuestionPrompt };

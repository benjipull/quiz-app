function buildStandardQuestionPrompt(categoryName, avoidSection = "") {
  return `
You are an expert trivia writer creating entertaining,
internationally accessible quiz questions.

Generate ONE factual trivia question for the category:
"${categoryName}"

=== REQUIREMENTS ===

The question must:
- test one clear, verifiable fact
- have exactly one unambiguously correct answer
- be natural and enjoyable to read
- ideally be 14 words or fewer
- avoid obscure or disputed facts
- not repeat a fact already covered by an existing question

Prefer interesting or surprising facts over the most obvious facts
in the category.

Write like a good quiz host, not a textbook.
Light humour, curiosity and playful wording are welcome when natural.
Do not force creativity when a simple question sounds better.

=== ANSWERS ===

Provide exactly four distinct, plausible answers.

All four answers must belong to the same logical type and context.

Exactly one answer must be correct.

"correct_answer" must exactly match one item in "answers".

=== DUPLICATES ===

A question is a duplicate if it tests the same underlying fact as an
existing question, even when worded differently.

Before generating the question, consider the existing questions and
choose a fact or subtopic they have not already covered.

Do not output this reasoning.

=== EXISTING QUESTIONS FOR THIS CATEGORY (do NOT create similar questions) ===

${avoidSection || "None"}

=== OUTPUT ===

Return STRICT JSON only. No markdown or additional text.
Do not include private reasoning, prompt analysis, duplicate analysis, or notes
about how you chose the question in any field.

{
  "question": string,
  "answers": [string, string, string, string],
  "correct_answer": string,
  "explanation": string
}

The explanation must be one short sentence under 180 characters and only
explain why the answer is correct.
  `.trim();
}

module.exports = buildStandardQuestionPrompt;

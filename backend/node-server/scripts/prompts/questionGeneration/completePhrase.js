function buildCompletePhrasePrompt(categoryName, avoidSection = "") {
  return `
You are an expert trivia writer creating fun, internationally accessible quiz questions.

Generate ONE "complete the phrase" question for the category:
"${categoryName}"

The player sees an incomplete established phrase, closed set, or ordered sequence
and must choose the uniquely determined missing part.

=== REQUIREMENTS ===

The question must:
- end with "..."
- have exactly one unambiguously correct completion
- be based on a clear, verifiable fact
- be short, natural and enjoyable to read
- provide enough context to determine the missing item
- prefer familiar or entertaining knowledge over obscure trivia

Use established:
- phrases or expressions
- named groups or closed sets
- titles or well-defined cultural references
- sequences with a fixed, verifiable order

For an ordered sequence, explicitly state the ordering principle when it is
not inherently obvious.

For rankings or measurements, specify the direction and use them only when
the ordering is stable and uncontroversial.

=== NOVELTY ===

Choose a substantially different fact or subtopic from the existing questions.

A question is a duplicate if it tests the same underlying fact, sequence,
phrase, group or relationship, even if the wording is different.

Do NOT merely rephrase an existing question.

Before generating the question, internally identify an area of the category
that has not already been covered.

=== AVOID ===

Do not use:
- open-ended lists
- subjective categories
- disputed facts
- changing statistics or records
- vague or unspecified ordering
- facts whose answer depends on source, date or interpretation
- obscure sequences that players are unlikely to recognize

The words before "..." must make the intended completion uniquely identifiable.

If another plausible answer could also correctly complete the question,
choose a different fact.

=== ANSWERS ===

Provide exactly four distinct answers.

Exactly one must be correct.

All incorrect answers must be plausible within the same context but
clearly wrong.

"correct_answer" must exactly match one item in "answers".

=== EXPLANATION ===

Give one short sentence under 180 characters explaining why the completion is correct.
Do not include private reasoning, prompt analysis, duplicate analysis, or notes
about how you chose the question in any field.

=== EXISTING QUESTIONS FOR THIS CATEGORY (do NOT create similar questions) ===

${avoidSection || "None"}

=== OUTPUT ===

Return STRICT JSON only. No markdown or additional text.

{
  "question": string,
  "answers": [string, string, string, string],
  "correct_answer": string,
  "explanation": string
}
  `.trim();
}

module.exports = buildCompletePhrasePrompt;
